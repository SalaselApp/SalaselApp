import { revalidateTag } from 'next/cache'
import { PLAYLISTS_TAG } from '@/app/api/playlists'
import { VIDEOS_TAG } from '@/app/api/videos'
import { PODCASTS_TAG } from '@/app/podcasts/contract'

/**
 * On-demand cache revalidation webhook.
 *
 * The Salasel Admin app writes to the shared Supabase DB, but cache tags are
 * per-app — it cannot bust this site's `unstable_cache` directly. Instead it
 * calls this endpoint, which purges our Data Cache tags on demand.
 *
 * Auth: requires `Authorization: Bearer <REVALIDATE_SECRET>`, where the secret
 * matches `process.env.REVALIDATE_SECRET` (shared with the admin app).
 *
 * Body (optional JSON): `{ tag?: "playlists" | "videos" | "podcasts" }`. When a known tag is
 * given, only that tag is revalidated; otherwise both are. A missing or invalid
 * body falls back to revalidating both tags.
 */

// Route handlers are dynamic by default; this endpoint must be served by the
// runtime rather than statically rendered at build time.
export const dynamic = 'force-dynamic'

// Next 16: revalidateTag requires a cache-life profile as its second arg.
// Playlist/video refreshes retain stale-while-revalidate semantics. Podcasts
// saved from the admin should appear on the next request after the webhook.
const CACHE_LIFE_PROFILE = 'max'

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return Response.json({ error: 'REVALIDATE_SECRET is not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse the optional body defensively — a missing or invalid body should
  // fall back to revalidating both tags rather than throwing.
  let requestedTag: string | undefined
  try {
    const body = (await request.json()) as { tag?: string } | null
    requestedTag = body?.tag
  } catch {
    requestedTag = undefined
  }

  if (requestedTag === PLAYLISTS_TAG || requestedTag === VIDEOS_TAG || requestedTag === PODCASTS_TAG) {
    revalidateTag(requestedTag, requestedTag === PODCASTS_TAG ? { expire: 0 } : CACHE_LIFE_PROFILE)
    return Response.json({ revalidated: [requestedTag] })
  }

  revalidateTag(PLAYLISTS_TAG, CACHE_LIFE_PROFILE)
  revalidateTag(VIDEOS_TAG, CACHE_LIFE_PROFILE)
  revalidateTag(PODCASTS_TAG, { expire: 0 })
  return Response.json({ revalidated: [PLAYLISTS_TAG, VIDEOS_TAG, PODCASTS_TAG] })
}
