'use client'

import { useId, useState, type ReactNode } from 'react'
import type { Categories, Languages, Translations } from '@/app/types'
import { allLanguages } from '@/app/static'
import CategoryFilterPills, { FilterPill } from './CategoryFilterPills'
import FilterSelect from './FilterSelect'

interface CatalogFiltersProps {
  t: Translations
  language: Languages | 'all'
  category: Categories | 'all'
  bookmarkedOnly: boolean
  onLanguageChange: (value: Languages | 'all') => void
  onCategoryChange: (value: Categories | 'all') => void
  onBookmarkedChange: (value: boolean) => void
  children?: ReactNode
}

/** The same quick filters, saved view and progressive disclosure for both catalogues. */
export default function CatalogFilters({
  t,
  language,
  category,
  bookmarkedOnly,
  onLanguageChange,
  onCategoryChange,
  onBookmarkedChange,
  children,
}: CatalogFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const advancedId = useId()

  return (
    <div className="flex flex-col items-center gap-4">
      <CategoryFilterPills
        t={t}
        selected={bookmarkedOnly ? null : category}
        onChange={(value) => {
          onCategoryChange(value)
          onBookmarkedChange(false)
        }}
      >
        <FilterPill
          active={bookmarkedOnly}
          onClick={() => {
            onCategoryChange('all')
            onBookmarkedChange(true)
          }}
        >
          <span className="flex items-center gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill={bookmarkedOnly ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            {t.filterBookmarksLabel}
          </span>
        </FilterPill>
      </CategoryFilterPills>
      <button
        type="button"
        onClick={() => setShowAdvanced((previous) => !previous)}
        className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={showAdvanced}
        aria-controls={advancedId}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform motion-reduce:transition-none ${showAdvanced ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        {t.filterAdvancedLabel}
      </button>
      <div id={advancedId} hidden={!showAdvanced}>
        {showAdvanced && (
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <FilterSelect
              id="language-filter"
              label={t.filterLanguageLabel}
              value={language}
              onChange={(value) => onLanguageChange(value as Languages | 'all')}
              options={allLanguages.map((item) => ({ key: item.code, value: item.name }))}
              showAllOption
              allOptionLabel={t.filterAllOption}
            />
            <FilterSelect
              id="category-filter"
              label={t.filterCategoryLabel}
              value={category}
              onChange={(value) => onCategoryChange(value === 'all' ? 'all' : (Number(value) as Categories))}
              options={Object.entries(t.categories).map(([key, value]) => ({ key, value }))}
              showAllOption
              allOptionLabel={t.filterAllOption}
            />
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
