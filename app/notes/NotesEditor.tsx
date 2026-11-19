'use client'

import { useRef, useState } from 'react'
import type { NoteItem } from './library'
import type { NotesCopy } from './copy'
import { useNoteDraft } from './useNoteDraft'
import { useNotesStore } from '@/app/store/useNotesStore'
import { buildVideoNoteMarkdown, hasContent, MARKDOWN_MIME, videoNoteFileName } from '@/app/notes'
import { downloadTextFile } from '@/app/utils'
import { DirectionArrow, noteButton, noteDate } from './NotesBrowser'
import NotesMenu from './NotesMenu'
import NotesHistory from './NotesHistory'
import type { LegacyDocument } from './legacy'

export default function NotesEditor({
  item,
  lang,
  copy,
  onBack,
  onExportPlaylist,
  hasPlaylistExport,
  older,
}: {
  item: NoteItem
  lang: string
  copy: NotesCopy
  onBack: () => void
  onExportPlaylist: () => void
  hasPlaylistExport: boolean
  older?: LegacyDocument
}) {
  const editor = useNoteDraft(item.note.videoId, item.note.playlistId)
  const clearNote = useNotesStore((s) => s.clearNote)
  const cancelClear = useNotesStore((s) => s.cancelClear)
  const [confirm, setConfirm] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const showingOlder = historyOpen && !!older
  const cancel = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const canExport = !!editor.note && hasContent(editor.note)
  const download = () => {
    if (showingOlder && older) {
      downloadTextFile(
        videoNoteFileName(older.videoId).replace('.md', '-older.md'),
        buildVideoNoteMarkdown(older, item.title),
        MARKDOWN_MIME,
      )
      return
    }
    if (editor.note && hasContent(editor.note))
      downloadTextFile(
        videoNoteFileName(editor.note.videoId),
        buildVideoNoteMarkdown(editor.note, item.title),
        MARKDOWN_MIME,
      )
  }
  const closeConfirm = () => {
    cancelClear(item.note.videoId)
    setConfirm(false)
    heading.current?.focus()
  }
  return (
    <section
      aria-labelledby="selected-note-title"
      className="flex min-h-[calc(100dvh-10rem)] min-w-0 w-full flex-col rounded-xl border border-slate-700 bg-slate-800/40 focus-within:border-slate-500 md:h-[calc(100dvh-8rem)] md:min-h-0"
    >
      <header className="border-b border-slate-700 px-5 py-4 sm:px-7 sm:py-5">
        <button
          type="button"
          onClick={() => {
            editor.save()
            onBack()
          }}
          className={`${noteButton} -ms-3 mb-3 text-slate-300 hover:text-white md:hidden`}
        >
          <DirectionArrow back />
          {copy.back}
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              ref={heading}
              tabIndex={-1}
              id="selected-note-title"
              dir="auto"
              className="break-words text-xl font-semibold leading-relaxed text-white focus:outline-none"
            >
              {item.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-relaxed text-slate-400">
              <span>
                {showingOlder && older
                  ? `${copy.edited}: ${noteDate(older.updatedAt, lang, copy)}`
                  : editor.note
                    ? `${copy.edited}: ${noteDate(editor.note.updatedAt, lang, copy)}`
                    : copy.unknownDate}
              </span>
              <span role="status" aria-live="polite">
                {showingOlder
                  ? ''
                  : editor.status === 'saving'
                    ? copy.saving
                    : cleared
                      ? copy.cleared
                      : editor.status === 'saved'
                        ? copy.saved
                        : ''}
              </span>
            </div>
          </div>
          <NotesMenu
            copy={copy}
            canDownload={showingOlder || canExport}
            canClear={canExport || !!editor.text.trim()}
            playlist={!showingOlder && hasPlaylistExport}
            href={item.href}
            onDownload={download}
            olderOpen={showingOlder}
            onOlderNotes={older ? () => setHistoryOpen((value) => !value) : undefined}
            onPlaylistDownload={onExportPlaylist}
            onNavigate={() => editor.save()}
            onClear={() => {
              setConfirm(true)
              setCleared(false)
              requestAnimationFrame(() => cancel.current?.focus())
            }}
          />
        </div>
      </header>
      {showingOlder && older ? (
        <NotesHistory older={older} copy={copy} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-7 md:overflow-y-auto">
          {editor.status === 'error' && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-100"
            >
              <p>
                {copy.saveError} {copy.draftKept}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (editor.save() && confirm) {
                    setCleared(true)
                    closeConfirm()
                  }
                }}
                className={`${noteButton} mt-2 border border-red-300 hover:bg-red-900/50`}
              >
                {copy.retry}
              </button>
            </div>
          )}
          {confirm && (
            <div
              role="group"
              aria-labelledby="confirm-clear-title"
              className="mb-5 rounded-lg border border-slate-500 bg-slate-800 p-4"
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeConfirm()
              }}
            >
              <h3 id="confirm-clear-title" className="font-semibold text-white">
                {copy.confirmClear}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{copy.clearHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  ref={cancel}
                  type="button"
                  onClick={closeConfirm}
                  className={`${noteButton} border border-slate-500 text-white`}
                >
                  {copy.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (clearNote(item.note)) {
                      setCleared(true)
                      closeConfirm()
                    }
                  }}
                  className={`${noteButton} bg-red-800 text-white hover:bg-red-700`}
                >
                  {copy.clear}
                </button>
              </div>
            </div>
          )}
          <textarea
            id="note-text"
            dir="auto"
            aria-labelledby="selected-note-title"
            value={editor.text}
            onChange={(event) => {
              setCleared(false)
              setConfirm(false)
              editor.change(event.target.value)
            }}
            onBlur={() => editor.save()}
            placeholder={copy.placeholder}
            className="min-h-80 w-full flex-1 resize-y bg-transparent md:min-h-40 text-base leading-8 text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      )}
    </section>
  )
}
