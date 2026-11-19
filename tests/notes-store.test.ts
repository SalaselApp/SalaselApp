import assert from 'node:assert/strict'
import test from 'node:test'
import { flushNoteDrafts, useNotesStore } from '../app/store/useNotesStore.ts'

const values = new Map<string, string>()
let fail = false
const localStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (fail) throw new Error('Quota')
    values.set(key, value)
  },
}
Object.defineProperty(globalThis, 'window', { value: { localStorage, dispatchEvent: () => true }, configurable: true })
function reset() {
  fail = false
  values.clear()
  useNotesStore.setState({
    notes: {},
    drafts: {},
    pendingClears: {},
    legacy: {},
    automaticRecovery: {},
    statuses: {},
    hydrated: false,
    storageError: false,
  })
}

test('draft save failure keeps canonical data and draft separate, then retry survives reload', () => {
  reset()
  const store = useNotesStore.getState()
  store.upsertNote({ videoId: 'one', playlistId: 'series', text: 'Saved', updatedAt: 1 })
  fail = true
  store.setDraft({ videoId: 'one', playlistId: null, text: 'Keep this draft', updatedAt: 2 })
  assert.equal(store.saveDraft('one'), false)
  assert.equal(useNotesStore.getState().notes.one.text, 'Saved')
  assert.equal(useNotesStore.getState().drafts.one.text, 'Keep this draft')
  assert.equal(useNotesStore.getState().statuses.one, 'error')
  fail = false
  assert.equal(flushNoteDrafts(), true)
  useNotesStore.setState({ notes: {} })
  store.hydrate()
  assert.equal(useNotesStore.getState().notes.one.text, 'Keep this draft')
  assert.equal(useNotesStore.getState().notes.one.playlistId, 'series')
})

test('clearing and stale imports agree across shared store without losing unrelated documents', () => {
  reset()
  const store = useNotesStore.getState()
  const old = { videoId: 'pod', playlistId: null, text: 'Podcast', updatedAt: 1 }
  store.importSnapshot({ pod: old, other: { ...old, videoId: 'other' } })
  assert.equal(store.upsertNote({ ...old, text: '' }), true)
  store.importSnapshot({ pod: old })
  assert.equal(useNotesStore.getState().notes.pod.text, '')
  assert.equal(useNotesStore.getState().notes.other.text, 'Podcast')
})

test('selection and a blank draft never create phantom notes', () => {
  reset()
  useNotesStore.getState().setDraft({ videoId: 'new', playlistId: null, text: '', updatedAt: 1 })
  assert.equal(flushNoteDrafts(), true)
  assert.deepEqual(useNotesStore.getState().notes, {})
  assert.deepEqual(useNotesStore.getState().drafts, {})
})

test('a whitespace-only new draft is dismissed rather than left saving forever', () => {
  reset()
  useNotesStore.getState().setDraft({ videoId: 'blank', playlistId: null, text: '  ', updatedAt: 1 })
  assert.equal(flushNoteDrafts(), true)
  assert.deepEqual(useNotesStore.getState().drafts, {})
  assert.equal(useNotesStore.getState().statuses.blank, 'idle')
  assert.deepEqual(useNotesStore.getState().notes, {})
})

test('failed clear retains confirmed clear intent and an older edit draft until Retry persists the clear', () => {
  reset()
  const store = useNotesStore.getState()
  const original = { videoId: 'one', playlistId: 'series', text: 'Saved original', updatedAt: 1 }
  store.upsertNote(original)
  store.setDraft({ ...original, text: 'Recoverable unsaved edit', updatedAt: 2 })
  fail = true
  assert.equal(store.clearNote(original), false)
  assert.equal(useNotesStore.getState().notes.one.text, 'Saved original')
  assert.equal(useNotesStore.getState().drafts.one.text, 'Recoverable unsaved edit')
  assert.equal(useNotesStore.getState().pendingClears.one.text, '')
  fail = false
  assert.equal(store.saveDraft('one'), true)
  assert.equal(useNotesStore.getState().notes.one.text, '')
  assert.equal(useNotesStore.getState().drafts.one, undefined)
  assert.equal(useNotesStore.getState().pendingClears.one, undefined)
})

