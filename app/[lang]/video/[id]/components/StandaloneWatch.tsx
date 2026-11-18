'use client'

import { useCallback } from 'react'

import WatchPlayer from '@/app/[lang]/playlist/[id]/[videoplayerid]/components/WatchPlayer'
import { useProgressStore } from '@/app/store/useProgressStore'
import type { Translations } from '@/app/types'

export default function StandaloneWatch({ video, t }: { video: { id: string; title: string }; t: Translations }) {
  const recordPlayback = useProgressStore((state) => state.recordPlayback)
  const onPlaybackStarted = useCallback(
    () =>
      recordPlayback({
        version: 1,
        kind: 'video',
        contentId: video.id,
        mediaId: video.id,
        title: video.title,
        thumbnailId: video.id,
        destination: `/${t.__language.code}/video/${video.id}`,
        playedAt: Date.now(),
      }),
    [recordPlayback, t.__language.code, video.id, video.title],
  )

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <WatchPlayer videoId={video.id} title={video.title} t={t} onPlaybackStarted={onPlaybackStarted} />
      <h1 className="mt-4 text-xl font-bold text-white">{video.title}</h1>
    </main>
  )
}
