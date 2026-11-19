import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLibrary, chooseVideo, searchLibrary, groupNotesForExport } from '../app/notes/library.ts'

const catalog = {
  playlists: [
    { id: 'series', title: 'Heart lessons', section: 'series' as const },
    { id: 'show', title: 'Conversations', section: 'podcasts' as const },
  ],
  videos: [
    { videoId: 'one', playlistId: 'series', title: 'Intention', position: 1 },
    { videoId: 'two', playlistId: 'series', title: 'Practice', position: 0 },
    { videoId: 'one', playlistId: 'show', title: 'Same video', position: 0 },
  ],
  podcasts: [{ id: 'pod_1', videoId: 'podvideo', title: 'A thoughtful conversation' }],
}
const note = (videoId: string, playlistId: string | null, text = 'Reflection', updatedAt = 5) => ({
  videoId,
  playlistId,
  text,
  updatedAt,
})
const labels = { unavailableSeries: 'Unavailable series', untitledVideo: 'Untitled video' }

test('keeps series, podcasts and imported standalone visibly distinct without duplicating a video', () => {
  const groups = buildLibrary(
    [note('one', 'series'), note('two', 'series'), note('podvideo', null), note('imported', null)],
    catalog,
    'en',
    labels,
  )
  assert.deepEqual(
    groups.map((g) => g.section),
    ['series', 'podcasts', 'standalone'],
  )
  assert.deepEqual(
    groups[0].items.map((i) => i.note.videoId),
    ['two', 'one'],
  )
  assert.equal(groups.flatMap((g) => g.items).filter((i) => i.note.videoId === 'one').length, 1)
  assert.equal(groups[1].items[0].href, '/en/podcast/pod_1/watch')
  assert.equal(groups[2].items[0].href, null)
})

test('retains orphan content and original group while suppressing blank clear records', () => {
  const groups = buildLibrary([note('missing', 'lost', 'Keep me'), note('cleared', null, '')], catalog, 'ar', labels)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].playlistId, 'lost')
  assert.equal(groups[0].title, 'Unavailable series')
  assert.equal(groups[0].items[0].title, 'Untitled video')
  assert.equal(groups[0].items[0].note.text, 'Keep me')
  assert.equal(groups[0].items[0].href, null)
})

test('search finds playlist, video, podcast and body matches with context', () => {
  const groups = buildLibrary(
    [
      note('one', 'series', 'Review a meaningful action'),
      note('podvideo', null, 'Listen'),
      note('lost', null, 'Unusual phrase'),
    ],
    catalog,
    'en',
    labels,
  )
  assert.equal(searchLibrary(groups, 'heart lessons')[0].items[0].title, 'Intention')
  assert.equal(searchLibrary(groups, 'intention')[0].playlistId, 'series')
  assert.equal(searchLibrary(groups, 'conversation')[0].section, 'podcasts')
  assert.equal(searchLibrary(groups, 'unusual phrase')[0].items[0].note.videoId, 'lost')
  assert.deepEqual(searchLibrary(groups, 'no matching words'), [])
})

test('choosing an existing video preserves canonical context; a new choice does not create a stored document', () => {
  const existing = note('one', 'series', 'Keep original')
  assert.deepEqual(chooseVideo({ videoId: 'one', playlistId: 'show' }, { one: existing }), existing)
  assert.deepEqual(chooseVideo({ videoId: 'podvideo', playlistId: null }, {}), {
    videoId: 'podvideo',
    playlistId: null,
    text: '',
    updatedAt: 0,
  })
})

test('group export preserves video order and deduplicates canonical identity', () => {
  const groups = buildLibrary([note('one', 'series'), note('two', 'series')], catalog, 'en', labels)
  assert.deepEqual(
    groupNotesForExport(groups[0]).map((n) => n.videoId),
    ['two', 'one'],
  )
})