test('failed clear without an edit draft retries the clear rather than reporting a no-op success', () => {
  reset()
  const store = useNotesStore.getState()
  const original = { videoId: 'one', playlistId: null, text: 'Saved original', updatedAt: 1 }
  store.upsertNote(original)
  fail = true
  assert.equal(store.clearNote(original), false)
  fail = false
  assert.equal(store.saveDraft('one'), true)
  assert.equal(useNotesStore.getState().notes.one.text, '')
})

test('hydration and extension import keep every valid note beyond the metadata batch size', () => {
  reset()
  const initial = Object.fromEntries(
    Array.from({ length: 137 }, (_, index) => {
      const id = `kept-${index}`
      return [
        id,
        {
          videoId: id,
          playlistId: index < 80 ? 'known-series' : null,
          text: `Saved full body ${index}\n${'Long text. '.repeat(200)}`,
          updatedAt: index + 1,
        },
      ]
    }),
  )
  localStorage.setItem('notes-storage', JSON.stringify({ state: { notes: initial }, version: 0 }))
  const store = useNotesStore.getState()
  store.hydrate()
  assert.equal(Object.keys(useNotesStore.getState().notes).length, 137)
  store.importSnapshot({
    'extra-orphan': {
      videoId: 'extra-orphan',
      playlistId: 'unavailable-series',
      text: 'Imported full body',
      updatedAt: 500,
    },
  })
  assert.equal(Object.keys(useNotesStore.getState().notes).length, 138)
  assert.equal(useNotesStore.getState().notes['kept-136'].text, initial['kept-136'].text)
  useNotesStore.setState({ notes: {} })
  store.hydrate()
  assert.equal(Object.keys(useNotesStore.getState().notes).length, 138)
})

test('history-backed hydration recovers legacy-only videos and keeps conflicting/tombstoned history accessible', () => {
  reset()
  const original = { videoId: 'collision', playlistId: null, text: 'Current canonical', updatedAt: 300 }
  localStorage.setItem(
    'notes-storage',
    JSON.stringify({
      state: { notes: { collision: original, cleared: { ...original, videoId: 'cleared', text: '' } } },
      version: 0,
    }),
  )
  localStorage.setItem(
    'salasel-video-notes',
    JSON.stringify({
      old: [
        {
          id: '1',
          videoId: 'recovered',
          playlistId: 'old-series',
          timestamp: '01:20',
          content: 'Recovered full body',
          createdAt: 100,
        },
        {
          id: '2',
          videoId: 'collision',
          playlistId: 'old-series',
          timestamp: '02:20',
          content: 'Older collision body',
          createdAt: 101,
        },
        {
          id: '3',
          videoId: 'cleared',
          playlistId: 'old-series',
          timestamp: '03:20',
          content: 'Older cleared body',
          createdAt: 102,
        },
      ],
    }),
  )
  const store = useNotesStore.getState()
  store.hydrate()
  assert.match(useNotesStore.getState().notes.recovered.text, /Recovered full body/)
  assert.equal(useNotesStore.getState().notes.collision.text, 'Current canonical')
  assert.equal(useNotesStore.getState().notes.cleared.text, '')
  assert.match(useNotesStore.getState().legacy.collision.text, /Older collision body/)
  assert.match(useNotesStore.getState().legacy.cleared.text, /Older cleared body/)
  store.hydrate()
  assert.equal(Object.keys(useNotesStore.getState().notes).length, 3)
})

test('a fresh extension canonical record supersedes an untouched failed-recovery draft without discarding archived history', () => {
  reset()
  localStorage.setItem(
    'salasel-video-notes',
    JSON.stringify({
      group: [
        {
          id: 'old',
          videoId: 'one',
          playlistId: null,
          timestamp: '01:20',
          content: 'Older recovery body',
          createdAt: 100,
        },
      ],
    }),
  )
  fail = true
  const store = useNotesStore.getState()
  store.hydrate()
  assert.match(useNotesStore.getState().drafts.one.text, /Older recovery body/)
  fail = false
  store.importSnapshot({ one: { videoId: 'one', playlistId: null, text: 'Current extension body', updatedAt: 500 } })
  assert.equal(useNotesStore.getState().notes.one.text, 'Current extension body')
  assert.equal(useNotesStore.getState().drafts.one, undefined)
  assert.match(useNotesStore.getState().legacy.one.text, /Older recovery body/)
})

