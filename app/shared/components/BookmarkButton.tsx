'use client'

import { useSyncExternalStore } from 'react'
import type { Translations } from '@/app/types'
import { useBookmarkStore } from '@/app/store/useBookmarkStore'

export interface BookmarkButtonProps {
  contentId: string
  kind: 'series' | 'podcast'
  withLabel?: boolean
  t: Translations
}

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

const BookmarkButton = ({ contentId, kind, t, withLabel = false }: BookmarkButtonProps) => {
  const isClient = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  const bookmarks = useBookmarkStore((state) =>
    kind === 'podcast' ? state.bookmarkedPodcasts : state.bookmarkedPlaylists,
  )
  const toggleBookmark = useBookmarkStore((state) =>
    kind === 'podcast' ? state.togglePodcastBookmark : state.toggleBookmark,
  )
  const bookmarked = isClient && bookmarks.has(contentId)

  return (
    <button
      type="button"
      aria-pressed={bookmarked}
      onClick={(e) => {
        e.preventDefault() // prevent the card Link from firing
        toggleBookmark(contentId)
      }}
      aria-label={bookmarked ? t.removeBookmarkLabel : t.bookmarkLabel}
      className={`${withLabel ? 'inline-flex min-h-11 items-center gap-2 px-3 py-2 text-sm' : 'p-2.5'} rounded-full border border-slate-700 bg-slate-900/70 text-slate-300 transition-colors hover:border-primary hover:text-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {bookmarked ? (
        // Filled bookmark
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-primary"
          aria-hidden="true"
        >
          <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
        </svg>
      ) : (
        // Outlined bookmark
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {withLabel && <span>{bookmarked ? t.removeBookmarkLabel : t.bookmarkLabel}</span>}
    </button>
  )
}

export default BookmarkButton
