import Link from 'next/link'

import PodcastDetails from '@/app/[lang]/podcast/[id]/components/PodcastDetails'
import { getPodcast } from '@/app/db'
import { getTranslations } from '@/app/translate'

export { generateMetadata } from '@/app/[lang]/podcast/[id]/meta'

// Do not statically cache a canonical playback response: withdrawal must be
// checked against fresh public RLS visibility on every request.
export const dynamic = 'force-dynamic'

export default async function PodcastPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  const [result, t] = await Promise.all([getPodcast(id), Promise.resolve(getTranslations(lang))])

  if (!result.ok || !result.podcast) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-white">{t.podcastUnavailableLabel}</h1>
        <Link
          href={`/${t.__language.code}/podcasts`}
          className="mt-4 inline-flex min-h-11 items-center rounded text-sm font-medium text-teal-400 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t.podcastBackToCatalogLabel}
        </Link>
      </main>
    )
  }

  return <PodcastDetails podcast={result.podcast} t={t} />
}
