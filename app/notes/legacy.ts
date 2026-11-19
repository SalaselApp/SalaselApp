import { archivedSnapshots, ensureLegacyArchive } from './legacyArchive.ts'
import type { NoteRecord } from '../types.ts'
import { readNotes, writeNotes, type NotesMap, type NotesStorage } from './repository.ts'

export interface LegacyBlock {
  source: 'salasel-video-notes' | 'progress-storage'
  videoId: string
  playlistId: string | null
  content: string
  timestamp: string | number
  createdAt: number
  id?: string
}
export interface LegacyDocument extends NoteRecord {
  blocks: LegacyBlock[]
}
export type LegacyDocuments = Record<string, LegacyDocument>

function equivalent(a: LegacyBlock, b: LegacyBlock): boolean {
  if (a.videoId !== b.videoId || a.content !== b.content) return false
  if (a.playlistId && b.playlistId && a.playlistId !== b.playlistId) return false
  if (a.source === b.source)
    return a.timestamp === b.timestamp && a.createdAt === b.createdAt && (!a.id || !b.id || a.id === b.id)
  // Cross-source equivalence needs the exact same content and recorded creation time.
  const raw = a.source === 'salasel-video-notes' ? a : b
  const progress = a.source === 'progress-storage' ? a : b
  return raw.createdAt > 0 && raw.createdAt === progress.timestamp
}
function blockText(block: LegacyBlock): string {
  const context = [String(block.timestamp)]
  if (block.createdAt > 0) {
    try {
      context.push(new Date(block.createdAt).toISOString())
    } catch {
      /* Retain original data in its source key. */
    }
  }
  if (block.playlistId) context.push(block.playlistId)
  return `[${context.join(' · ')}]\n${block.content}`
}

/** Read only formats actually present in repository history. Never modify legacy keys. */
export function readLegacyDocuments(storage: NotesStorage): { legacy: LegacyDocuments; error: boolean } {
  const byVideo = new Map<string, LegacyBlock[]>()
  let error = false
  const read = (key: string): unknown => {
    try {
      const raw = storage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      error = true
      return null
    }
  }
  const append = (block: LegacyBlock) => {
    const list = byVideo.get(block.videoId) ?? []
    if (!list.some((previous) => equivalent(previous, block))) list.push(block)
    byVideo.set(block.videoId, list)
  }
  const appendRaw = (raw: unknown) => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw))
      for (const value of Object.values(raw)) {
        if (!Array.isArray(value)) continue
        for (const item of value) {
          if (
            !item ||
            typeof item !== 'object' ||
            typeof item.videoId !== 'string' ||
            !item.videoId ||
            typeof item.content !== 'string' ||
            !item.content.trim() ||
            typeof item.timestamp !== 'string'
          )
            continue
          append({
            source: 'salasel-video-notes',
            videoId: item.videoId,
            playlistId: typeof item.playlistId === 'string' && item.playlistId ? item.playlistId : null,
            content: item.content,
            timestamp: item.timestamp,
            createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt) ? item.createdAt : 0,
            ...(typeof item.id === 'string' ? { id: item.id } : {}),
          })
        }
      }
  }
  const appendProgress = (value: unknown) => {
    const progress = value as { state?: { notes?: unknown } } | null
    const progressNotes = progress?.state?.notes
    if (progressNotes && typeof progressNotes === 'object' && !Array.isArray(progressNotes))
      for (const [videoId, value] of Object.entries(progressNotes)) {
        if (!videoId || !Array.isArray(value)) continue
        for (const item of value) {
          if (
            !item ||
            typeof item !== 'object' ||
            typeof item.content !== 'string' ||
            !item.content.trim() ||
            typeof item.timestamp !== 'number' ||
            !Number.isFinite(item.timestamp)
          )
            continue
          append({
            source: 'progress-storage',
            videoId,
            playlistId: null,
            content: item.content,
            timestamp: item.timestamp,
            createdAt: 0,
          })
        }
      }
  }
  // Live source order is retained; archived equivalents are deduplicated below.
  appendRaw(read('salasel-video-notes'))
  appendProgress(read('progress-storage'))
  try {
    for (const snapshot of archivedSnapshots(storage)) {
      try {
        const value = JSON.parse(snapshot.raw)
        if (snapshot.key === 'salasel-video-notes') appendRaw(value)
        else appendProgress(value)
      } catch {
        error = true
      }
    }
  } catch {
    error = true
  }
  const legacy: LegacyDocuments = Object.fromEntries(
    [...byVideo].map(([videoId, blocks]) => [
      videoId,
      {
        videoId,
        playlistId: blocks.find((block) => block.playlistId)?.playlistId ?? null,
        text: blocks.map(blockText).join('\n\n'),
        updatedAt: Math.max(
          0,
          ...blocks.map(
            (block) =>
              block.createdAt ||
              (typeof block.timestamp === 'number' && block.timestamp > 100000000000 ? block.timestamp : 0),
          ),
        ),
        blocks,
      },
    ]),
  )
  return { legacy, error }
}

/** Missing canonical identities can be recovered; existing text and tombstones always win. */
export function hydrateLegacyNotes(storage: NotesStorage): {
  notes: NotesMap
  drafts: NotesMap
  legacy: LegacyDocuments
  storageError: boolean
} {
  let archiveError = false
  try {
    ensureLegacyArchive(storage)
  } catch {
    archiveError = true
  }
  const { legacy, error } = readLegacyDocuments(storage)
  let notes: NotesMap = {}
  let unreadable = false
  try {
    notes = readNotes(storage)
  } catch {
    unreadable = true
  }
  const recovered: NotesMap = {}
  for (const [id, document] of Object.entries(legacy))
    if (!Object.hasOwn(notes, id)) {
      const { blocks, ...record } = document
      void blocks
      recovered[id] = record
    }
  if (!Object.keys(recovered).length)
    return { notes, drafts: {}, legacy, storageError: error || unreadable || archiveError }
  if (!unreadable && !archiveError) {
    try {
      const next = { ...notes, ...recovered }
      writeNotes(storage, next)
      return { notes: next, drafts: {}, legacy, storageError: error }
    } catch {
      /* Keep recoverable drafts separate from confirmed canonical persistence. */
    }
  }
  return { notes, drafts: recovered, legacy, storageError: true }
}

export function olderNotesFor(videoId: string, notes: NotesMap, legacy: LegacyDocuments): LegacyDocument | undefined {
  const older = legacy[videoId]
  return older && (!notes[videoId] || !notes[videoId].text.includes(older.text)) ? older : undefined
}
