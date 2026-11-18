'use client'

import type { Podcast } from '@/app/models/podcast'
import type { LanguageCode, Translations } from '@/app/types'
import CatalogCard from '@/app/shared/components/CatalogCard'
import RecentlyWatched, { type RecentlyWatchedProps } from '@/app/[lang]/(home)/components/RecentlyWatched'
import CatalogFilters from '@/app/shared/components/CatalogFilters'
import CatalogClassificationFilters from '@/app/shared/components/CatalogClassificationFilters'
import BookmarkButton from '@/app/shared/components/BookmarkButton'
import { effectiveLanguage } from '@/app/store/usePlaylistStore'
import { usePodcastStore } from '@/app/store/usePodcastStore'
import { useBookmarkStore } from '@/app/store/useBookmarkStore'

export default function PodcastCatalog({
  podcasts,
  recentPlaylists,
  lang,
  t,
  error,
  searchQuery = '',
}: {
  podcasts: Podcast[]
  recentPlaylists: RecentlyWatchedProps['playlists']
  lang: LanguageCode
  t: Translations
  error?: string
  searchQuery?: string
}) {
  const { filters, setLanguage, setCategory, setBookmarkedOnly, setContentType, setPresentationStyle, setClass } =
    usePodcastStore()
  const bookmarks = useBookmarkStore((state) => state.bookmarkedPodcasts)
  const language = effectiveLanguage(filters.language, lang)
  const visible = podcasts.filter(
    (podcast) =>
      (!searchQuery || `${podcast.title} ${podcast.description}`.toLocaleLowerCase().includes(searchQuery)) &&
      (language === 'all' || podcast.language === language) &&
      (filters.category === 'all' || podcast.categories.includes(filters.category)) &&
      (!filters.bookmarkedOnly || bookmarks.has(podcast.id)) &&
      (filters.contentType === 'all' || podcast.type === filters.contentType) &&
      (filters.presentationStyle === 'all' || podcast.style === filters.presentationStyle) &&
      (filters.class === 'all' || podcast.classes.includes(filters.class)),
  )

  if (error)
    return (
      <section role="alert" className="py-16 text-center text-slate-300">
        <p>{t.podcastCatalogErrorLabel}</p>
        <a
          className="mt-3 inline-flex min-h-11 items-center rounded text-teal-400 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href={`/${lang}/podcasts`}
        >
          {t.tryAgainLabel}
        </a>
      </section>
    )

  return (
    <section>
      <div className="relative mb-12">
        <CatalogFilters
          t={t}
          language={language}
          category={filters.category}
          bookmarkedOnly={filters.bookmarkedOnly}
          onLanguageChange={setLanguage}
          onCategoryChange={setCategory}
          onBookmarkedChange={setBookmarkedOnly}
        >
          <CatalogClassificationFilters
            t={t}
            filters={filters}
            setContentType={setContentType}
            setPresentationStyle={setPresentationStyle}
            setClass={setClass}
          />
        </CatalogFilters>
      </div>
      <RecentlyWatched playlists={recentPlaylists} lang={lang} t={t} />
      {visible.length === 0 ? (
        <p role="status" className="py-12 text-center text-slate-400">
          {podcasts.length === 0 && !searchQuery ? t.noPodcastsLabel : t.noPodcastMatchesLabel}
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((podcast, index) => (
            <PodcastCard key={podcast.id} podcast={podcast} lang={lang} t={t} priority={index < 6} />
          ))}
        </div>
      )}
    </section>
  )
}

function PodcastCard({
  podcast,
  lang,
  t,
  priority,
}: {
  podcast: Podcast
  lang: LanguageCode
  t: Translations
  priority: boolean
}) {
  return (
    <CatalogCard
      href={`/${lang}/podcast/${podcast.id}`}
      title={podcast.title}
      description={podcast.description}
      thumbnailId={podcast.thumbnailId}
      priority={priority}
      thumbnailOverlay={
        <div className="pointer-events-auto absolute top-2 end-2">
          <BookmarkButton contentId={podcast.id} kind="podcast" t={t} />
        </div>
      }
    />
  )
}
