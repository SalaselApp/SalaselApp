import type { HomeParams } from '@/app/[lang]/(home)/params'

import React from 'react'
import PlaylistGrid from '@/app/[lang]/(home)/components/PlaylistGrid'
import FilterGrid from '@/app/[lang]/(home)/components/FilterGrid'
import RecentlyWatched from '@/app/[lang]/(home)/components/RecentlyWatched'
import CatalogPage from '@/app/shared/components/CatalogPage'
import { getPlaylists, searchPlaylists } from '@/app/db'
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
  const playlists = await getPlaylists()

  // Apply search filter if query exists
  const resolvedSearchParams = await searchParams
  const searchQuery = resolvedSearchParams.q || ''
  const filteredPlaylists = searchPlaylists(playlists, searchQuery)

  return (
    <CatalogPage title={t.seriesNavLabel} t={t}>
      <div className="relative mb-12">
        <FilterGrid t={t} />
      </div>
      <RecentlyWatched playlists={playlists} lang={t.__language.code} t={t} />
      <PlaylistGrid playlists={filteredPlaylists} lang={t.__language.code} t={t} />
    </CatalogPage>
  )
}

export default Home
