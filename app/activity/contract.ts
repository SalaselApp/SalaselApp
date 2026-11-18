export const ACTIVITY_STORAGE_VERSION = 1 as const
export const MAX_FUTURE_ACTIVITY_MS = 5 * 60 * 1000

export type ActivityKind = 'podcast' | 'video' | 'playlist-video'

/** Versioned, local-only app/extension activity handoff. */
export interface ActivityRecord {
  version: typeof ACTIVITY_STORAGE_VERSION
  kind: ActivityKind
  /** App content identity: pod_* for podcasts, video ID otherwise. */
  contentId: string
  /** YouTube media ID. */
  mediaId: string
  /** Present only for playlist-video activity. */
  playlistId?: string
  playlistName?: string
  title: string
  thumbnailId?: string
  destination: string
  /** Source player event time, never extension receipt time. */
  playedAt: number
}

const ACTIVITY_LOCALES = ['ar', 'en', 'ja'] as const
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const PODCAST_ID = /^pod_[A-Za-z0-9_-]+$/
const PLAYLIST_ID = /^[A-Za-z0-9_-]+$/

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeLegacyTimestamp(value: unknown, now: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= now + MAX_FUTURE_ACTIVITY_MS
}

function isValidLegacyThumbnail(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && YOUTUBE_ID.test(value))
}

function expectedDestination(
  record: Pick<ActivityRecord, 'kind' | 'contentId' | 'mediaId' | 'playlistId'>,
): string | null {
  if (!YOUTUBE_ID.test(record.mediaId)) return null
  if (record.kind === 'podcast' && PODCAST_ID.test(record.contentId)) return `/podcast/${record.contentId}/watch`
  if (record.kind === 'video' && record.contentId === record.mediaId) return `/video/${record.mediaId}`
  if (
    record.kind === 'playlist-video' &&
    record.contentId === record.mediaId &&
    record.playlistId &&
    PLAYLIST_ID.test(record.playlistId)
  )
    return `/playlist/${record.playlistId}/${record.mediaId}`
  return null
}

/** Rejects path escapes and requires the route to exactly match activity identity. */
export function isActivityRecord(value: unknown): value is ActivityRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<ActivityRecord>
  if (
    record.version !== ACTIVITY_STORAGE_VERSION ||
    (record.kind !== 'podcast' && record.kind !== 'video' && record.kind !== 'playlist-video') ||
    !isNonEmptyString(record.contentId) ||
    !isNonEmptyString(record.mediaId) ||
    !isNonEmptyString(record.title) ||
    !isNonEmptyString(record.destination) ||
    typeof record.playedAt !== 'number' ||
    !Number.isFinite(record.playedAt) ||
    record.playedAt < 0 ||
    (record.thumbnailId !== undefined &&
      (!isNonEmptyString(record.thumbnailId) || !YOUTUBE_ID.test(record.thumbnailId)))
  )
    return false

  const destination = expectedDestination(record as ActivityRecord)
  if (!destination) return false
  const locale = record.destination.split('/')[1]
  return Boolean(
    locale &&
    ACTIVITY_LOCALES.includes(locale as (typeof ACTIVITY_LOCALES)[number]) &&
    (record.destination === `/${locale}${destination}` ||
      (record.kind === 'podcast' && record.destination === `/${locale}/podcast/${record.contentId}`)),
  )
}

/** Old saved podcast destinations remain valid but resume directly at the player. */
export function activityPlaybackPath(record: ActivityRecord): string | null {
  if (!isActivityRecord(record)) return null
  return `/${record.destination.split('/')[1]}${expectedDestination(record)}`
}

/**
 * Newer source playback wins. Equal timestamps preserve first accepted record;
 * identical events are duplicate no-ops. Reject clocks more than five minutes
 * ahead so malformed or future extension data cannot suppress later playback.
 */
export function mergeActivity(current: ActivityRecord | null, candidate: unknown, now: number): ActivityRecord | null {
  const validCurrent = isActivityRecord(current) && current.playedAt <= now + MAX_FUTURE_ACTIVITY_MS ? current : null
  if (!isActivityRecord(candidate) || candidate.playedAt > now + MAX_FUTURE_ACTIVITY_MS) return validCurrent
  if (!validCurrent || candidate.playedAt > validCurrent.playedAt) return candidate
  return validCurrent
}

/** One recent tile per series or standalone item, ordered by actual playback. */
export function mergeRecentActivity(history: unknown, candidate: unknown, now = Date.now()): ActivityRecord[] {
  const records = [...(Array.isArray(history) ? history : []), candidate]
    .filter(
      (record): record is ActivityRecord => isActivityRecord(record) && record.playedAt <= now + MAX_FUTURE_ACTIVITY_MS,
    )
    .sort((a, b) => b.playedAt - a.playedAt)
  const seen = new Set<string>()
  return records
    .filter((record) => {
      const key =
        record.kind === 'playlist-video' ? `playlist:${record.playlistId}` : `${record.kind}:${record.contentId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
}

interface LegacyLastWatched {
  playlistId?: unknown
  videoId?: unknown
  playlistName?: unknown
  thumbnailId?: unknown
  updatedAt?: unknown
}

export interface MigratedProgressState extends Record<string, unknown> {
  completedVideos?: Record<string, string[]>
  recentPlaylists?: string[]
  latestActivity: ActivityRecord | null
}

/** Converts persisted v0 store data without changing completion, notes, or recents. */
export function migrateProgressState(persisted: unknown, now = Date.now()): MigratedProgressState {
  const state = persisted && typeof persisted === 'object' ? { ...(persisted as Record<string, unknown>) } : {}
  const hasExplicitActivity = state.latestActivity !== undefined && state.latestActivity !== null
  const existing =
    isActivityRecord(state.latestActivity) && state.latestActivity.playedAt <= now + MAX_FUTURE_ACTIVITY_MS
      ? state.latestActivity
      : null

  // A v1-shaped field must not silently fall through to a legacy observation.
  if (hasExplicitActivity) return { ...state, latestActivity: existing }

  const lastWatched = state.lastWatched as LegacyLastWatched | null
  if (
    !lastWatched ||
    typeof lastWatched.playlistId !== 'string' ||
    !PLAYLIST_ID.test(lastWatched.playlistId) ||
    typeof lastWatched.videoId !== 'string' ||
    !YOUTUBE_ID.test(lastWatched.videoId) ||
    !isValidLegacyThumbnail(lastWatched.thumbnailId) ||
    !isSafeLegacyTimestamp(lastWatched.updatedAt, now)
  )
    return { ...state, latestActivity: null }

  return {
    ...state,
    latestActivity: {
      version: ACTIVITY_STORAGE_VERSION,
      kind: 'playlist-video',
      contentId: lastWatched.videoId,
      mediaId: lastWatched.videoId,
      playlistId: lastWatched.playlistId,
      playlistName: isNonEmptyString(lastWatched.playlistName) ? lastWatched.playlistName : undefined,
      title: isNonEmptyString(lastWatched.playlistName) ? lastWatched.playlistName : 'Salasel playlist',
      thumbnailId: typeof lastWatched.thumbnailId === 'string' ? lastWatched.thumbnailId : lastWatched.videoId,
      destination: `/ar/playlist/${lastWatched.playlistId}/${lastWatched.videoId}`,
      playedAt: lastWatched.updatedAt,
    } satisfies ActivityRecord,
  }
}
