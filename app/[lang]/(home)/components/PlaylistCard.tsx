'use client'

import type { CalculatedPlaylist, LanguageCode, Translations } from '@/app/types'

import React, { useSyncExternalStore } from 'react'
import CatalogCard from '@/app/shared/components/CatalogCard'
import BookmarkButton from '@/app/shared/components/BookmarkButton'
import { useProgressStore } from '@/app/store/useProgressStore'

export type PlaylistCardPlaylist = Pick<
  CalculatedPlaylist,
  'id' | 'name' | 'description' | 'thumbnailId' | 'videoCount'
>
export interface PlaylistCardProps {
  playlist: PlaylistCardPlaylist
  lang: LanguageCode
  t: Translations
  priority?: boolean
}

const subscribeToHydration = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, lang, t, priority = false }) => {
  const isClient = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot)
  const completedVideos = useProgressStore((s) => s.completedVideos)

  const completedCount = isClient ? (completedVideos[playlist.id]?.size ?? 0) : 0
  const totalCount = playlist.videoCount
  const isCompleted = totalCount > 0 && completedCount === totalCount
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const hasProgress = completedCount > 0

  return (
    <CatalogCard
      href={`/${lang}/playlist/${playlist.id}`}
      title={playlist.name}
      description={playlist.description}
      thumbnailId={playlist.thumbnailId}
      priority={priority}
      thumbnailOverlay={
        <>
          {/* Bookmark button — top end */}
          <div className="pointer-events-auto absolute top-2 end-2">
            <BookmarkButton contentId={playlist.id} kind="series" t={t} />
          </div>

          {/* Completed badge — top start */}
          {isClient && isCompleted && (
            <div className="absolute top-2 start-2 flex items-center gap-1 bg-green-600/90 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="size-3.5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              {t.completedLabel}
            </div>
          )}

          {/* Progress bar — bottom of thumbnail */}
          {isClient && hasProgress && (
            <div className="absolute bottom-0 start-0 end-0 h-1 bg-black/40">
              <div
                className={`h-full transition-all duration-300 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${progressPct}%` }}
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progressPct}%`}
              />
            </div>
          )}
        </>
      }
    />
  )
}

export default PlaylistCard
