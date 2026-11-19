import type { CalculatedPlaylist, Playlists } from '@/app/types'
import { unstable_cache } from 'next/cache'
import { supabase } from '@/app/lib/supabase'
import { rowToPlaylist, type PlaylistRow } from '@/app/models/playlist'

/** Cache tag for all playlist data — revalidate this after content edits. */
export const PLAYLISTS_TAG = 'playlists'

/** How long (seconds) before the cached playlist data is considered stale. */
const PLAYLISTS_REVALIDATE = 60 * 60 // 1 hour

/**
 * Fetch every playlist from Supabase, cached in Next's Data Cache.
 *
 * The dataset is small (one row per playlist) and only changes on content
 * edits, so we cache the whole map under a single key. After the first call,
 * navigation no longer hits Supabase until the cache is revalidated — either
 * by the time window above or by `revalidateTag(PLAYLISTS_TAG)`.
 */
export const getPlaylists = unstable_cache(
  async (): Promise<Playlists> => {
    const { data, error } = await supabase.from('playlists').select('*').order('id')

    if (error) {
      console.error('getPlaylists error:', error.message)
      return {}
    }

    const result: Playlists = {}
    for (const row of data as PlaylistRow[]) {
      result[row.id] = rowToPlaylist(row)
    }
    return result
  },
  ['playlists'],
  { tags: [PLAYLISTS_TAG], revalidate: PLAYLISTS_REVALIDATE },
)

/* Detail pages query one row, rather than warming the entire catalog. */
export const getPlaylist = unstable_cache(
  async (id: string): Promise<CalculatedPlaylist | undefined> => {
    const { data, error } = await supabase.from('playlists').select('*').eq('id', id).maybeSingle()
    if (error || !data) return undefined
    return rowToPlaylist(data as PlaylistRow)
  },
  ['playlist'],
  { tags: [PLAYLISTS_TAG], revalidate: PLAYLISTS_REVALIDATE },
)

export function searchPlaylists(playlists: Playlists, query: string): Playlists {
  if (!query.trim()) return playlists

  const normalizedQuery = query.trim().toLowerCase()
  const matches: Playlists = {}

  for (const id in playlists) {
    if (!Object.hasOwn(playlists, id)) continue
    const pl = playlists[id]
    if (pl.name.toLowerCase().includes(normalizedQuery)) {
      matches[pl.id] = pl
    }
  }

  return matches
}
