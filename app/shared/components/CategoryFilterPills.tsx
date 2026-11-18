'use client'

import type { ReactNode } from 'react'
import type { Categories, Translations } from '@/app/types'

export function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 cursor-pointer rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        active
          ? 'border-primary-hover bg-primary-hover text-white'
          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

export default function CategoryFilterPills({
  t,
  selected,
  onChange,
  children,
}: {
  t: Translations
  selected: Categories | 'all' | null
  onChange: (category: Categories | 'all') => void
  children?: ReactNode
}) {
  return (
    <div role="group" aria-label={t.filterCategoryLabel} className="flex flex-wrap justify-center gap-2">
      <FilterPill active={selected === 'all'} onClick={() => onChange('all')}>
        {t.filterAllOption}
      </FilterPill>
      {Object.entries(t.categories).map(([key, label]) => {
        const category = Number(key) as Categories
        return (
          <FilterPill key={key} active={selected === category} onClick={() => onChange(category)}>
            {label}
          </FilterPill>
        )
      })}
      {children}
    </div>
  )
}
