import { unstable_cache } from 'next/cache'

import { supabase } from '@/app/lib/supabase'
import type { PodcastRow } from '@/app/models/podcast'
import { PODCASTS_TAG } from '@/app/podcasts/contract'
import { createPodcastReader, type PodcastDetailResult, type PodcastListResult } from '@/app/podcasts/read'

const PODCASTS_REVALIDATE = 60 * 60

/**
 * Metadata list cache is a one-hour fallback when the Admin webhook cannot be
 * delivered. Individual playback reads are deliberately uncached: a fresh
 * request must never play an episode withdrawn after this list was cached.
 */
const listCachedPublishedRows = unstable_cache(
  async () => {
    const { data, error } = await supabase.from('podcasts').select('*').order('published_at', { ascending: false })
    return { data: (data ?? null) as PodcastRow[] | null, error: error ? new Error(error.message) : null }
  },
  ['podcasts'],
  { tags: [PODCASTS_TAG], revalidate: PODCASTS_REVALIDATE },
)

const reader = createPodcastReader({
  async listPublished() {
    // Cache carries metadata only. A fresh public visibility list filters it
    // so failed webhook delivery cannot keep withdrawn rows in discovery.
    const [cached, visible] = await Promise.all([listCachedPublishedRows(), supabase.from('podcasts').select('id')])
    if (cached.error) return cached
    if (visible.error) return { data: null, error: new Error(visible.error.message) }
    const visibleIds = new Set((visible.data ?? []).map((row) => row.id))
    return { data: (cached.data ?? []).filter((row) => visibleIds.has(row.id)), error: null }
  },
  async getPublished(id) {
    const { data, error } = await supabase.from('podcasts').select('*').eq('id', id).maybeSingle()
    return { data: (data ?? null) as PodcastRow | null, error: error ? new Error(error.message) : null }
  },
})

/** Catalog result distinguishes a failed public read from an empty catalog. */
export async function getPodcasts(): Promise<PodcastListResult> {
  return reader.list()
}

/** Fresh RLS-protected lookup for canonical public playback pages. */
export async function getPodcast(id: string): Promise<PodcastDetailResult> {
  return reader.get(id)
}
