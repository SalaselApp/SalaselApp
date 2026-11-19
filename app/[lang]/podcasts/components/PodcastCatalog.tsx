'use client'

import type { Podcast } from '@/app/models/podcast'
import type { LanguageCode, Translations } from '@/app/types'
import CatalogCard from '@/app/shared/components/CatalogCard'
import RecentlyWatched from '@/app/[lang]/(home)/components/RecentlyWatched'
import CatalogFilters from '@/app/shared/components/CatalogFilters'
import CatalogClassificationFilters from '@/app/shared/components/CatalogClassificationFilters'
import BookmarkButton from '@/app/shared/components/BookmarkButton'
import { effectiveLanguage } from '@/app/store/usePlaylistStore'
import { usePodcastStore } from '@/app/store/usePodcastStore'
import { useBookmarkStore } from '@/app/store/useBookmarkStore'
import { useCatalogPage, type InitialCatalogPage } from '@/app/catalog/useCatalogPage'
import LoadMore from '@/app/catalog/LoadMore'

export default function PodcastCatalog({
  initial,
  lang,
  t,
  searchQuery = '',
}: {
  initial: InitialCatalogPage<Podcast>
  lang: LanguageCode
  t: Translations
  searchQuery?: string
}) {
  const { filters, setLanguage, setCategory, setBookmarkedOnly, setContentType, setPresentationStyle, setClass } =
    usePodcastStore()
  const bookmarks = useBookmarkStore((state) => state.bookmarkedPodcasts)
  const language = effectiveLanguage(filters.language, lang)
  const page = useCatalogPage<Podcast>(
    {
      kind: 'podcasts',
      language,
      q: searchQuery,
      category: filters.category === 'all' ? undefined : filters.category,
      contentType: filters.contentType === 'all' ? undefined : filters.contentType,
      presentationStyle: filters.presentationStyle === 'all' ? undefined : filters.presentationStyle,
      class: filters.class === 'all' ? undefined : filters.class,
      ...(filters.bookmarkedOnly ? { ids: [...bookmarks].sort() } : {}),
    },
    initial,
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
      <RecentlyWatched lang={lang} t={t} />
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-busy={page.loading}>
        {page.items.map((podcast, index) => (
          <PodcastCard key={podcast.id} podcast={podcast} lang={lang} t={t} priority={index < 6} />
        ))}
      </div>
      <LoadMore {...page} hasMore={!!page.nextCursor} count={page.items.length} onLoad={page.loadMore} lang={lang} />
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
