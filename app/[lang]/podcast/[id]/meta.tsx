import type { Metadata } from 'next'

import { getPodcast } from '@/app/db'
import { getTranslations } from '@/app/translate'
import { allLanguages, defaultLanguage } from '@/app/static'
import { podcastPath } from '@/app/podcasts/contract'
import { videoThumbnailUrl, youtubeWatchUrl } from '@/app/utils'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}): Promise<Metadata> {
  const { lang, id } = await params
  const [result, t] = await Promise.all([getPodcast(id), Promise.resolve(getTranslations(lang))])

  if (!result.ok || !result.podcast) {
    return { title: t.podcastUnavailableLabel, description: t.podcastUnavailableLabel }
  }

  const podcast = result.podcast
  const baseUrl = 'https://salasel.app'
  const canonicalPath = podcastPath(lang, podcast.id)
  const languagePaths = allLanguages.reduce(
    (acc, language) => {
      acc[language.code] = `${baseUrl}${podcastPath(language.code, podcast.id)}`
      return acc
    },
    { 'x-default': `${baseUrl}${podcastPath(defaultLanguage, podcast.id)}` } as Record<string, string>,
  )
  const thumbnailUrl = videoThumbnailUrl(podcast.thumbnailId)

  return {
    title: `${t.appTitle} · ${podcast.title}`,
    description: podcast.description,
    alternates: { canonical: canonicalPath, languages: languagePaths },
    openGraph: {
      title: podcast.title,
      description: podcast.description,
      url: `${baseUrl}${canonicalPath}`,
      images: [{ url: thumbnailUrl, width: 640, height: 480, alt: podcast.title }],
      type: 'video.other',
      siteName: t.appTitle,
      videos: [
        {
          url: youtubeWatchUrl(podcast.youtubeVideoId),
          secureUrl: youtubeWatchUrl(podcast.youtubeVideoId),
          type: 'text/html',
          width: 1280,
          height: 720,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: podcast.title,
      description: podcast.description,
      images: [thumbnailUrl],
    },
    keywords: [podcast.title, ...podcast.categories.map((category) => t.categories[category])],
  }
}
