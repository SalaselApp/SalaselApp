'use client'

import type { Translations } from '@/app/types'

import React from 'react'
import { useNoteDraft } from '@/app/notes/useNoteDraft'
import { getNotesCopy } from '@/app/notes/copy'
import { usePreferencesStore } from '@/app/store/usePreferencesStore'
import { downloadTextFile } from '@/app/utils'
import { buildVideoNoteMarkdown, videoNoteFileName, hasContent, MARKDOWN_MIME } from '@/app/notes'

export interface WatchNotesProps {
  videoId: string
  playlistId: string | null
  t: Translations
}

/**
 * Notes panel shown beside the player. Writes to the shared notes store
 * (last-write-wins on updatedAt) so notes merge with any imported from the
 * Salasel browser extension. Includes the side toggle (move panel left/right)
 * and a download-note action.
 */
const WatchNotes: React.FC<WatchNotesProps> = ({ videoId, playlistId, t }) => {
  const { note: existing, text, status, change, save } = useNoteDraft(videoId, playlistId)
  const copy = getNotesCopy(t.__language.code)
  const toggleNotesSide = usePreferencesStore((s) => s.toggleNotesSide)

  const handleDownload = () => {
    const note = existing
    if (!note || !hasContent(note)) return
    downloadTextFile(videoNoteFileName(note.videoId), buildVideoNoteMarkdown(note), MARKDOWN_MIME)
  }

  const canDownload = !!existing && hasContent(existing)

  return (
    <div className="flex h-full min-h-[28rem] flex-col rounded-xl border border-slate-700 bg-slate-800/60 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700 bg-slate-800">
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
          <span className="material-icons-round text-base text-primary">edit_note</span>
          {t.notesLabel}
        </h2>
        <div className="flex items-center gap-1">
          {status !== 'idle' && status !== 'error' && (
            <span role="status" className="text-xs text-slate-400 me-1">
              {status === 'saving' ? t.noteSavingLabel : t.noteSavedLabel}
            </span>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
            aria-label={t.downloadNoteLabel}
            title={t.downloadNoteLabel}
            className={`inline-flex items-center justify-center h-11 w-11 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              canDownload
                ? 'border-primary bg-primary text-white hover:bg-primary/90 cursor-pointer'
                : 'border-slate-700 bg-slate-800/50 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span className="material-icons-round text-sm">download</span>
          </button>
          <button
            type="button"
            onClick={toggleNotesSide}
            aria-label={t.moveNotesSideLabel}
            title={t.moveNotesSideLabel}
            className="inline-flex items-center justify-center h-11 w-11 rounded-full border border-slate-600 bg-slate-700 text-slate-300 hover:border-primary hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <span className="material-icons-round text-sm">swap_horiz</span>
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div role="alert" className="m-3 rounded-lg border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-100">
          <p>
            {copy.saveError} {copy.draftKept}
          </p>
          <button
            type="button"
            onClick={save}
            className="mt-2 min-h-11 rounded-lg border border-red-300 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            {copy.retry}
          </button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(event) => change(event.target.value)}
        onBlur={save}
        placeholder={t.notesPlaceholder}
        aria-label={t.notesLabel}
        className="flex-1 min-h-72 w-full resize-none bg-transparent p-4 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
    </div>
  )
}

export default WatchNotes
