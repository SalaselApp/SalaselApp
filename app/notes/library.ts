import type { NoteRecord } from '../types.ts'

export type NoteSection = 'series' | 'podcasts' | 'standalone'
export interface CatalogPlaylist {
  id: string
  title: string
  section: 'series' | 'podcasts'
}
export interface CatalogVideo {
  videoId: string
  playlistId: string | null
  title: string
  position: number
}
export interface CatalogPodcast {
  id: string
  videoId: string
  title: string
}
export interface NotesCatalog {
  playlists: CatalogPlaylist[]
  videos: CatalogVideo[]
  podcasts: CatalogPodcast[]
  incomplete?: boolean
}
export interface LibraryLabels {
  unavailableSeries: string
  untitledVideo: string
}
export interface NoteItem {
  note: NoteRecord
  title: string
  href: string | null
  position: number
  unavailable: boolean
  olderText?: string
}
export interface NoteGroup {
  id: string
  title: string
  section: NoteSection
  playlistId: string | null
  items: NoteItem[]
}
export const EMPTY_CATALOG: NotesCatalog = { playlists: [], videos: [], podcasts: [] }

export function chooseVideo(
  choice: Pick<NoteRecord, 'videoId' | 'playlistId'>,
  notes: Record<string, NoteRecord>,
): NoteRecord {
  return notes[choice.videoId] ?? { ...choice, text: '', updatedAt: 0 }
}

export function resolveNote(
  note: NoteRecord,
  catalog: NotesCatalog,
  lang: string,
  labels: LibraryLabels,
): NoteItem & { section: NoteSection; groupTitle: string; groupId: string } {
  const playlist = note.playlistId ? catalog.playlists.find((p) => p.id === note.playlistId) : undefined
  const contextVideo = catalog.videos.find((v) => v.videoId === note.videoId && v.playlistId === note.playlistId)
  const video = contextVideo ?? catalog.videos.find((v) => v.videoId === note.videoId)
  const podcast = catalog.podcasts.find((p) => p.videoId === note.videoId)
  const section = note.playlistId ? (playlist?.section ?? 'series') : podcast ? 'podcasts' : 'standalone'
  const href =
    contextVideo && playlist
      ? `/${lang}/playlist/${encodeURIComponent(playlist.id)}/${encodeURIComponent(contextVideo.videoId)}`
      : podcast
        ? `/${lang}/podcast/${encodeURIComponent(podcast.id)}/watch`
        : video
          ? `/${lang}/video/${encodeURIComponent(video.videoId)}`
          : null
  return {
    note,
    title: contextVideo?.title ?? podcast?.title ?? video?.title ?? labels.untitledVideo,
    href,
    position: contextVideo?.position ?? Number.MAX_SAFE_INTEGER,
    unavailable: (!podcast && !video) || (!!note.playlistId && !playlist),
    section,
    groupId: note.playlistId ? `playlist:${note.playlistId}` : section,
    groupTitle: note.playlistId ? (playlist?.title ?? labels.unavailableSeries) : '',
  }
}

export function buildLibrary(
  notes: NoteRecord[],
  catalog: NotesCatalog,
  lang: string,
  labels: LibraryLabels,
  olderNotes: Record<string, string> = {},
): NoteGroup[] {
  const groups = new Map<string, NoteGroup>()
  // The canonical map should already be unique. Keep this boundary safe for callers passing arrays.
  const unique = new Map<string, NoteRecord>()
  for (const note of notes) {
    const previous = unique.get(note.videoId)
    if (!previous || note.updatedAt > previous.updatedAt) unique.set(note.videoId, note)
  }
  for (const note of unique.values()) {
    if (!note.text.trim() && !olderNotes[note.videoId]) continue
    const item = {
      ...resolveNote(note, catalog, lang, labels),
      ...(olderNotes[note.videoId] ? { olderText: olderNotes[note.videoId] } : {}),
    }
    let group = groups.get(item.groupId)
    if (!group) {
      group = {
        id: item.groupId,
        title: item.groupTitle,
        section: item.section,
        playlistId: note.playlistId,
        items: [],
      }
      groups.set(group.id, group)
    }
    group.items.push(item)
  }
  const order = ['series', 'podcasts', 'standalone']
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) =>
        group.playlistId
          ? a.position - b.position || b.note.updatedAt - a.note.updatedAt
          : b.note.updatedAt - a.note.updatedAt,
      ),
    }))
    .sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section) || a.title.localeCompare(b.title, lang))
}

export function searchLibrary(
  groups: NoteGroup[],
  query: string,
  sections?: Partial<Record<NoteSection, string>>,
): NoteGroup[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return groups
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        [
          group.title,
          item.title,
          item.note.text,
          item.note.videoId,
          item.olderText ?? '',
          group.section,
          sections?.[group.section] ?? '',
        ].some((value) => value.toLocaleLowerCase().includes(normalized)),
      ),
    }))
    .filter((group) => group.items.length)
}

export function groupNotesForExport(group: NoteGroup): NoteRecord[] {
  return [
    ...new Map(
      group.items.filter((item) => item.note.text.trim()).map((item) => [item.note.videoId, item.note]),
    ).values(),
  ]
}

/** Public content choices only; choosing does not create a note or begin playback. */
export function catalogChoices(catalog: NotesCatalog): (CatalogVideo & { section: NoteSection; context: string })[] {
  const videos = catalog.videos.map((video) => {
    const playlist = catalog.playlists.find((p) => p.id === video.playlistId)
    return { ...video, section: playlist?.section ?? ('standalone' as NoteSection), context: playlist?.title ?? '' }
  })
  return [
    ...videos,
    ...catalog.podcasts.map((p) => ({
      videoId: p.videoId,
      playlistId: null,
      title: p.title,
      position: 0,
      section: 'podcasts' as const,
      context: '',
    })),
  ]
}

/** Keep failed first/recreated drafts reachable while retaining saved content for existing notes. */
export function libraryNotes(notes: Record<string, NoteRecord>, drafts: Record<string, NoteRecord>): NoteRecord[] {
  const visible = { ...notes }
  for (const [id, draft] of Object.entries(drafts)) {
    if (draft.text.trim() && !notes[id]?.text.trim()) visible[id] = draft
  }
  return Object.values(visible)
}

/** Export is scoped to the canonical playlist, independent of the current search view. */
export function playlistExportGroup(
  playlistId: string,
  notes: Record<string, NoteRecord>,
  catalog: NotesCatalog,
  lang: string,
  labels: LibraryLabels,
): NoteGroup | undefined {
  return buildLibrary(Object.values(notes), catalog, lang, labels).find((group) => group.playlistId === playlistId)
}
