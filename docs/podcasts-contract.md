# Podcasts and activity contract

## Podcast identity, visibility, and cache

- Podcast identity is app-owned `pod_<uuid>`, not a YouTube ID. Canonical public path: `/{lang}/podcast/{podcastId}`.
- Sources are existing YouTube videos only. `thumbnail_id` is also an 11-character YouTube video ID. No files, storage, other hosts, audio-only sources, shows, seasons, or playlists.
- Categories are nonempty `smallint[]`: `0 Nature`, `1 Self`, `2 Religion`; language is `ar|en|ja`.
- Admin management follows playlists: fetch YouTube metadata, edit details, save once, and return to the dashboard. Creation sets `published_at` in the same authenticated insert; no separate draft/review/publish UI is required. Existing unpublished records become available on save; existing publication timestamps are preserved on edits.
- `published_at IS NULL` remains legacy draft/withdrawn storage state. Public RLS permits only published `SELECT`; Admin uses service role only after `requireSession()`. Removing an episode uses a scoped authenticated delete, without changing playlist or video records.
- App caches catalog metadata under tag `podcasts` for one hour. Admin calls `POST /api/revalidate` using the existing secret after creation, edits, deletion, or legacy visibility changes. The podcast tag expires immediately (`{ expire: 0 }`) so the next catalogue request sees saved content. A failed webhook is reported separately from a successful write; it must not encourage duplicate insertion.
- Public canonical detail reads are dynamic and query published visibility fresh. A cached catalog entry can therefore never make a withdrawn entry playable. Missing, draft, withdrawn, and removed IDs render the same unavailable fallback.

## Local activity bridge (v1)

Activity is local-only in `localStorage['progress-storage']`, Zustand payload field `state.latestActivity`. No account or cross-device sync. The app writes it only after its embedded YouTube player receives `onStateChange` state `1` (playing), not when catalog/detail routes open. The iframe uses `enablejsapi=1`, checks `youtube-nocookie.com` origin and its own frame source, then emits exactly one observation for a player load.

```ts
type ActivityRecord = {
  version: 1
  kind: 'podcast' | 'video' | 'playlist-video'
  contentId: string
  mediaId: string
  playlistId?: string // required for playlist-video
  playlistName?: string
  title: string
  thumbnailId?: string
  destination: string // canonical, relative Salasel path beginning with '/'
  playedAt: number // source playback-event epoch ms
}
```

Exact v1 payload examples:

```json
{"version":1,"kind":"podcast","contentId":"pod_01HZX3A9Y8W2N7Q4R6S5T0V1X2","mediaId":"M7lc1UVf-VE","title":"Episode title","thumbnailId":"dQw4w9WgXcQ","destination":"/ar/podcast/pod_01HZX3A9Y8W2N7Q4R6S5T0V1X2","playedAt":1760000000000}
{"version":1,"kind":"video","contentId":"M7lc1UVf-VE","mediaId":"M7lc1UVf-VE","title":"Standalone video","thumbnailId":"M7lc1UVf-VE","destination":"/ar/video/M7lc1UVf-VE","playedAt":1760000000000}
{"version":1,"kind":"playlist-video","contentId":"M7lc1UVf-VE","mediaId":"M7lc1UVf-VE","playlistId":"PL123","playlistName":"Series title","title":"Episode title","thumbnailId":"M7lc1UVf-VE","destination":"/ar/playlist/PL123/M7lc1UVf-VE","playedAt":1760000000000}
```

Validation rejects malformed/unsupported records. A destination must exactly match its kind and identities with one allowed locale (`ar`, `en`, or `ja`): `/{lang}/podcast/{contentId}`, `/{lang}/video/{mediaId}`, or `/{lang}/playlist/{playlistId}/{mediaId}`. Reject protocol-relative paths, credentials, origins, query strings, fragments, backslashes, traversal, and any other route; checking only `startsWith('/')` is unsafe. YouTube media and thumbnail IDs are 11-character IDs, podcast IDs begin `pod_`, and playlist IDs are safe route segments. The newest **source** `playedAt` wins. An older time cannot replace it; equal time preserves first accepted record (including duplicates); times more than five minutes in the future are rejected. Never replace `playedAt` with extension receipt time.

Existing persisted `lastWatched` migrates to `latestActivity` when it has exact playlist and video IDs. It preserves `completedVideos`, `recentPlaylists` ordering, and all unrelated fields such as notes. Legacy records with no exact video remain legacy fallbacks and must not invent playlist membership. `lastWatched` stays populated for legacy extension compatibility only when a playlist video actually starts.

## Extension handoff

Read `JSON.parse(localStorage.getItem('progress-storage'))?.state.latestActivity`; validate v1 payload above before rendering. If absent, optionally read legacy `state.lastWatched` only when both `playlistId` and `videoId` are valid exact identities, and use the safe legacy `ar` route `https://salasel.app/ar/playlist/{playlistId}/{videoId}`. Do not infer a video from `recentPlaylists` or completed history. Do not write activity based on browsing or from YouTube-site observations. Build the trusted `https://salasel.app` URL from validated kind and identities; never open an untrusted stored destination. An unavailable podcast destination intentionally resolves to the app fallback; never redirect it to unrelated content.

The app bridge trigger is the persisted Zustand update after player-start. Extension code can read it when its Salasel content script runs and transfer the validated record to `chrome.storage.local`; no extension installation is required for app playback/history.

## Curated metadata parity — 6 November 2026

Podcast descriptions are editor-written; importing YouTube metadata must leave them blank. Participants use the existing playlist string-array model. Podcast content type, presentation style, category and audience-class numeric identities exactly match playlists; use the same admin controls and public filter options. Curator description may be empty. Video identity is captured during import and kept internally, not displayed as a details-form input.

Apply shared forward migration `20261106000000_podcast_curated_metadata.sql` before deploying updated writers. Existing type/style remain nullable until assigned; editing other fields must not invent defaults. Legacy callers omitting new metadata must not erase stored values. Public adapters return empty participant/class arrays and unknown classification values for legacy rows. Stable IDs, publication/cache-refresh behavior and playback activity remain unchanged. Rich reusable speaker profiles remain separately tracked in app issue #36.

## Detail and watch routes — 6 November 2026

The stable base `/{lang}/podcast/{id}` now presents metadata. Its play action opens `/{lang}/podcast/{id}/watch` for the shared player and notes. Both check current public availability; neither requires playlist membership or an episode sequence. Metadata canonicals remain the stable base detail URL. New activity destinations use `/watch`; legacy base activity remains accepted and safely normalizes to playback in the app and extension. Source event timestamps, identities and existing playlist routes are preserved.

Standalone podcast notes use the real YouTube media ID with `playlistId:null`, preserving an existing genuine playlist association for a shared-video note rather than erasing it. Notes save before navigation and retain existing markdown/download and extension merge semantics. Player readiness/errors never create consumed activity.
