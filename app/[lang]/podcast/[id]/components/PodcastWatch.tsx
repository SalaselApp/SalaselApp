'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import type { Podcast } from '@/app/models/podcast'
import type { Translations } from '@/app/types'
import { useProgressStore } from '@/app/store/useProgressStore'
import { podcastPath, podcastWatchPath } from '@/app/podcasts/contract'
import WatchLayout from '@/app/shared/components/WatchLayout'

export default function PodcastWatch({ podcast, t }: { podcast: Podcast; t: Translations }) {
  const lang = t.__language.code
  const recordPlayback = useProgressStore((state) => state.recordPlayback)
  const onPlaybackStarted = useCallback(
    () =>
      recordPlayback({
        version: 1,
        kind: 'podcast',
        contentId: podcast.id,
        mediaId: podcast.youtubeVideoId,
        title: podcast.title,
        thumbnailId: podcast.thumbnailId,
        destination: podcastWatchPath(lang, podcast.id),
        playedAt: Date.now(),
      }),
    [lang, podcast.id, podcast.youtubeVideoId, podcast.title, podcast.thumbnailId, recordPlayback],
  )
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <Link
        href={podcastPath(lang, podcast.id)}
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded text-sm text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <svg
          aria-hidden="true"
          className="size-5 rtl:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        {t.podcastDetailsLabel}
      </Link>
      <WatchLayout
        video={{ id: podcast.youtubeVideoId, title: podcast.title }}
        t={t}
        onPlaybackStarted={onPlaybackStarted}
      />
    </main>
  )
}
