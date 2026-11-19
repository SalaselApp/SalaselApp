import type { FeedbackType } from '@/app/types'

// Match the playlist/video identities accepted by the Admin import workflows.
const PLAYLIST_ID = /^(PL|FL|UU|LL|RD|OL)[a-zA-Z0-9_-]{11,41}$/
const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com'])

export function feedbackRequiresLink(type: FeedbackType): boolean {
  return type === 'playlist' || type === 'podcast'
}

/** A public suggestion is a supported YouTube URL, rather than an ID or prose. */
export function isSupportedSuggestionLink(type: FeedbackType, input: string): boolean {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false

  const shortVideo = url.hostname === 'youtu.be' && VIDEO_ID.test(url.pathname.slice(1))
  const youtube = YOUTUBE_HOSTS.has(url.hostname)
  if (type === 'playlist') {
    const playlistId = url.searchParams.get('list') ?? ''
    return (
      PLAYLIST_ID.test(playlistId) &&
      (shortVideo || (youtube && (url.pathname === '/playlist' || url.pathname === '/watch')))
    )
  }
  if (type === 'podcast') {
    return shortVideo || (youtube && url.pathname === '/watch' && VIDEO_ID.test(url.searchParams.get('v') ?? ''))
  }
  return false
}
