import type { Categories, Classes, ContentTypes, PresentationStyles, Languages } from '@/app/types'

/** Raw published row from the shared `podcasts` table. */
export interface PodcastRow {
  id: string
  title: string
  description: string
  thumbnail_id: string
  youtube_video_id: string
  language: string
  categories: number[]
  participants?: string[] | null
  type?: number | null
  style?: number | null
  classes?: number[] | null
  duration: number
  uploaded_at: number
  published_at: string
}

/** Independent public episode. It intentionally has no playlist identity. */
export interface Podcast {
  id: string
  title: string
  description: string
  thumbnailId: string
  youtubeVideoId: string
  language: Languages
  categories: Categories[]
  participants: string[]
  type: ContentTypes | null
  style: PresentationStyles | null
  classes: Classes[]
  duration: number
  uploadedAt: number
  publishedAt: string
}

export function rowToPodcast(row: PodcastRow): Podcast {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnailId: row.thumbnail_id,
    youtubeVideoId: row.youtube_video_id,
    language: row.language as Languages,
    categories: row.categories as Categories[],
    participants: row.participants ?? [],
    type: row.type == null ? null : (row.type as ContentTypes),
    style: row.style == null ? null : (row.style as PresentationStyles),
    classes: (row.classes ?? []) as Classes[],
    duration: row.duration,
    uploadedAt: row.uploaded_at,
    publishedAt: row.published_at,
  }
}
