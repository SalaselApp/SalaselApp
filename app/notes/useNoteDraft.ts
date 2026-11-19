'use client'
import { useNotesStore } from '@/app/store/useNotesStore'

export function useNoteDraft(videoId: string, playlistId: string | null) {
  const note = useNotesStore((s) => s.notes[videoId])
  const draft = useNotesStore((s) => s.drafts[videoId])
  const status = useNotesStore((s) => s.statuses[videoId] ?? 'idle')
  const setDraft = useNotesStore((s) => s.setDraft)
  const saveDraft = useNotesStore((s) => s.saveDraft)
  return {
    note,
    text: draft?.text ?? note?.text ?? '',
    status,
    change: (text: string) =>
      setDraft({ videoId, playlistId: note?.playlistId ?? playlistId, text, updatedAt: Date.now() }),
    save: () => saveDraft(videoId),
  }
}
