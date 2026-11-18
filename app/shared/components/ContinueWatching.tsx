'use client'

import type { Translations } from '@/app/types'
import { activityPlaybackPath, mergeRecentActivity } from '@/app/activity/contract'
import { useProgressStore } from '@/app/store/useProgressStore'

import React, { useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { videoThumbnailUrl, fallbackThumbnailUrl } from '@/app/utils'

export interface RecentCatalogItem {
  id: string
  title: string
  thumbnailId: string
  destination: string
}

interface ContinueWatchingProps {
  recent: RecentCatalogItem[]
  t: Translations
}

const COLLAPSED_COUNT = 6
const HIDDEN_KEY = 'salasel-hide-recently-watched'

const VISIBILITY_EVENT = 'salasel-recent-visibility'
const subscribeToVisibility = (notify: () => void) => {
  window.addEventListener('storage', notify)
  window.addEventListener(VISIBILITY_EVENT, notify)
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener(VISIBILITY_EVENT, notify)
  }
}
const readHidden = () => {
  try {
    return localStorage.getItem(HIDDEN_KEY) === 'true'
  } catch {
    return false
  }
}
const serverHidden = () => false
const clientSnapshot = () => true
const serverSnapshot = () => false

const ContinueWatching = ({ recent, t }: ContinueWatchingProps) => {
  const { latestActivity, activityHistory } = useProgressStore()
  const activities = mergeRecentActivity(activityHistory, latestActivity)
  const items = activities.flatMap((activity) => {
    const destination = activityPlaybackPath(activity)
    if (!destination) return []
    const id =
      activity.kind === 'playlist-video' ? `playlist:${activity.playlistId}` : `${activity.kind}:${activity.contentId}`
    return [
      {
        id,
        title: activity.kind === 'playlist-video' ? (activity.playlistName ?? activity.title) : activity.title,
        thumbnailId: activity.thumbnailId ?? activity.mediaId,
        destination: destination.replace(/^\/(ar|en|ja)\//, `/${t.__language.code}/`),
      },
    ]
  })
  const seen = new Set(items.map((item) => item.id))
  const combined = [...items, ...recent.filter((item) => !seen.has(item.id))].slice(0, 10)
  const [expanded, setExpanded] = useState(false)
  const [hiddenOverride, setHiddenOverride] = useState<boolean | null>(null)
  const persistedHidden = useSyncExternalStore(subscribeToVisibility, readHidden, serverHidden)
  const mounted = useSyncExternalStore(subscribeToVisibility, clientSnapshot, serverSnapshot)
  const hidden = hiddenOverride ?? persistedHidden
  const toggleHidden = () => {
    const next = !hidden
    try {
      localStorage.setItem(HIDDEN_KEY, String(next))
      window.dispatchEvent(new Event(VISIBILITY_EVENT))
      setHiddenOverride(null)
    } catch {
      setHiddenOverride(next)
    }
  }

  if (!mounted || combined.length === 0) return null

  const visible = expanded ? combined : combined.slice(0, COLLAPSED_COUNT)
  const hasMore = combined.length > COLLAPSED_COUNT

  return (
    <section className="mb-10" aria-label={t.continueWatchingLabel}>
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-800/80 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary shrink-0"
              aria-hidden="true"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">{t.continueWatchingLabel}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!hidden && hasMore && (
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="min-h-11 text-xs font-medium px-3 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {expanded ? t.showLessLabel : `${t.viewAllLabel} (${combined.length})`}
              </button>
            )}
            <button
              onClick={toggleHidden}
              className="min-h-11 text-xs font-medium px-3 py-1 rounded-full border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500"
              aria-label={hidden ? t.showLabel : t.hideLabel}
            >
              {hidden ? t.showLabel : t.hideLabel}
            </button>
          </div>
        </div>

        {/* Content panel — seamlessly extends below header */}
        {!hidden && (
          <div className="bg-slate-900/40 border-t border-slate-700/60 p-4">
            {visible.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {visible.map((pl) => (
                  <RecentCard key={pl.id} item={pl} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

const RecentCard = ({ item }: { item: RecentCatalogItem }) => {
  const [imageUrl, setImageUrl] = useState(videoThumbnailUrl(item.thumbnailId))

  return (
    <Link
      href={item.destination}
      className="group flex aspect-square min-w-0 flex-col overflow-hidden rounded-lg border border-slate-700 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative min-h-0 flex-1 bg-slate-800">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 190px"
          className="object-cover"
          onError={() => setImageUrl(fallbackThumbnailUrl(item.thumbnailId))}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            aria-hidden="true"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      </div>
      <p className="h-12 shrink-0 px-2 py-2 text-xs text-slate-300 group-hover:text-primary transition-colors leading-4">
        <span className="line-clamp-2" dir="auto">
          {item.title}
        </span>
      </p>
    </Link>
  )
}

export default ContinueWatching
