import assert from 'node:assert/strict'
import test from 'node:test'
import { hydrateLegacyNotes } from '../app/notes/legacy.ts'

// Actual shapes from 2883955^:app/store/useNotesStore.ts and useProgressStore.ts.
const blocks = [
  {
    id: 'first',
    videoId: 'old-video',
    playlistId: 'PL-old',
    timestamp: '01:20',
    content: 'First older note',
    createdAt: 1700000000000,
  },
  {
    id: 'second',
    videoId: 'old-video',
    playlistId: 'PL-old',
    timestamp: '02:40',
    content: 'Second older note',
    createdAt: 1700000001000,
  },
]
function storage(current?: Record<string, unknown>) {
  const values = new Map<string, string>([
    ['salasel-video-notes', JSON.stringify({ 'PL-old-old-video': blocks })],
    [
      'progress-storage',
      JSON.stringify({
        state: {
          notes: { 'progress-video': [{ content: 'Progress-store note', timestamp: 1690000000000 }] },
          completedVideos: { 'PL-old': ['old-video'] },
        },
        version: 0,
      }),
    ],
  ])
  if (current) values.set('notes-storage', JSON.stringify({ state: { notes: current }, version: 0 }))
  let fail = false
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (fail) throw new Error('Quota')
      values.set(key, value)
    },
    fail: () => {
      fail = true
    },
  }
}

test('recovers both historical formats with every block/time/context and leaves originals byte-for-byte unchanged', () => {
  const target = storage()
  const oldBytes = [target.getItem('salasel-video-notes'), target.getItem('progress-storage')]
  const result = hydrateLegacyNotes(target)
  assert.equal(Object.keys(result.notes).length, 2)
  assert.equal(result.notes['old-video'].playlistId, 'PL-old')
  assert.match(result.notes['old-video'].text, /01:20[\s\S]*First older note[\s\S]*02:40[\s\S]*Second older note/)
  assert.match(result.notes['old-video'].text, /PL-old/)
  assert.match(result.notes['progress-video'].text, /1690000000000[\s\S]*Progress-store note/)
  assert.equal(result.notes['old-video'].updatedAt, 1700000001000)
  assert.deepEqual([target.getItem('salasel-video-notes'), target.getItem('progress-storage')], oldBytes)
  assert.deepEqual(hydrateLegacyNotes(target).notes, result.notes)
})

test('existing canonical documents and blank tombstones are never overwritten while all legacy text stays available', () => {
  const existing = {
    videoId: 'old-video',
    playlistId: 'new-context',
    text: 'Current content',
    updatedAt: 1800000000000,
  }
  for (const text of ['Current content', '']) {
    const target = storage({ 'old-video': { ...existing, text } })
    const result = hydrateLegacyNotes(target)
    assert.deepEqual(result.notes['old-video'], { ...existing, text })
    assert.match(result.legacy['old-video'].text, /First older note[\s\S]*Second older note/)
  }
})

test('failed recovery persistence preserves original keys and keeps recovered documents as retryable drafts', () => {
  const target = storage()
  const before = [...target.values]
  target.fail()
  const result = hydrateLegacyNotes(target)
  assert.equal(Object.keys(result.notes).length, 0)
  assert.equal(Object.keys(result.drafts).length, 2)
  assert.match(result.drafts['old-video'].text, /Second older note/)
  assert.equal(result.storageError, true)
  assert.deepEqual([...target.values], before)
})

test('duplicate historical blocks across raw store and progress snapshots are included once without dropping distinct times', () => {
  const target = storage()
  target.values.set(
    'progress-storage',
    JSON.stringify({
      state: {
        notes: {
          'old-video': [
            { content: blocks[0].content, timestamp: blocks[0].createdAt },
            { content: 'Same phrase', timestamp: 1 },
            { content: 'Same phrase', timestamp: 2 },
          ],
        },
      },
      version: 0,
    }),
  )
  const result = hydrateLegacyNotes(target)
  assert.equal((result.notes['old-video'].text.match(/First older note/g) || []).length, 1)
  assert.equal((result.notes['old-video'].text.match(/Same phrase/g) || []).length, 2)
})

test('legacy recovery and its Markdown export preserve original indentation and trailing newlines', async () => {
  const { buildVideoNoteMarkdown } = await import('../app/notes.ts')
  const target = storage()
  const content = '  indented first line\n\n    second line\n  '
  target.values.set('salasel-video-notes', JSON.stringify({ group: [{ ...blocks[0], content }] }))
  const result = hydrateLegacyNotes(target)
  assert.ok(result.notes['old-video'].text.includes(content))
  assert.ok(buildVideoNoteMarkdown(result.notes['old-video'], 'Older notes').includes(content))
})

test('older collisions remain available from the independent archive after progress tracking rewrites its active key', () => {
  const current = {
    videoId: 'progress-video',
    playlistId: null,
    text: 'Current canonical text',
    updatedAt: 1800000000000,
  }
  const target = storage({ 'progress-video': current })
  const before = target.getItem('progress-storage')
  hydrateLegacyNotes(target)
  const archive = JSON.parse(target.getItem('salasel-notes-legacy-archive-v1')!)
  assert.ok(
    archive.snapshots.some(
      (entry: { key: string; raw: string }) => entry.key === 'progress-storage' && entry.raw === before,
    ),
  )
  target.setItem(
    'progress-storage',
    JSON.stringify({ state: { completedVideos: {}, recentPlaylists: ['new'] }, version: 1 }),
  )
  const result = hydrateLegacyNotes(target)
  assert.deepEqual(result.notes['progress-video'], current)
  assert.match(result.legacy['progress-video'].text, /Progress-store note/)
})

test('the progress-write guard archives legacy notes first and does not grow on unrelated progress updates', async () => {
  const { archiveBeforeProgressWrite } = await import('../app/notes/legacyArchive.ts')
  const target = storage()
  archiveBeforeProgressWrite(target)
  const originalArchive = target.getItem('salasel-notes-legacy-archive-v1')
  const oldProgress = JSON.parse(target.getItem('progress-storage')!)
  target.setItem(
    'progress-storage',
    JSON.stringify({ ...oldProgress, state: { ...oldProgress.state, recentPlaylists: ['new'] } }),
  )
  archiveBeforeProgressWrite(target)
  assert.equal(target.getItem('salasel-notes-legacy-archive-v1'), originalArchive)
})

test('a failed archive write prevents a guarded progress overwrite from destroying the source', async () => {
  const { archiveBeforeProgressWrite } = await import('../app/notes/legacyArchive.ts')
  const target = storage()
  const before = target.getItem('progress-storage')
  target.fail()
  assert.throws(() => {
    archiveBeforeProgressWrite(target)
    target.setItem('progress-storage', '{"state":{}}')
  }, /Quota/)
  assert.equal(target.getItem('progress-storage'), before)
})

test('same content at distinct playback positions is preserved even when creation times match', () => {
  const target = storage()
  target.values.set(
    'salasel-video-notes',
    JSON.stringify({
      group: [
        { ...blocks[0], content: 'Repeated phrase' },
        { ...blocks[0], id: 'other', timestamp: '02:40', content: 'Repeated phrase' },
      ],
    }),
  )
  const result = hydrateLegacyNotes(target)
  assert.equal((result.notes['old-video'].text.match(/Repeated phrase/g) || []).length, 2)
})