test('a retained recreation draft remains discoverable after a cleared canonical record', async () => {
  const { libraryNotes } = await import('../app/notes/library.ts')
  const records = libraryNotes(
    { lost: note('lost', null, '', 100) },
    { lost: note('lost', null, 'Recover this draft', 101) },
  )
  const groups = buildLibrary(records, catalog, 'en', labels)
  assert.equal(groups[0].items[0].note.text, 'Recover this draft')
  assert.equal(searchLibrary(groups, 'recover')[0].items[0].note.videoId, 'lost')
})

test('playlist export ignores the current search filter and uses only saved canonical content', async () => {
  const { playlistExportGroup } = await import('../app/notes/library.ts')
  const saved = { one: note('one', 'series', 'First'), two: note('two', 'series', 'Second') }
  const filtered = searchLibrary(buildLibrary(Object.values(saved), catalog, 'en', labels), 'intention')
  assert.equal(filtered[0].items.length, 1)
  const full = playlistExportGroup(filtered[0].playlistId!, saved, catalog, 'en', labels)
  assert.deepEqual(
    full?.items.map((item) => item.note.videoId),
    ['two', 'one'],
  )
})

test('available canonical video metadata resolves title and source without moving stored context or inventing position', () => {
  const groups = buildLibrary([note('one', 'lost')], catalog, 'en', labels)
  assert.equal(groups[0].playlistId, 'lost')
  assert.equal(groups[0].title, 'Unavailable series')
  assert.equal(groups[0].items[0].title, 'Intention')
  assert.equal(groups[0].items[0].href, '/en/video/one')
  assert.equal(groups[0].items[0].position, Number.MAX_SAFE_INTEGER)
  assert.equal(searchLibrary(groups, 'intention').length, 1)
})

test('a known podcast resolves title and source even when its canonical note retains an old playlist context', () => {
  const groups = buildLibrary([note('podvideo', 'lost')], catalog, 'ar', labels)
  assert.equal(groups[0].playlistId, 'lost')
  assert.equal(groups[0].section, 'series')
  assert.equal(groups[0].items[0].title, 'A thoughtful conversation')
  assert.equal(groups[0].items[0].href, '/ar/podcast/pod_1/watch')
})

test('all 137 nonempty saved notes remain in the library even when source metadata is unavailable', () => {
  const saved = Object.fromEntries(
    Array.from({ length: 137 }, (_, index) => {
      const value = note(
        `saved-${index}`,
        index < 90 ? `group-${index % 3}` : null,
        `Full note ${index}\n${'Long content. '.repeat(150)}`,
        index + 1,
      )
      return [value.videoId, value]
    }),
  )
  const groups = buildLibrary(libraryNotesForTest(saved), { playlists: [], videos: [], podcasts: [] }, 'en', labels)
  const items = groups.flatMap((group) => group.items)
  assert.equal(items.length, 137)
  assert.equal(new Set(items.map((item) => item.note.videoId)).size, 137)
  assert.equal(items.find((item) => item.note.videoId === 'saved-136')?.note.text, saved['saved-136'].text)
  assert.equal(searchLibrary(groups, 'Full note 136').flatMap((group) => group.items).length, 1)
})
function libraryNotesForTest(saved: Record<string, ReturnType<typeof note>>) {
  return Object.values(saved)
}

test('searching a localized content type finds its notes while retaining group context', () => {
  const groups = buildLibrary([note('one', 'series'), note('podvideo', null)], catalog, 'ar', labels)
  assert.equal(
    searchLibrary(groups, 'البودكاست', { series: 'السلاسل', podcasts: 'البودكاست', standalone: 'مقاطع مستقلة' })[0]
      ?.section,
    'podcasts',
  )
  assert.equal(searchLibrary(groups, 'series')[0]?.section, 'series')
})

test('a blank canonical tombstone keeps older notes reachable without restoring canonical text', () => {
  const record = note('one', 'series', '', 100)
  const groups = buildLibrary([record], catalog, 'en', labels, { one: 'Timestamped older text' })
  assert.equal(groups[0].items[0].note.text, '')
  assert.equal(groups[0].items[0].olderText, 'Timestamped older text')
  assert.equal(searchLibrary(groups, 'timestamped older')[0].items[0].note.videoId, 'one')
})
