'use client'

import { useCallback } from 'react'
import type { Translations } from '@/app/types'
import { useProgressStore } from '@/app/store/useProgressStore'
import WatchLayout from '@/app/shared/components/WatchLayout'

export interface WatchClientPlaylist {
  id: string
  name: string
}
export interface WatchClientVideo {
  id: string
  title: string
}
export interface WatchClientProps {
  playlist: WatchClientPlaylist
  video: WatchClientVideo
  t: Translations
}

export default function WatchClient({ playlist, video, t }: WatchClientProps) {
  const lang = t.__language.code
  const recordPlayback = useProgressStore((state) => state.recordPlayback)
  const onPlaybackStarted = useCallback(
    () =>
      recordPlayback({
        version: 1,
        kind: 'playlist-video',
        contentId: video.id,
        mediaId: video.id,
        playlistId: playlist.id,
        playlistName: playlist.name,
        title: video.title,
        thumbnailId: video.id,
        destination: `/${lang}/playlist/${playlist.id}/${video.id}`,
        playedAt: Date.now(),
      }),
    [lang, playlist.id, playlist.name, recordPlayback, video.id, video.title],
  )
  return (
    <section className="pb-8 pt-4">
      <WatchLayout
        video={video}
        playlistId={playlist.id}
        t={t}
        onPlaybackStarted={onPlaybackStarted}
        context={{ href: `/${lang}/playlist/${playlist.id}`, label: playlist.name }}
      />
    </section>
  )
}
