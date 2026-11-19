import { create } from 'zustand'
import type { NoteRecord, NotesHandoffPayload } from '@/app/types'
import { hydrateLegacyNotes, type LegacyDocuments } from '../notes/legacy.ts'
import {
  mergeNotes,
  readNotes,
  saveNote,
  writeNotes,
  recoverNoteIfMissing,
  type NotesMap,
} from '../notes/repository.ts'

export const NOTES_INBOX_KEY = 'salasel-notes-inbox'
export const NOTES_UPDATED_EVENT = 'salasel:notes-updated'
export const NOTES_OUTBOX_KEY = 'salasel-notes-outbox'
export const NOTES_APP_UPDATED_EVENT = 'salasel:app-notes-updated'
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface NotesState {
  notes: NotesMap
  drafts: NotesMap
  pendingClears: NotesMap
  legacy: LegacyDocuments
  automaticRecovery: Record<string, boolean>
  statuses: Record<string, SaveStatus>
  hydrated: boolean
  storageError: boolean
  hydrate: () => void
  upsertNote: (note: NoteRecord) => boolean
  clearNote: (note: NoteRecord) => boolean
  cancelClear: (videoId: string) => void
  setDraft: (note: NoteRecord) => void
  saveDraft: (videoId: string) => boolean
  importSnapshot: (incoming: NotesMap) => void
  getNote: (videoId: string) => NoteRecord | undefined
  getNotesForPlaylist: (playlistId: string) => NoteRecord[]
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()
function cancelTimer(id: string) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
}

/** Fresh canonical state wins over untouched recovery projections, but never discards user edits/clear intent. */
function protectCanonical(state: NotesState, notes: NotesMap) {
  const drafts = { ...state.drafts }
  const automaticRecovery = { ...state.automaticRecovery }
  const statuses = { ...state.statuses }
  for (const id of Object.keys(automaticRecovery)) {
    if (automaticRecovery[id] && Object.hasOwn(notes, id) && !state.pendingClears[id]) {
      delete drafts[id]
      delete automaticRecovery[id]
      statuses[id] = 'idle'
    }
  }
  return { drafts, automaticRecovery, statuses }
}

