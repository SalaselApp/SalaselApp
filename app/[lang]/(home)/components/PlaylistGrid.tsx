'use client'

import type { CalculatedPlaylist, LanguageCode, Translations } from '@/app/types'
import PlaylistCard from '@/app/[lang]/(home)/components/PlaylistCard'
import { usePlaylistStore, effectiveLanguage } from '@/app/store/usePlaylistStore'
import { useBookmarkStore } from '@/app/store/useBookmarkStore'
import { useCatalogPage, type InitialCatalogPage } from '@/app/catalog/useCatalogPage'
import LoadMore from '@/app/catalog/LoadMore'

export interface PlaylistGridProps {
  initial: InitialCatalogPage<CalculatedPlaylist>
  searchQuery: string
  lang: LanguageCode
  t: Translations
}
export default function PlaylistGrid({ initial, searchQuery, lang, t }: PlaylistGridProps) {
  const filters = usePlaylistStore((state) => state.filters)
  const bookmarks = useBookmarkStore((state) => state.bookmarkedPlaylists)
  const page = useCatalogPage<CalculatedPlaylist>(
    {
      kind: 'series',
      language: effectiveLanguage(filters.language, lang),
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
    <section aria-busy={page.loading}>
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {page.items.map((playlist, index) => (
          <PlaylistCard key={playlist.id} playlist={playlist} lang={lang} priority={index < 6} t={t} />
        ))}
      </div>
      <LoadMore {...page} hasMore={!!page.nextCursor} count={page.items.length} onLoad={page.loadMore} lang={lang} />
    </section>
  )
}
