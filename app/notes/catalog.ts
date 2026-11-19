import type { CatalogPlaylist, CatalogPodcast, CatalogVideo, NotesCatalog } from './library.ts'
export interface MetadataRequest {
  videoIds: string[]
  playlistIds: string[]
}
interface Result<T> {
  ok: boolean
  items: T[]
}
interface CatalogSource {
  playlists: (ids: string[]) => Promise<Result<CatalogPlaylist>>
  podcasts: (videoIds: string[]) => Promise<Result<CatalogPodcast>>
  videos: (ids: string[]) => Promise<Result<CatalogVideo>>
}
export function parseMetadataRequest(value: unknown): MetadataRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid metadata request')
  const input = value as Record<string, unknown>
  const ids = (name: string) => {
    const array = input[name]
    if (
      !Array.isArray(array) ||
      array.length > 50 ||
      array.some((id) => typeof id !== 'string' || !id || id.length > 200)
    )
      throw new Error('Invalid metadata identities')
    return [...new Set(array)] as string[]
  }
  return { videoIds: ids('videoIds'), playlistIds: ids('playlistIds') }
}
/** Only resolve saved identities. Empty libraries do not fetch the public catalogue. */
export function createNotesCatalogReader(source: CatalogSource) {
  return async (request: MetadataRequest): Promise<NotesCatalog> => {
    const empty = { ok: true, items: [] }
    const [videos, podcasts] = await Promise.all([
      request.videoIds.length ? source.videos(request.videoIds) : empty,
      request.videoIds.length ? source.podcasts(request.videoIds) : empty,
    ])
    const ids = [
      ...new Set([...request.playlistIds, ...videos.items.map((v) => v.playlistId).filter((id): id is string => !!id)]),
    ]
    const playlists: CatalogPlaylist[] = []
    let incomplete = !videos.ok || !podcasts.ok
    for (let offset = 0; offset < ids.length; offset += 50) {
      const page = await source.playlists(ids.slice(offset, offset + 50))
      playlists.push(...page.items)
      incomplete ||= !page.ok
    }
    return { videos: videos.items, podcasts: podcasts.items, playlists, incomplete }
  }
}

export function metadataBatches(notes: { videoId: string; playlistId: string | null }[]): MetadataRequest[] {
  const unique = [...new Map(notes.map((note) => [note.videoId, note])).values()]
  const batches: MetadataRequest[] = []
  for (let offset = 0; offset < unique.length; offset += 50) {
    const slice = unique.slice(offset, offset + 50)
    batches.push({
      videoIds: slice.map((note) => note.videoId),
      playlistIds: [...new Set(slice.map((note) => note.playlistId).filter((id): id is string => !!id))],
    })
  }
  return batches
}
