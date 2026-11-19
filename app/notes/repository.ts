import { ensureLegacyArchive } from './legacyArchive.ts'
import type { NoteRecord } from '../types.ts'

export const NOTES_STORAGE_KEY = 'notes-storage'
export type NotesMap = Record<string, NoteRecord>
export interface NotesStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Validate external payloads and keep map identity equal to canonical video identity. */
export function normalizeNotes(value: unknown): NotesMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const entries: [string, NoteRecord][] = []
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== 'object') continue
    const note = raw as Partial<NoteRecord>
    if (note.videoId !== id || !id || typeof note.text !== 'string') continue
    entries.push([
      id,
      {
        videoId: id,
        playlistId: typeof note.playlistId === 'string' && note.playlistId ? note.playlistId : null,
        text: note.text,
        updatedAt: typeof note.updatedAt === 'number' && Number.isFinite(note.updatedAt) ? note.updatedAt : 0,
      },
    ])
  }
  return Object.fromEntries(entries)
}

export function mergeNotes(current: NotesMap, incoming: unknown): NotesMap {
  const next = { ...current }
  for (const [id, note] of Object.entries(normalizeNotes(incoming))) {
    if (!Object.hasOwn(next, id) || next[id].updatedAt < note.updatedAt) next[id] = note
  }
  return next
}

/** Keep the established Zustand v0 envelope; malformed storage must not be overwritten silently. */
export function readNotes(storage: NotesStorage): NotesMap {
  const raw = storage.getItem(NOTES_STORAGE_KEY)
  if (!raw) return {}
  const envelope = JSON.parse(raw)
  if (!envelope || typeof envelope !== 'object' || !envelope.state || typeof envelope.state !== 'object')
    throw new Error('Unreadable notes storage')
  return normalizeNotes(envelope.state.notes)
}

export function writeNotes(storage: NotesStorage, notes: NotesMap): void {
  ensureLegacyArchive(storage)
  // Preserve any compatible fields stored alongside notes, rather than migrating unrelated data.
  const raw = storage.getItem(NOTES_STORAGE_KEY)
  const previous = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  if (!previous || typeof previous !== 'object' || !previous.state || typeof previous.state !== 'object')
    throw new Error('Unreadable notes storage')
  storage.setItem(NOTES_STORAGE_KEY, JSON.stringify({ ...previous, state: { ...previous.state, notes } }))
}

/** Persist first. Callers publish canonical state only after this function succeeds. */
export function saveNote(storage: NotesStorage, current: NotesMap, draft: NoteRecord, now = Date.now()): NotesMap {
  const next = mergeNotes(current, readNotes(storage))
  const previous = next[draft.videoId]
  const note = normalizeNotes({ [draft.videoId]: draft })[draft.videoId]
  if (!note) throw new Error('Invalid note')
  note.playlistId = previous ? previous.playlistId : note.playlistId
  note.updatedAt = Math.max(now, (previous?.updatedAt ?? 0) + 1, note.updatedAt)
  next[note.videoId] = note
  writeNotes(storage, next)
  return next
}

/** Automatic recovery is conditional insertion, never an ordinary last-write-wins edit. */
export function recoverNoteIfMissing(storage: NotesStorage, current: NotesMap, recovery: NoteRecord): NotesMap {
  const notes = mergeNotes(current, readNotes(storage))
  if (Object.hasOwn(notes, recovery.videoId)) return notes
  const record = normalizeNotes({ [recovery.videoId]: recovery })[recovery.videoId]
  if (!record) throw new Error('Invalid recovery note')
  const next = { ...notes, [record.videoId]: record }
  writeNotes(storage, next)
  return next
}
