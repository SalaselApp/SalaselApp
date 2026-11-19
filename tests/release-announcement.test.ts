import assert from 'node:assert/strict'
import test from 'node:test'
import { ANNOUNCED_RELEASE, createReleaseTracker } from '../app/releases/announcement.ts'

function storage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
test('unseen release is marked only after a dialog actually opens', () => {
  const local = storage()
  const tracker = createReleaseTracker(() => local)
  assert.equal(
    tracker.showOnce(ANNOUNCED_RELEASE, () => false),
    false,
  )
  assert.equal(local.values.size, 0)
  assert.equal(
    tracker.showOnce(ANNOUNCED_RELEASE, () => true),
    true,
  )
  assert.equal(local.values.size, 1)
  assert.equal(
    tracker.showOnce(ANNOUNCED_RELEASE, () => {
      throw new Error('must not reopen')
    }),
    false,
  )
})
test('the same release stays seen across locale, navigation and reload tracker instances', () => {
  const local = storage()
  const ar = createReleaseTracker(() => local)
  assert.equal(
    ar.showOnce(ANNOUNCED_RELEASE, () => true),
    true,
  )
  const en = createReleaseTracker(() => local)
  assert.equal(
    en.showOnce(ANNOUNCED_RELEASE, () => true),
    false,
  )
  assert.equal(
    createReleaseTracker(() => local).showOnce(ANNOUNCED_RELEASE, () => true),
    false,
  )
  assert.equal(
    en.showOnce('future-announcement', () => true),
    true,
  )
})
test('storage getter, read and write failures use in-memory seen state without crashing', () => {
  for (const provider of [
    () => {
      throw new Error('blocked getter')
    },
    () => ({
      getItem: () => {
        throw new Error('blocked read')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }),
    () => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }),
  ]) {
    const tracker = createReleaseTracker(provider)
    assert.equal(
      tracker.showOnce(ANNOUNCED_RELEASE, () => true),
      true,
    )
    assert.equal(
      tracker.showOnce(ANNOUNCED_RELEASE, () => true),
      false,
    )
  }
})
test('SSR imports never touch browser storage and failed show is retryable', () => {
  let reads = 0
  const tracker = createReleaseTracker(() => {
    reads++
    return null
  })
  assert.equal(reads, 0)
  assert.equal(
    tracker.showOnce(ANNOUNCED_RELEASE, () => {
      throw new Error('not connected')
    }),
    false,
  )
  assert.equal(
    tracker.showOnce(ANNOUNCED_RELEASE, () => true),
    true,
  )
})
test('announcement storage is isolated from notes and progress keys', () => {
  const local = storage()
  local.values.set('notes-storage', 'original notes')
  local.values.set('progress-storage', 'original progress')
  createReleaseTracker(() => local).showOnce(ANNOUNCED_RELEASE, () => true)
  assert.equal(local.values.get('notes-storage'), 'original notes')
  assert.equal(local.values.get('progress-storage'), 'original progress')
  assert.equal(local.values.size, 3)
})
