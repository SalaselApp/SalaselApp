import type { PlaylistState } from '@/app/store/usePlaylistStore'
import type { Translations } from '@/app/types'
import FilterSelect from './FilterSelect'

type Props = Pick<PlaylistState, 'filters' | 'setContentType' | 'setPresentationStyle' | 'setClass'> & {
  t: Translations
}

export default function CatalogClassificationFilters({
  t,
  filters,
  setContentType,
  setPresentationStyle,
  setClass,
}: Props) {
  return (
    <>
      <FilterSelect
        id="content-type-filter"
        label={t.filterContentTypeLabel}
        value={filters.contentType}
        onChange={(value) => setContentType(value === 'all' ? 'all' : Number(value))}
        options={Object.entries(t.contents).map(([key, value]) => ({ key, value }))}
        showAllOption
        allOptionLabel={t.filterAllOption}
      />
      <FilterSelect
        id="presentation-style-filter"
        label={t.filterPresentationStyleLabel}
        value={filters.presentationStyle}
        onChange={(value) => setPresentationStyle(value === 'all' ? 'all' : Number(value))}
        options={Object.entries(t.presentations).map(([key, value]) => ({ key, value }))}
        showAllOption
        allOptionLabel={t.filterAllOption}
      />
      <FilterSelect
        id="class-filter"
        label={t.filterClassLabel}
        value={filters.class}
        onChange={(value) => setClass(value === 'all' ? 'all' : Number(value))}
        options={Object.entries(t.classes).map(([key, value]) => ({ key, value }))}
        showAllOption
        allOptionLabel={t.filterAllOption}
      />
    </>
  )
}
