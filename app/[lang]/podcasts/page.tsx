import PodcastCatalog from '@/app/[lang]/podcasts/components/PodcastCatalog'
import CatalogPage from '@/app/shared/components/CatalogPage'
import { initialCatalogPage } from '@/app/catalog/server'
import type { Podcast } from '@/app/models/podcast'
import { getTranslations } from '@/app/translate'

export const dynamic = 'force-dynamic'

export default async function PodcastsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { lang } = await params
  const t = getTranslations(lang)
  const query = await searchParams
  const search = query.q?.trim().slice(0, 200) ?? ''
  const initial = await initialCatalogPage<Podcast>({ kind: 'podcasts', language: t.__language.code, q: search })

  return (
    <CatalogPage title={t.podcastsHeading} t={t} placeholder={t.searchPodcastsPlaceholder}>
      <PodcastCatalog initial={initial} lang={t.__language.code} t={t} searchQuery={search} />
    </CatalogPage>
  )
}