/** Existing storage envelope is unchanged. Publish successful saves only after the synchronous write. */
export const useNotesStore = create<NotesState>()((set, get) => ({
  notes: {},
  drafts: {},
  pendingClears: {},
  legacy: {},
  automaticRecovery: {},
  statuses: {},
  hydrated: false,
  storageError: false,
  hydrate: () => {
    if (typeof window === 'undefined') return
    try {
      const recovered = hydrateLegacyNotes(window.localStorage)
      const current = get()
      const notes = mergeNotes(current.notes, recovered.notes)
      const drafts = { ...current.drafts }
      const automaticRecovery = { ...current.automaticRecovery }
      const statuses = { ...current.statuses }
      for (const [id, draft] of Object.entries(recovered.drafts)) {
        if (!drafts[id]) {
          drafts[id] = draft
          automaticRecovery[id] = true
          statuses[id] = 'error'
        }
      }
      const protectedDrafts = protectCanonical({ ...current, drafts, automaticRecovery, statuses }, notes)
      set({
        notes,
        ...protectedDrafts,
        legacy: recovered.legacy,
        hydrated: true,
        storageError: recovered.storageError,
      })
    } catch {
      set({ hydrated: true, storageError: true })
    }
  },
  upsertNote: (note) => {
    if (typeof window === 'undefined') return false
    const current = get()
    // Visiting a blank editor must never create a phantom document.
    if (!current.notes[note.videoId] && !current.pendingClears[note.videoId] && !note.text.trim()) {
      const drafts = { ...current.drafts }
      delete drafts[note.videoId]
      cancelTimer(note.videoId)
      set({ drafts, statuses: { ...current.statuses, [note.videoId]: 'idle' } })
      return true
    }
    try {
      const notes = saveNote(window.localStorage, current.notes, note)
      const drafts = { ...get().drafts }
      const pendingClears = { ...get().pendingClears }
      const automaticRecovery = { ...get().automaticRecovery }
      delete automaticRecovery[note.videoId]
      delete drafts[note.videoId]
      delete pendingClears[note.videoId]
      cancelTimer(note.videoId)
      set({
        notes,
        drafts,
        pendingClears,
        automaticRecovery,
        storageError: false,
        statuses: { ...get().statuses, [note.videoId]: 'saved' },
      })
      exportNotesToExtension(notes)
      return true
    } catch {
      // Canonical saved content remains unchanged; drafts survive route changes in this store.
      set({ statuses: { ...get().statuses, [note.videoId]: 'error' } })
      return false
    }
  },
  clearNote: (note) => {
    cancelTimer(note.videoId)
    // Preserve any recoverable edit draft until the confirmed clear is durable.
    const intent = { ...note, text: '', updatedAt: Date.now() }
    set({ pendingClears: { ...get().pendingClears, [note.videoId]: intent } })
    return get().upsertNote(intent)
  },
  cancelClear: (id) => {
    if (!get().pendingClears[id]) return
    const pendingClears = { ...get().pendingClears }
    delete pendingClears[id]
    set({ pendingClears, statuses: { ...get().statuses, [id]: get().drafts[id] ? 'error' : 'idle' } })
  },
  setDraft: (note) => {
    cancelTimer(note.videoId)
    const current = get()
    const drafts = { ...current.drafts }
    const pendingClears = { ...current.pendingClears }
    const automaticRecovery = { ...current.automaticRecovery }
    delete automaticRecovery[note.videoId]
    delete pendingClears[note.videoId]
    const unchanged = note.text === (current.notes[note.videoId]?.text ?? '')
    if (unchanged) delete drafts[note.videoId]
    else drafts[note.videoId] = { ...note, playlistId: current.notes[note.videoId]?.playlistId ?? note.playlistId }
    set({
      drafts,
      pendingClears,
      automaticRecovery,
      statuses: { ...current.statuses, [note.videoId]: unchanged ? 'idle' : 'saving' },
    })
    if (!unchanged)
      timers.set(
        note.videoId,
        setTimeout(() => get().saveDraft(note.videoId), 600),
      )
  },
  saveDraft: (id) => {
    cancelTimer(id)
    const current = get()
    if (current.automaticRecovery[id] && !current.pendingClears[id] && current.drafts[id]) {
      if (typeof window === 'undefined') return false
      try {
        const notes = recoverNoteIfMissing(window.localStorage, current.notes, current.drafts[id])
        set({ notes, ...protectCanonical(current, notes), storageError: false })
        exportNotesToExtension(notes)
        return true
      } catch {
        set({ statuses: { ...get().statuses, [id]: 'error' } })
        return false
      }
    }
    const draft = current.pendingClears[id] ?? current.drafts[id]
    return draft ? get().upsertNote(draft) : true
  },
  importSnapshot: (incoming) => {
    if (typeof window === 'undefined') return
    const notes = mergeNotes(get().notes, incoming)
    try {
      const merged = mergeNotes(notes, readNotes(window.localStorage))
      writeNotes(window.localStorage, merged)
      const current = get()
      set({ notes: merged, ...protectCanonical(current, merged), storageError: false })
    } catch {
      set({ storageError: true })
    }
  },
  getNote: (id) => get().notes[id],
  getNotesForPlaylist: (id) =>
    Object.values(get().notes)
      .filter((n) => n.playlistId === id)
      .sort((a, b) => b.updatedAt - a.updatedAt),
}))

export function flushNoteDrafts(): boolean {
  const state = useNotesStore.getState()
  return [...new Set([...Object.keys(state.drafts), ...Object.keys(state.pendingClears)])]
    .map((id) => useNotesStore.getState().saveDraft(id))
    .every(Boolean)
}

export function importNotesFromExtension(): void {
  if (typeof window === 'undefined') return
  if (!useNotesStore.getState().hydrated) useNotesStore.getState().hydrate()
  try {
    const raw = window.localStorage.getItem(NOTES_INBOX_KEY)
    if (!raw) return
    const payload: Partial<NotesHandoffPayload> = JSON.parse(raw)
    if (!payload || payload.source !== 'salasel-extension' || payload.version !== 1) return
    useNotesStore.getState().importSnapshot(payload.notes ?? {})
  } catch {
    /* Keep the inbox for a later retry. */
  }
}

/** Best-effort extension transport is distinct from confirmed local persistence. */
export function exportNotesToExtension(notes: NotesMap): void {
  if (typeof window === 'undefined') return
  const payload: NotesHandoffPayload = { source: 'salasel-extension', version: 1, exportedAt: Date.now(), notes }
  try {
    window.localStorage.setItem(NOTES_OUTBOX_KEY, JSON.stringify(payload))
    window.dispatchEvent(new CustomEvent(NOTES_APP_UPDATED_EVENT))
  } catch {
    /* Saved browser notes remain intact if extension transport is unavailable. */
  }
}
