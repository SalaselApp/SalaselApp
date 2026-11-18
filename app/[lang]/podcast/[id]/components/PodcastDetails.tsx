import Link from 'next/link'
import type { Podcast } from '@/app/models/podcast'
import type { Translations } from '@/app/types'
import ContentDetails from '@/app/shared/components/ContentDetails'
import { podcastWatchPath } from '@/app/podcasts/contract'

export default function PodcastDetails({ podcast, t }: { podcast: Podcast; t: Translations }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <Link
        href={`/${t.__language.code}/podcasts`}
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
        {t.podcastBackToCatalogLabel}
      </Link>
      <ContentDetails
        content={podcast}
        kind="podcast"
        t={t}
        playHref={podcastWatchPath(t.__language.code, podcast.id)}
      />
    </main>
  )
}
