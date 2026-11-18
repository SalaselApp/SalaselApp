'use client'

import type { Translations } from '@/app/types'
import { usePlaylistStore, effectiveLanguage } from '@/app/store/usePlaylistStore'
import CatalogFilters from '@/app/shared/components/CatalogFilters'
import CatalogClassificationFilters from '@/app/shared/components/CatalogClassificationFilters'

export default function FilterGrid({ t }: { t: Translations }) {
  const { filters, setLanguage, setContentType, setPresentationStyle, setCategory, setClass, setBookmarkedOnly } =
    usePlaylistStore()
  return (
    <CatalogFilters
      t={t}
      language={effectiveLanguage(filters.language, t.__language.code)}
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
  )
}
