import { rowToPodcast, type Podcast, type PodcastRow } from '../models/podcast.ts'

export interface PodcastReadResult<T> {
  data: T | null
  error: Error | null
}

export interface PodcastReadSource {
  listPublished(): Promise<PodcastReadResult<PodcastRow[]>>
  getPublished(id: string): Promise<PodcastReadResult<PodcastRow>>
}

export type PodcastListResult = { ok: true; podcasts: Record<string, Podcast> } | { ok: false; error: string }

export type PodcastDetailResult = { ok: true; podcast: Podcast | null } | { ok: false; error: string }

/**
 * Public read seam. `get` intentionally asks the source on every request so
 * an old cached catalog can never make a withdrawn episode playable.
 */
export function createPodcastReader(source: PodcastReadSource) {
  return {
    async list(): Promise<PodcastListResult> {
      const result = await source.listPublished()
      if (result.error) return { ok: false, error: result.error.message }

      const podcasts: Record<string, Podcast> = {}
      for (const row of result.data ?? []) {
        const podcast = rowToPodcast(row)
        podcasts[podcast.id] = podcast
      }
      return { ok: true, podcasts }
    },

    async get(id: string): Promise<PodcastDetailResult> {
      const result = await source.getPublished(id)
      if (result.error) return { ok: false, error: result.error.message }
      return { ok: true, podcast: result.data ? rowToPodcast(result.data) : null }
    },
  }
}
