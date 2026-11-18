'use client'

import type { NoteRecord, Translations } from '@/app/types'

import React, { useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { videoThumbnailUrl, fallbackThumbnailUrl, downloadTextFile, youtubeWatchUrl } from '@/app/utils'
import { buildVideoNoteMarkdown, videoNoteFileName, hasContent, MARKDOWN_MIME } from '@/app/notes'

export interface ContentCardProps {
  title: string
  videoId: string
  playlistId: string
  playlistName: string
  completed: boolean
  note?: NoteRecord
  onToggle: (videoId: string) => void
  t: Translations
  priority?: boolean
}

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  videoId,
  playlistId,
  completed,
  note,
  onToggle,
  t,
  priority = false,
}) => {
  const titleId = useId()
  const [imageUrl, setImageUrl] = useState(videoThumbnailUrl(videoId))
  const lang = t.__language.code

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggle(videoId)
  }

  const handleDownloadNote = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!note || !hasContent(note)) return
    downloadTextFile(videoNoteFileName(note.videoId), buildVideoNoteMarkdown(note), MARKDOWN_MIME)
  }

  return (
    <article
      className={`block group relative transition-colors cursor-pointer p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${completed ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-28 md:w-32 shrink-0 aspect-video bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden relative shadow-sm">
          <Image
            alt={title}
            className="w-full h-full object-cover"
            src={imageUrl}
            fill={true}
            sizes="(max-width: 768px) 112px, 128px"
            priority={priority}
            fetchPriority={priority ? 'high' : undefined}
            onError={() => setImageUrl(fallbackThumbnailUrl(videoId))}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
            <span className="material-icons-round text-white text-3xl drop-shadow-md">play_circle_outline</span>
          </div>
        </div>

        {/* Title + actions: stacked on mobile, inline on larger screens */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <h3
            id={titleId}
            title={title}
            className="text-base font-semibold text-text-light dark:text-text-dark group-hover:text-primary transition-colors line-clamp-2 sm:line-clamp-none"
          >
            {title}
          </h3>

          {/* YouTube link + download note (if any) + completed checkbox */}
          <div className="relative z-20 flex items-center gap-1 shrink-0">
            <a
              href={youtubeWatchUrl(videoId, playlistId)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={t.watchOnYoutubeLabel}
              title={t.watchOnYoutubeLabel}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-slate-600 bg-slate-800 text-slate-300 hover:border-red-500 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>YouTube</span>
              <span className="material-icons-round text-sm">open_in_new</span>
            </a>
            {note && hasContent(note) && (
              <button
                type="button"
                onClick={handleDownloadNote}
                aria-label={t.downloadNoteLabel}
                title={t.downloadNoteLabel}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-primary bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="material-icons-round text-sm">download</span>
                <span className="hidden sm:inline">{t.downloadNoteLabel}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleToggle}
              aria-label={t.completedLabel}
              aria-pressed={completed}
              className="rounded p-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div
                className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  completed ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                }`}
              >
                {completed && <span className="material-icons-round text-white text-sm">done</span>}
              </div>
            </button>
          </div>
        </div>
      </div>
      <Link
        href={`/${lang}/playlist/${playlistId}/${videoId}`}
        aria-labelledby={titleId}
        className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      />
    </article>
  )
}

export default ContentCard
