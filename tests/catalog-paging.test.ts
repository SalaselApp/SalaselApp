import assert from 'node:assert/strict'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'
import * as paging from '../app/catalog/paging.ts'
import * as reader from '../app/catalog/read.ts'

function clientWith(rows: unknown[], requests: URL[]) {
  return createClient('https://content.example.test', 'test-anon-key', {
    global: {
      fetch: async (input) => {
        requests.push(new URL(String(input)))
        return new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } })
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

test('public page requests validate content kinds and cannot request an unbounded page', () => {
  assert.equal(typeof paging.parseCatalogQuery, 'function')
  const q = paging.parseCatalogQuery({ kind: 'series', language: 'ar', limit: 999999 })
  assert.equal(q.kind, 'series')
  assert.equal(paging.PAGE_SIZE, 20)
  assert.throws(() => paging.parseCatalogQuery({ kind: 'private_suggestions' }))
  assert.throws(() => paging.parseCatalogQuery({ kind: 'lessons' }))
  assert.throws(() => paging.parseCatalogQuery({ kind: 'series', cursor: 'broken' }))
})

test('series filtering and limit happen in the database before the 20-row page is returned', async () => {
  assert.equal(typeof reader.readCatalogPage, 'function')
  const requests: URL[] = []
  const rows = Array.from({ length: 21 }, (_, i) => ({
    id: 'PL' + String(i).padStart(3, '0'),
    name: 'Series ' + i,
    language: 'ar',
    categories: [1],
    classes: [2],
    thumbnail_id: 'image',
    description: '',
    participants: [],
    type: 0,
    style: 1,
    video_count: 3,
    duration: 50,
    start_date: 0,
    end_date: 0,
  }))
  const result = await reader.readCatalogPage(
    paging.parseCatalogQuery({
      kind: 'series',
      language: 'ar',
      category: 1,
      class: 2,
      q: 'needle',
      ids: ['PL001', 'PL002'],
    }),
    clientWith(rows, requests),
  )
  assert.equal(result.items.length, 20)
  assert.ok(result.nextCursor)
  const url = requests[0]
  assert.equal(url.searchParams.get('limit'), '21')
  assert.equal(url.searchParams.get('language'), 'eq.ar')
  assert.equal(url.searchParams.get('categories'), 'cs.{1}')
  assert.equal(url.searchParams.get('classes'), 'cs.{2}')
  assert.equal(url.searchParams.get('name'), 'ilike.%needle%')
  assert.equal(url.searchParams.get('id'), 'in.(PL001,PL002)')
  assert.equal(url.searchParams.get('order'), 'id.asc')
  const cursor = paging.decodeCursor(result.nextCursor, 'series')
  assert.deepEqual(cursor, { kind: 'series', id: 'PL019' })
})

test('empty bookmarks return an empty result without querying every item', async () => {
  assert.equal(typeof reader.readCatalogPage, 'function')
  const requests: URL[] = []
  const result = await reader.readCatalogPage(
    paging.parseCatalogQuery({ kind: 'podcasts', ids: [] }),
    clientWith([], requests),
  )
  assert.deepEqual(result, { items: [], nextCursor: null })
  assert.equal(requests.length, 0)
})

test('podcasts use fresh bounded public reads with a unique tie-breaker and cursor', async () => {
  assert.equal(typeof reader.readCatalogPage, 'function')
  const requests: URL[] = []
  const cursor = paging.encodeCursor({ kind: 'podcasts', id: 'pod_020', publishedAt: '2026-10-01T00:00:00Z' })
  await reader.readCatalogPage(
    paging.parseCatalogQuery({ kind: 'podcasts', language: 'all', cursor, q: 'health' }),
    clientWith([], requests),
  )
  const url = requests[0]
  assert.equal(url.pathname, '/rest/v1/podcasts')
  assert.equal(url.searchParams.get('order'), 'published_at.desc,id.asc')
  assert.equal(url.searchParams.get('limit'), '21')
  assert.equal(url.searchParams.has('language'), false)
  assert.match(url.searchParams.getAll('or').join(' '), /title.ilike/)
  assert.match(url.searchParams.getAll('or').join(' '), /published_at.lt/)
  assert.match(url.searchParams.getAll('or').join(' '), /id.gt.pod_020/)
})

test('lesson pages filter the playlist and continue by position plus id, retaining DB totals', async () => {
  assert.equal(typeof reader.readCatalogPage, 'function')
  const requests: URL[] = []
  const cursor = paging.encodeCursor({ kind: 'lessons', id: 'video_20', position: 19 })
  await reader.readCatalogPage(
    paging.parseCatalogQuery({ kind: 'lessons', playlistId: 'PLcourse', cursor }),
    clientWith([], requests),
  )
  const url = requests[0]
  assert.equal(url.pathname, '/rest/v1/videos')
  assert.equal(url.searchParams.get('playlist_id'), 'eq.PLcourse')
  assert.equal(url.searchParams.get('order'), 'position.asc,id.asc')
  assert.equal(url.searchParams.get('limit'), '21')
  assert.match(url.searchParams.get('or')!, /position.gt.19/)
})

test('a failed public read fails the page instead of reporting an empty collection', async () => {
  assert.equal(typeof reader.readCatalogPage, 'function')
  const client = createClient('https://content.example.test', 'test-key', {
    global: { fetch: async () => new Response(JSON.stringify({ message: 'unavailable' }), { status: 503 }) },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  await assert.rejects(
    () => reader.readCatalogPage(paging.parseCatalogQuery({ kind: 'series' }), client),
    /unavailable/,
  )
})

test('page append deduplicates overlapping records', () => {
  assert.equal(typeof paging.appendCatalogPage, 'function')
  assert.deepEqual(paging.appendCatalogPage([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }]), [{ id: 'a' }, { id: 'b' }])
})
