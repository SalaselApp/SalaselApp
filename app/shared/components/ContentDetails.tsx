'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useState, type ReactNode } from 'react'
import type { Categories, Classes, ContentTypes, PresentationStyles, Translations } from '@/app/types'
import { fallbackThumbnailUrl, videoThumbnailUrl, formatDate, formatTime } from '@/app/utils'
import BookmarkButton from './BookmarkButton'

interface DetailsContent {
  id: string
  title: string
  description: string
  thumbnailId: string
  participants: string[]
  duration: number
  type: ContentTypes | null
  style: PresentationStyles | null
  categories: Categories[]
  classes: Classes[]
}

export default function ContentDetails({
  content,
  kind,
  t,
  playHref,
  collection,
  descriptionSuffix,
}: {
  content: DetailsContent
  kind: 'series' | 'podcast'
  t: Translations
  playHref?: string
  collection?: { videoCount: number; startDate: number; endDate: number }
  descriptionSuffix?: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const [imageUrl, setImageUrl] = useState(videoThumbnailUrl(content.thumbnailId))
  const headingId = useId()
  const longDescription = content.description.length > 100
  const description =
    longDescription && !expanded ? `${content.description.slice(0, 100).trimEnd()}…` : content.description
  const metadata = [
    collection ? { label: t.videosLabel, value: String(collection.videoCount), icon: 'ondemand_video' } : null,
    content.duration > 0 ? { label: t.durationLabel, value: formatTime(content.duration), icon: 'schedule' } : null,
    content.type !== null ? { label: t.typeLabel, value: t.contents[content.type], icon: 'category' } : null,
    content.style !== null ? { label: t.styleLabel, value: t.presentations[content.style], icon: 'mic' } : null,
    content.categories.length
      ? {
          label: t.categoriesLabel,
          value: content.categories.map((value) => t.categories[value]).join(`${t.__language.comma} `),
          icon: 'category',
        }
      : null,
    content.classes.length
      ? {
          label: t.classesLabel,
          value: content.classes.map((value) => t.classes[value]).join(`${t.__language.comma} `),
          icon: 'group',
        }
      : null,
    collection ? { label: t.startDateLabel, value: formatDate(collection.startDate), icon: 'event' } : null,
    collection ? { label: t.endDateLabel, value: formatDate(collection.endDate), icon: 'event_available' } : null,
  ].filter((item) => item !== null)
  const artwork = (
    <>
      <Image
        src={imageUrl}
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
        onError={() => setImageUrl(fallbackThumbnailUrl(content.thumbnailId))}
      />
      {playHref && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10">
          <span className="flex size-16 items-center justify-center rounded-full bg-slate-900/80 text-white">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      )}
    </>
  )
  return (
    <article
      aria-labelledby={headingId}
      className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 shadow-md"
    >
      <div className="flex flex-col lg:flex-row lg:items-center">
        <div className="min-w-0 space-y-4 p-6 lg:w-1/2">
          <h1 id={headingId} dir="auto" className="text-3xl font-extrabold leading-snug tracking-tight text-white">
            {content.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {playHref && (
              <Link
                href={playHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary-hover px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t.watchPodcastLabel}
              </Link>
            )}
            <BookmarkButton contentId={content.id} kind={kind} t={t} withLabel />
          </div>
          {(description || descriptionSuffix) && (
            <div>
              <p dir="auto" className="whitespace-pre-wrap break-words text-base leading-7 text-slate-300">
                {description}
                {descriptionSuffix}
              </p>
              {longDescription && (
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                  className="mt-1 min-h-11 cursor-pointer rounded text-sm font-medium text-teal-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {expanded ? t.readLessLabel : t.readMoreLabel}
                </button>
              )}
            </div>
          )}
          {content.participants.length > 0 && (
            <p dir="auto" className="text-sm font-medium text-slate-300">
              {t.withParticipation} {content.participants.join(`${t.__language.comma} `)}
            </p>
          )}
          {metadata.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-700 pt-4">
              {metadata.map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <span aria-hidden="true" className="material-icons-round text-base text-teal-400">
                      {item.icon}
                    </span>
                    {item.label}
                  </dt>
                  <dd className="mt-1 break-words ps-6 text-xs text-slate-400">{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {playHref ? (
          <Link
            href={playHref}
            aria-label={t.watchPodcastLabel}
            className="group relative block aspect-video w-full shrink-0 bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary lg:w-1/2"
          >
            {artwork}
          </Link>
        ) : (
          <div className="relative aspect-video w-full shrink-0 bg-slate-800 lg:w-1/2">{artwork}</div>
        )}
      </div>
    </article>
  )
}
