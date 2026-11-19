'use client'

import { useEffect } from 'react'
import {
  flushNoteDrafts,
  importNotesFromExtension,
  NOTES_UPDATED_EVENT,
  useNotesStore,
} from '@/app/store/useNotesStore'

/** Browser-local hydration and the existing v1 extension bridge. No note text is sent to a server. */
export default function NotesInbox() {
  useEffect(() => {
    useNotesStore.getState().hydrate()
    importNotesFromExtension()
    const storage = (event: StorageEvent) => {
      if (!event.key || event.key === 'notes-storage') useNotesStore.getState().hydrate()
      if (!event.key || event.key === 'salasel-notes-inbox') importNotesFromExtension()
    }
    const unload = (event: BeforeUnloadEvent) => {
      if (!flushNoteDrafts()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    const hide = () => {
      flushNoteDrafts()
    }
    window.addEventListener(NOTES_UPDATED_EVENT, importNotesFromExtension)
    window.addEventListener('storage', storage)
    window.addEventListener('beforeunload', unload)
    window.addEventListener('pagehide', hide)
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, importNotesFromExtension)
      window.removeEventListener('storage', storage)
      window.removeEventListener('beforeunload', unload)
      window.removeEventListener('pagehide', hide)
    }
  }, [])
  return null
}
