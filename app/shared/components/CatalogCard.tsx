'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useState, type ReactNode } from 'react'

import { fallbackThumbnailUrl, videoThumbnailUrl } from '@/app/utils'

interface CatalogCardProps {
  href: string
  title: string
  description: string
  thumbnailId: string
  priority?: boolean
  thumbnailOverlay?: ReactNode
}

/** Shared series/podcast presentation; content-specific controls stay with callers. */
export default function CatalogCard({
  href,
  title,
  description,
  thumbnailId,
  priority = false,
  thumbnailOverlay,
}: CatalogCardProps) {
  const titleId = useId()
  const [imageUrl, setImageUrl] = useState(videoThumbnailUrl(thumbnailId))

  return (
    <article className="group relative h-full min-w-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50 shadow-md transition-shadow duration-300 hover:border-primary hover:shadow-xl motion-reduce:transition-none">
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
          priority={priority}
          fetchPriority={priority ? 'high' : undefined}
          onError={() => setImageUrl(fallbackThumbnailUrl(thumbnailId))}
        />
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10 motion-reduce:transition-none" />
        <div className="pointer-events-none absolute inset-0 z-20">{thumbnailOverlay}</div>
      </div>
      <div className="p-4">
        <h2
          id={titleId}
          dir="auto"
          className="min-h-14 line-clamp-2 text-lg font-semibold text-white transition-colors group-hover:text-primary"
        >
          {title}
        </h2>
        <p dir="auto" className="mt-1 min-h-[3.75rem] line-clamp-3 text-sm text-slate-400">
          {description}
        </p>
      </div>
      <Link
        href={href}
        aria-labelledby={titleId}
        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      />
    </article>
  )
}
