'use client'

import type { CalculatedPlaylist, LanguageCode, Translations } from '@/app/types'
import { useProgressStore } from '@/app/store/useProgressStore'
import ContinueWatching from '@/app/shared/components/ContinueWatching'

export type RecentlyWatchedPlaylist = Pick<CalculatedPlaylist, 'id' | 'name' | 'thumbnailId'>
export interface RecentlyWatchedProps {
  playlists: Record<string, RecentlyWatchedPlaylist>
  lang: LanguageCode
  t: Translations
}

export default function RecentlyWatched({ playlists, lang, t }: RecentlyWatchedProps) {
  const { recentPlaylists } = useProgressStore()
  const recent = recentPlaylists.flatMap((id) =>
    playlists[id]
      ? [
          {
            id: `playlist:${id}`,
            title: playlists[id].name,
            thumbnailId: playlists[id].thumbnailId,
            destination: `/${lang}/playlist/${id}`,
          },
        ]
      : [],
  )
  return <ContinueWatching recent={recent} t={t} />
}
