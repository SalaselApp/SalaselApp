import assert from 'node:assert/strict'
import test from 'node:test'
import { createNotesCatalogReader, parseMetadataRequest } from '../app/notes/catalog.ts'

test('metadata reads only requested saved identities and includes their contextual playlist and independent podcast names', async () => {
  const seen: Record<string, string[]> = {}
  const read = createNotesCatalogReader({
    videos: async (ids: string[]) => {
      seen.videos = ids
      return { ok: true, items: [{ videoId: 'saved', playlistId: 'series', title: 'Saved lesson', position: 9 }] }
    },
    podcasts: async (ids: string[]) => {
      seen.podcasts = ids
      return { ok: true, items: [{ id: 'pod_1', videoId: 'podvideo', title: 'A podcast' }] }
    },
    playlists: async (ids: string[]) => {
      seen.playlists = ids
      return { ok: true, items: [{ id: 'series', title: 'A series', section: 'series' }] }
    },
  })
  const catalog = await read({ videoIds: ['saved', 'podvideo'], playlistIds: ['series'] })
  assert.deepEqual(seen.videos, ['saved', 'podvideo'])
  assert.deepEqual(seen.podcasts, ['saved', 'podvideo'])
  assert.deepEqual(seen.playlists, ['series'])
  assert.equal(catalog.videos[0].title, 'Saved lesson')
  assert.equal(catalog.podcasts[0].videoId, 'podvideo')
  assert.equal(catalog.incomplete, false)
})
test('empty library does not issue any content metadata queries', async () => {
  let calls = 0
  const empty = async () => {
    calls++
    return { ok: true, items: [] }
  }
  const catalog = await createNotesCatalogReader({ videos: empty, podcasts: empty, playlists: empty })({
    videoIds: [],
    playlistIds: [],
  })
  assert.equal(calls, 0)
  assert.deepEqual(catalog, { videos: [], podcasts: [], playlists: [], incomplete: false })
})
test('partial metadata failure retains successful names and flags fallback availability', async () => {
  const read = createNotesCatalogReader({
    playlists: async () => ({ ok: true, items: [] }),
    podcasts: async () => ({ ok: false, items: [] }),
    videos: async () => ({ ok: false, items: [] }),
  })
  const catalog = await read({ videoIds: ['saved'], playlistIds: [] })
  assert.equal(catalog.incomplete, true)
  assert.deepEqual(catalog.videos, [])
})
test('metadata request rejects unbounded batches and never accepts note bodies', () => {
  assert.throws(() =>
    parseMetadataRequest({ videoIds: Array.from({ length: 51 }, (_, i) => String(i)), playlistIds: [] }),
  )
  assert.deepEqual(parseMetadataRequest({ videoIds: ['one', 'one'], playlistIds: [], text: 'private body' }), {
    videoIds: ['one'],
    playlistIds: [],
  })
})

test('client metadata batches cover every saved note without transmitting private note bodies', async () => {
  const { metadataBatches } = await import('../app/notes/catalog.ts')
  const notes = Array.from({ length: 121 }, (_, i) => ({
    videoId: `video-${i}`,
    playlistId: `series-${i}`,
    text: 'PRIVATE NOTE BODY',
    updatedAt: 1,
  }))
  const batches = metadataBatches(notes)
  assert.deepEqual(
    batches.map((batch) => batch.videoIds.length),
    [50, 50, 21],
  )
  assert.equal(batches.flatMap((batch) => batch.videoIds).length, 121)
  assert.equal(JSON.stringify(batches).includes('PRIVATE'), false)
})
