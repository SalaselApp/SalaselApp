export const PODCASTS_TAG = 'podcasts'

/** Stable podcast detail path. Podcast URLs never carry playlist context. */
export function podcastPath(lang: string, podcastId: string): string {
  return `/${lang}/podcast/${podcastId}`
}

/** Playback/notes destination, without playlist membership or episode numbering. */
export function podcastWatchPath(lang: string, podcastId: string): string {
  return `${podcastPath(lang, podcastId)}/watch`
}
