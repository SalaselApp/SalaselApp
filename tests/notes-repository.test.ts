import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeNotes, readNotes, saveNote } from '../app/notes/repository.ts'

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
const original = { videoId: 'one', playlistId: 'series', text: 'Original', updatedAt: 50 }

test('successful save survives reload and preserves original playlist context', () => {
  const target = storage()
  const saved = saveNote(target, { one: original }, { ...original, playlistId: 'another', text: 'New' }, 50)
  assert.equal(saved.one.updatedAt, 51)
  assert.equal(saved.one.playlistId, 'series')
  assert.equal(readNotes(target).one.text, 'New')
})

test('failed persistence throws before canonical notes are modified', () => {
  const current = { one: original }
  const target = {
    getItem: () => null,
    setItem: () => {
      throw new Error('Quota exceeded')
    },
  }
  assert.throws(() => saveNote(target, current, { ...original, text: 'Unsaved' }, 100), /Quota/)
  assert.equal(current.one.text, 'Original')
})

test('a clear survives stale extension import and permits intentional fresh writing', () => {
  const target = storage()
  const cleared = saveNote(target, { one: original }, { ...original, text: '' }, 100)
  const imported = mergeNotes(readNotes(target), { one: original })
  assert.equal(imported.one.text, '')
  const recreated = saveNote(target, imported, { ...original, text: 'Fresh' }, 100)
  assert.equal(recreated.one.text, 'Fresh')
  assert.equal(recreated.one.updatedAt, 101)
  assert.ok(cleared.one.updatedAt > original.updatedAt)
})

test('reads legacy version-zero persisted notes without changing content and rejects mismatched identities', () => {
  const target = storage()
  target.setItem(
    'notes-storage',
    JSON.stringify({ state: { notes: { one: original, bad: { ...original, videoId: 'wrong' } } }, version: 0 }),
  )
  assert.deepEqual(readNotes(target), { one: original })
})

test('saving merges newer persisted records from another tab and preserves unrelated notes', () => {
  const target = storage()
  target.setItem(
    'notes-storage',
    JSON.stringify({ state: { notes: { other: { ...original, videoId: 'other', updatedAt: 200 } } }, version: 0 }),
  )
  const next = saveNote(target, { one: original }, { ...original, text: 'Edited' }, 100)
  assert.equal(next.other.updatedAt, 200)
  assert.equal(readNotes(target).one.text, 'Edited')
})

test('import never deletes absent records and never replaces a newer blank record with stale text', () => {
  const cleared = { ...original, text: '', updatedAt: 100 }
  const next = mergeNotes({ one: cleared }, { one: original, other: { ...original, videoId: 'other' } })
  assert.equal(next.one.text, '')
  assert.equal(next.other.videoId, 'other')
  assert.equal(mergeNotes(next, {}).one.text, '')
})
