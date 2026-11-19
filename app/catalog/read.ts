import type { SupabaseClient } from '@supabase/supabase-js'
import { rowToPlaylist, type PlaylistRow } from '../models/playlist.ts'
import { rowToPodcast, type PodcastRow } from '../models/podcast.ts'
import { rowToVideo, type VideoRow } from '../models/video.ts'
import { decodeCursor, encodeCursor, PAGE_SIZE, type CatalogPage, type CatalogQuery } from './paging.ts'

const playlistColumns =
  'id,name,thumbnail_id,description,participants,language,type,style,categories,classes,video_count,duration,start_date,end_date'
const podcastColumns =
  'id,title,description,thumbnail_id,youtube_video_id,language,categories,participants,type,style,classes,duration,uploaded_at,published_at'
const videoColumns = 'id,playlist_id,title,duration,uploaded_at,position'
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (v) => '\\' + v)
const quoted = (s: string) => '"' + s.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"'

/** Every query is RLS-protected, filtered and bounded at the database, including the one-row lookahead. */
export async function readCatalogPage(query: CatalogQuery, client: SupabaseClient): Promise<CatalogPage> {
  if (query.ids?.length === 0) return { items: [], nextCursor: null }
  const isSeries = query.kind === 'series'
  const isLessons = query.kind === 'lessons'
  let request = client
    .from(isSeries ? 'playlists' : isLessons ? 'videos' : 'podcasts')
    .select((isSeries ? playlistColumns : isLessons ? videoColumns : podcastColumns) as string)
  if (isLessons) {
    request = request.eq('playlist_id', query.playlistId!).order('position').order('id')
  } else {
    request = isSeries ? request.order('id') : request.order('published_at', { ascending: false }).order('id')
    if (query.language !== 'all') request = request.eq('language', query.language)
    if (query.category !== undefined) request = request.contains('categories', [query.category])
    if (query.class !== undefined) request = request.contains('classes', [query.class])
    if (query.contentType !== undefined) request = request.eq('type', query.contentType)
    if (query.presentationStyle !== undefined) request = request.eq('style', query.presentationStyle)
  }
  if (query.ids) request = request.in('id', query.ids)
  if (query.q) {
    const pattern = '%' + escapeLike(query.q) + '%'
    request = isSeries
      ? request.ilike('name', pattern)
      : isLessons
        ? request.ilike('title', pattern)
        : request.or('title.ilike.' + quoted(pattern) + ',description.ilike.' + quoted(pattern))
  }
  if (query.cursor) {
    const cursor = decodeCursor(query.cursor, query.kind)
    if (isSeries) request = request.gt('id', cursor.id)
    else if (isLessons)
      request = request.or(
        'position.gt.' + cursor.position + ',and(position.eq.' + cursor.position + ',id.gt.' + cursor.id + ')',
      )
    else
      request = request.or(
        'published_at.lt.' +
          quoted(cursor.publishedAt!) +
          ',and(published_at.eq.' +
          quoted(cursor.publishedAt!) +
          ',id.gt.' +
          cursor.id +
          ')',
      )
  }
  const { data, error } = await request.limit(PAGE_SIZE + 1)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as (PlaylistRow & PodcastRow & VideoRow)[]
  const shown = rows.slice(0, PAGE_SIZE)
  const last = shown.at(-1)
  const nextCursor =
    rows.length > PAGE_SIZE && last
      ? encodeCursor({
          kind: query.kind,
          id: last.id,
          ...(isLessons ? { position: last.position } : {}),
          ...(!isSeries && !isLessons ? { publishedAt: last.published_at } : {}),
        })
      : null
  return {
    items: isSeries
      ? (shown as PlaylistRow[]).map(rowToPlaylist)
      : isLessons
        ? (shown as VideoRow[]).map(rowToVideo)
        : (shown as PodcastRow[]).map(rowToPodcast),
    nextCursor,
  }
}
