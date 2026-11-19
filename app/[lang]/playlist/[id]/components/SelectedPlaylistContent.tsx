'use client'

import type { CalculatedPlaylist, CalculatedVideo, Translations } from '@/app/types'

import React, { useSyncExternalStore, ReactNode } from 'react'
import ContentCard from '@/app/[lang]/playlist/[id]/components/ContentCard'
import { useProgressStore } from '@/app/store/useProgressStore'
import { useCatalogPage, type InitialCatalogPage } from '@/app/catalog/useCatalogPage'
import LoadMore from '@/app/catalog/LoadMore'
import { useNotesStore } from '@/app/store/useNotesStore'
import { downloadTextFile } from '@/app/utils'
import { buildPlaylistNotesMarkdown, playlistNotesFileName, hasContent, MARKDOWN_MIME } from '@/app/notes'

export type SelectedPlaylistContentPlaylist = Pick<CalculatedPlaylist, 'id' | 'name' | 'videoCount'>
export type SelectedPlaylistContentVideo = Pick<CalculatedVideo, 'id' | 'title' | 'playlistId'>
export interface SelectedPlaylistContentProps {
  playlist: SelectedPlaylistContentPlaylist
  initial: InitialCatalogPage<CalculatedVideo>
  t: Translations
}

const subscribeToHydration = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

const SelectedPlaylistContent: React.FC<SelectedPlaylistContentProps> = ({ playlist, initial, t }) => {
  const page = useCatalogPage<CalculatedVideo>(
    { kind: 'lessons', language: 'all', q: '', playlistId: playlist.id },
    initial,
  )
  const { completedVideos, toggleVideoCompleted } = useProgressStore()
  const notes = useNotesStore((s) => s.notes)
  const isClient = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot)

  const totalVideos = Math.max(playlist.videoCount, page.items.length)
  const completedCount = isClient ? (completedVideos[playlist.id]?.size ?? 0) : 0
  const progressPercent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0

  // Non-empty notes belonging to videos in this playlist, newest first.
  const playlistNotes = isClient
    ? Object.values(notes)
        .filter((n) => n.playlistId === playlist.id && hasContent(n))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    : []
  const hasNotes = playlistNotes.length > 0

  const handleDownloadPlaylistNotes = () => {
    if (!hasNotes) return
    downloadTextFile(
      playlistNotesFileName(playlist.id),
      buildPlaylistNotesMarkdown(playlist.id, playlistNotes),
      MARKDOWN_MIME,
    )
  }

  if (!playlist) {
    return <div>{t.loading}</div>
  }

  const cards: ReactNode[] = []
  for (const v of page.items) {
    const isPriority = cards.length < 4
    const completed = isClient ? (completedVideos[playlist.id]?.has(v.id) ?? false) : false
    const note = isClient ? notes[v.id] : undefined

    cards.push(
      <ContentCard
        key={v.id}
        title={v.title}
        videoId={v.id}
        playlistId={v.playlistId}
        playlistName={playlist.name}
        completed={completed}
        note={note}
        onToggle={(videoId) => toggleVideoCompleted(playlist.id, videoId)}
        t={t}
        priority={isPriority}
      />,
    )
  }

  return (
    <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with title and progress */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xl font-bold text-text-light dark:text-text-dark">{t.playlistContents}</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadPlaylistNotes}
              disabled={!hasNotes}
              aria-label={hasNotes ? t.downloadPlaylistNotesLabel : t.noNotesLabel}
              title={hasNotes ? t.downloadPlaylistNotesLabel : t.noNotesLabel}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                hasNotes
                  ? 'bg-primary border-primary text-white hover:bg-primary/90 cursor-pointer'
                  : 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span className="material-icons-round text-sm">download</span>
              <span>{hasNotes ? t.downloadPlaylistNotesLabel : t.noNotesLabel}</span>
            </button>
            <span className="text-sm font-medium text-muted-light dark:text-muted-dark whitespace-nowrap">
              {completedCount} / {totalVideos}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700" aria-busy={page.loading}>
        {cards}
      </div>
      <LoadMore
        {...page}
        hasMore={!!page.nextCursor}
        count={page.items.length}
        onLoad={page.loadMore}
        lang={t.__language.code}
      />
    </div>
  )
}

export default SelectedPlaylistContent
