import { notFound } from 'next/navigation'

import StandaloneWatch from '@/app/[lang]/video/[id]/components/StandaloneWatch'
import { getStandaloneVideo } from '@/app/db'
import { getTranslations } from '@/app/translate'

export const dynamic = 'force-dynamic'

/** Canonical fallback for activity records without playlist context. */
export default async function StandaloneVideoPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  const video = await getStandaloneVideo(id)
  if (!video) notFound()
  return <StandaloneWatch video={{ id: video.id, title: video.title }} t={getTranslations(lang)} />
}