function failedAutomaticRecovery() {
  reset()
  localStorage.setItem(
    'salasel-video-notes',
    JSON.stringify({
      group: [
        {
          id: 'old',
          videoId: 'one',
          playlistId: null,
          timestamp: '01:20',
          content: 'Older automatic history',
          createdAt: 100,
        },
      ],
    }),
  )
  fail = true
  useNotesStore.getState().hydrate()
  fail = false
}
function externalCanonical(text: string) {
  localStorage.setItem(
    'notes-storage',
    JSON.stringify({
      state: { notes: { one: { videoId: 'one', playlistId: null, text, updatedAt: 1000 } } },
      version: 0,
    }),
  )
}

test('storage-event hydration drops untouched recovery drafts before unload can overwrite another tab canonical or tombstone', () => {
  for (const text of ['Fresh other-tab canonical', '']) {
    failedAutomaticRecovery()
    externalCanonical(text)
    useNotesStore.getState().hydrate()
    assert.equal(useNotesStore.getState().drafts.one, undefined)
    assert.equal(flushNoteDrafts(), true)
    assert.equal(JSON.parse(localStorage.getItem('notes-storage')!).state.notes.one.text, text)
    assert.match(useNotesStore.getState().legacy.one.text, /Older automatic history/)
  }
})

test('save-time protection preserves another tab canonical or tombstone even without a preceding storage event', () => {
  for (const text of ['Fresh other-tab canonical', '']) {
    failedAutomaticRecovery()
    externalCanonical(text)
    const before = localStorage.getItem('notes-storage')
    assert.equal(flushNoteDrafts(), true)
    assert.equal(localStorage.getItem('notes-storage'), before)
    assert.equal(useNotesStore.getState().drafts.one, undefined)
    assert.equal(useNotesStore.getState().notes.one.text, text)
  }
})

test('deliberate editing of a recovery draft is preserved rather than mistaken for automatic migration', () => {
  failedAutomaticRecovery()
  const recovery = useNotesStore.getState().drafts.one
  useNotesStore.getState().setDraft({ ...recovery, text: 'A deliberate user edit' })
  externalCanonical('')
  useNotesStore.getState().hydrate()
  assert.equal(useNotesStore.getState().drafts.one.text, 'A deliberate user edit')
  assert.equal(flushNoteDrafts(), true)
  assert.equal(useNotesStore.getState().notes.one.text, 'A deliberate user edit')
})

test('a pending confirmed clear retains recoverable recovery text and never flushes it as an ordinary edit', () => {
  failedAutomaticRecovery()
  const recovery = useNotesStore.getState().drafts.one
  fail = true
  useNotesStore.getState().clearNote(recovery)
  fail = false
  externalCanonical('')
  useNotesStore.getState().hydrate()
  assert.equal(useNotesStore.getState().drafts.one.text, recovery.text)
  assert.equal(useNotesStore.getState().pendingClears.one.text, '')
  assert.equal(flushNoteDrafts(), true)
  assert.equal(useNotesStore.getState().notes.one.text, '')
})

test('automatic recovery retries stay recoverable on failure and insert only while canonical identity is absent', () => {
  failedAutomaticRecovery()
  const recovery = useNotesStore.getState().drafts.one
  fail = true
  assert.equal(flushNoteDrafts(), false)
  assert.equal(useNotesStore.getState().automaticRecovery.one, true)
  assert.deepEqual(useNotesStore.getState().drafts.one, recovery)
  assert.equal(localStorage.getItem('notes-storage'), null)
  fail = false
  assert.equal(flushNoteDrafts(), true)
  assert.deepEqual(useNotesStore.getState().notes.one, recovery)
  assert.equal(useNotesStore.getState().drafts.one, undefined)
  assert.equal(useNotesStore.getState().automaticRecovery.one, undefined)
})
