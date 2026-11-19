'use client'

import type { CalculatedPlaylist, LanguageCode, Translations } from '@/app/types'
import { useProgressStore } from '@/app/store/useProgressStore'
import ContinueWatching from '@/app/shared/components/ContinueWatching'
import { useCatalogPage } from '@/app/catalog/useCatalogPage'

export type RecentlyWatchedPlaylist = Pick<CalculatedPlaylist, 'id' | 'name' | 'thumbnailId'>
export interface RecentlyWatchedProps {
  playlists?: Record<string, RecentlyWatchedPlaylist>
  lang: LanguageCode
  t: Translations
}

export default function RecentlyWatched({ playlists, lang, t }: RecentlyWatchedProps) {
  const { recentPlaylists } = useProgressStore()
  const missingIds = recentPlaylists.filter((id) => !playlists?.[id]).slice(0, 10)
  const page = useCatalogPage<CalculatedPlaylist>({ kind: 'series', language: 'all', q: '', ids: missingIds })
  const metadata = { ...Object.fromEntries(page.items.map((item) => [item.id, item])), ...playlists }
  const recent = recentPlaylists.flatMap((id) =>
    metadata[id]
      ? [
          {
            id: `playlist:${id}`,
            title: metadata[id].name,
            thumbnailId: metadata[id].thumbnailId,
            destination: `/${lang}/playlist/${id}`,
          },
        ]
      : [],
  )
  return <ContinueWatching recent={recent} t={t} />
}
