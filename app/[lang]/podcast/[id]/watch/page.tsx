import Link from 'next/link'
import PodcastWatch from '../components/PodcastWatch'
import { getPodcast } from '@/app/db'
import { getTranslations } from '@/app/translate'

export { generateMetadata } from '../meta'
export const dynamic = 'force-dynamic'

export default async function PodcastWatchPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  const t = getTranslations(lang)
  const result = await getPodcast(id)
  if (!result.ok || !result.podcast)
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 pt-24 text-center">
        <h1 className="text-xl font-bold text-white">{t.podcastUnavailableLabel}</h1>
        <Link
          href={`/${t.__language.code}/podcasts`}
          className="mt-4 inline-flex min-h-11 items-center rounded text-sm text-teal-400 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t.podcastBackToCatalogLabel}
        </Link>
      </main>
    )
  return <PodcastWatch podcast={result.podcast} t={t} />
}
