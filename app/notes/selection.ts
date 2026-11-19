import { useSyncExternalStore } from 'react'
import type { NoteRecord } from '../types.ts'

const SELECTION_EVENT = 'salasel:note-selection'
export function noteIdFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get('note')
}
export function selectedNoteForLocation(
  hash: string,
  notes: Record<string, NoteRecord>,
  drafts: Record<string, NoteRecord>,
): NoteRecord | null {
  const id = noteIdFromHash(hash)
  return id ? (notes[id] ?? drafts[id] ?? null) : null
}
function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener)
  window.addEventListener('hashchange', listener)
  window.addEventListener(SELECTION_EVENT, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener('hashchange', listener)
    window.removeEventListener(SELECTION_EVENT, listener)
  }
}
const browserHash = () => window.location.hash
const serverHash = () => ''
export function useNoteLocation() {
  return useSyncExternalStore(subscribe, browserHash, serverHash)
}
export function setNoteLocation(id: string | null, replace = false) {
  const destination = window.location.pathname + (id ? `#note=${encodeURIComponent(id)}` : '')
  if (replace) window.history.replaceState(null, '', destination)
  else window.history.pushState({ notes: true }, '', destination)
  window.dispatchEvent(new Event(SELECTION_EVENT))
}
