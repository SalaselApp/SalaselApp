'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import type { Translations } from '@/app/types'
import { usePreferencesStore } from '@/app/store/usePreferencesStore'
import WatchPlayer from '@/app/[lang]/playlist/[id]/[videoplayerid]/components/WatchPlayer'
import WatchNotes from '@/app/[lang]/playlist/[id]/[videoplayerid]/components/WatchNotes'

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export default function WatchLayout({
  video,
  playlistId = null,
  t,
  onPlaybackStarted,
  context,
}: {
  video: { id: string; title: string }
  playlistId?: string | null
  t: Translations
  onPlaybackStarted: () => void
  context?: { href: string; label: string }
}) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const notesSide = usePreferencesStore((state) => state.notesSide)
  const notesFirst = hydrated && notesSide === 'start'
  const player = (
    <div className={`min-w-0 lg:col-span-2 ${notesFirst ? 'order-2' : 'order-1'}`}>
      <WatchPlayer
        key={`${video.id}:${playlistId ?? ''}`}
        videoId={video.id}
        playlistId={playlistId ?? undefined}
        title={video.title}
        t={t}
        onPlaybackStarted={onPlaybackStarted}
      />
      <h1 dir="auto" className="mt-4 text-xl font-bold leading-relaxed text-white">
        {video.title}
      </h1>
      {context && (
        <Link
          href={context.href}
          className="mt-2 inline-flex min-h-11 items-center rounded text-sm font-medium text-teal-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {context.label}
        </Link>
      )}
    </div>
  )
  const notes = (
    <div className={`min-w-0 lg:col-span-1 ${notesFirst ? 'order-1' : 'order-2'}`}>
      <WatchNotes key={`${video.id}:${playlistId ?? ''}`} videoId={video.id} playlistId={playlistId} t={t} />
    </div>
  )
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
      {player}
      {notes}
    </div>
  )
}
