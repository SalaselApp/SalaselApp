import PodcastCatalog from '@/app/[lang]/podcasts/components/PodcastCatalog'
import CatalogPage from '@/app/shared/components/CatalogPage'
import { getPodcasts, getPlaylists } from '@/app/db'
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
  const [result, query, playlists] = await Promise.all([getPodcasts(), searchParams, getPlaylists()])
  const search = query.q?.trim().toLocaleLowerCase() ?? ''
  const podcasts = result.ok ? Object.values(result.podcasts) : []

  return (
    <CatalogPage title={t.podcastsHeading} t={t} placeholder={t.searchPodcastsPlaceholder}>
      <PodcastCatalog
        podcasts={podcasts}
        recentPlaylists={Object.fromEntries(
          Object.values(playlists).map(({ id, name, thumbnailId }) => [id, { id, name, thumbnailId }]),
        )}
        lang={t.__language.code}
        t={t}
        error={result.ok ? undefined : result.error}
        searchQuery={search}
      />
    </CatalogPage>
  )
}
