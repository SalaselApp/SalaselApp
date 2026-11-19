import type { HomeParams } from '@/app/[lang]/(home)/params'

import React from 'react'
import PlaylistGrid from '@/app/[lang]/(home)/components/PlaylistGrid'
import FilterGrid from '@/app/[lang]/(home)/components/FilterGrid'
import RecentlyWatched from '@/app/[lang]/(home)/components/RecentlyWatched'
import CatalogPage from '@/app/shared/components/CatalogPage'
import { initialCatalogPage } from '@/app/catalog/server'
import type { CalculatedPlaylist } from '@/app/types'
import { getTranslations } from '@/app/translate'

export { generateStaticParams } from '@/app/[lang]/(home)/params'
export { generateMetadata } from '@/app/[lang]/(home)/meta'

export interface HomeProps {
  params: Promise<HomeParams>
  searchParams: Promise<{ q?: string }>
}

const Home: React.FC<HomeProps> = async ({ params, searchParams }) => {
  const { lang } = await params
  const t = getTranslations(lang)

  // Apply search filter if query exists
  const resolvedSearchParams = await searchParams
  const searchQuery = (resolvedSearchParams.q || '').trim().slice(0, 200)
  const initial = await initialCatalogPage<CalculatedPlaylist>({
    kind: 'series',
    language: t.__language.code,
    q: searchQuery,
  })

  return (
    <CatalogPage title={t.seriesNavLabel} t={t}>
      <div className="relative mb-12">
        <FilterGrid t={t} />
      </div>
      <RecentlyWatched lang={t.__language.code} t={t} />
      <PlaylistGrid initial={initial} searchQuery={searchQuery} lang={t.__language.code} t={t} />
    </CatalogPage>
  )
}

export default Home
