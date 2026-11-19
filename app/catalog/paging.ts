import type { CalculatedPlaylist, CalculatedVideo } from '../types.ts'
import type { Podcast } from '../models/podcast.ts'

export const PAGE_SIZE = 20
export type CatalogKind = 'series' | 'podcasts' | 'lessons'
export type CatalogItem = CalculatedPlaylist | Podcast | CalculatedVideo
export interface CatalogCursor {
  kind: CatalogKind
  id: string
  position?: number
  publishedAt?: string
}
export interface CatalogQuery {
  kind: CatalogKind
  language: string
  q: string
  category?: number
  contentType?: number
  presentationStyle?: number
  class?: number
  ids?: string[]
  playlistId?: string
  cursor?: string
}
export interface CatalogPage<T = CatalogItem> {
  items: T[]
  nextCursor: string | null
}
const validId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,200}$/.test(v)
export function encodeCursor(cursor: CatalogCursor): string {
  return btoa(JSON.stringify(cursor)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
export function decodeCursor(value: string, kind: CatalogKind): CatalogCursor {
  try {
    if (value.length > 600) throw new Error()
    const cursor = JSON.parse(atob(value.replaceAll('-', '+').replaceAll('_', '/'))) as CatalogCursor
    if (cursor.kind !== kind || !validId(cursor.id)) throw new Error()
    if (kind === 'lessons' && (!Number.isSafeInteger(cursor.position) || cursor.position! < 0)) throw new Error()
    if (
      kind === 'podcasts' &&
      (typeof cursor.publishedAt !== 'string' ||
        !/^\d{4}-\d\d-\d\dT[\d:.+-]+Z?$/.test(cursor.publishedAt) ||
        !Number.isFinite(Date.parse(cursor.publishedAt)))
    )
      throw new Error()
    return {
      kind,
      id: cursor.id,
      ...(kind === 'lessons' ? { position: cursor.position } : {}),
      ...(kind === 'podcasts' ? { publishedAt: cursor.publishedAt } : {}),
    }
  } catch {
    throw new Error('Invalid catalog cursor')
  }
}
export function parseCatalogQuery(input: unknown): CatalogQuery {
  if (!input || typeof input !== 'object') throw new Error('Invalid catalog request')
  const v = input as Record<string, unknown>
  if (!['series', 'podcasts', 'lessons'].includes(String(v.kind))) throw new Error('Invalid content kind')
  const kind = v.kind as CatalogKind
  const language = v.language ?? 'all'
  if (!['all', 'ar', 'en', 'ja'].includes(String(language))) throw new Error('Invalid language')
  if (v.q !== undefined && (typeof v.q !== 'string' || v.q.length > 200)) throw new Error('Invalid search')
  const query: CatalogQuery = { kind, language: String(language), q: typeof v.q === 'string' ? v.q.trim() : '' }
  for (const [key, max] of [
    ['category', 2],
    ['contentType', 2],
    ['presentationStyle', 3],
    ['class', 3],
  ] as const) {
    if (v[key] === undefined || v[key] === 'all') continue
    if (!Number.isInteger(v[key]) || Number(v[key]) < 0 || Number(v[key]) > max) throw new Error('Invalid filter')
    query[key] = Number(v[key])
  }
  if (v.ids !== undefined) {
    if (!Array.isArray(v.ids) || v.ids.length > 1000 || !v.ids.every(validId)) throw new Error('Invalid content IDs')
    query.ids = [...new Set(v.ids as string[])].sort()
  }
  if (kind === 'lessons') {
    if (!validId(v.playlistId)) throw new Error('Missing playlist')
    query.playlistId = v.playlistId
  }
  if (v.cursor !== undefined && v.cursor !== null) {
    if (typeof v.cursor !== 'string') throw new Error('Invalid catalog cursor')
    decodeCursor(v.cursor, kind)
    query.cursor = v.cursor
  }
  return query
}
export function appendCatalogPage<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const seen = new Set(current.map((item) => item.id))
  return [
    ...current,
    ...incoming.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    }),
  ]
}
