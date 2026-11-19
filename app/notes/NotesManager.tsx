'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNotesStore } from '@/app/store/useNotesStore'
import type { NoteRecord } from '@/app/types'
import { buildPlaylistNotesMarkdown, MARKDOWN_MIME, playlistNotesFileName } from '@/app/notes'
import { downloadTextFile } from '@/app/utils'
import {
  buildLibrary,
  libraryNotes,
  playlistExportGroup,
  EMPTY_CATALOG,
  resolveNote,
  searchLibrary,
  type NoteGroup,
  type NoteItem,
  type NotesCatalog,
} from './library'
import { selectedNoteForLocation, setNoteLocation, useNoteLocation } from './selection'
import { olderNotesFor } from './legacy'
import { metadataBatches } from './catalog'
import { getNotesCopy } from './copy'
import NotesBrowser, { noteButton } from './NotesBrowser'
import NotesEditor from './NotesEditor'

export default function NotesManager({ lang }: { lang: string }) {
  const copy = getNotesCopy(lang)
  const notes = useNotesStore((s) => s.notes)
  const drafts = useNotesStore((s) => s.drafts)
  const legacy = useNotesStore((s) => s.legacy)
  const hydrated = useNotesStore((s) => s.hydrated)
  const storageError = useNotesStore((s) => s.storageError)
  const [catalog, setCatalog] = useState<NotesCatalog>(EMPTY_CATALOG)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [metadataError, setMetadataError] = useState(false)
  const [query, setQuery] = useState('')
  const locationHash = useNoteLocation()
  const selection = selectedNoteForLocation(locationHash, notes, drafts)
  const listScroll = useRef(0)
  const libraryHeading = useRef<HTMLHeadingElement>(null)
  const selectedId = selection?.videoId

  const identityKey = useMemo(
    () =>
      JSON.stringify(
        Object.values({ ...drafts, ...notes }).map(({ videoId, playlistId }) => ({ videoId, playlistId })),
      ),
    [notes, drafts],
  )
  const loadCatalog = useCallback(
    async (signal?: AbortSignal) => {
      const batches = metadataBatches(JSON.parse(identityKey))
      setCatalogLoading(!!batches.length)
      const merged: NotesCatalog = { playlists: [], videos: [], podcasts: [] }
      let incomplete = false
      for (const batch of batches) {
        try {
          const response = await fetch('/api/notes-catalog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batch),
            signal,
          })
          if (!response.ok) throw new Error('Unavailable metadata')
          const result: NotesCatalog = await response.json()
          merged.playlists.push(...result.playlists)
          merged.videos.push(...result.videos)
          merged.podcasts.push(...result.podcasts)
          incomplete ||= !!result.incomplete
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return
          incomplete = true
        }
      }
      if (!signal?.aborted) {
        setCatalog(merged)
        setMetadataError(incomplete)
        setCatalogLoading(false)
      }
    },
    [identityKey],
  )
  useEffect(() => {
    const controller = new AbortController()
    void loadCatalog(controller.signal)
    return () => controller.abort()
  }, [loadCatalog])
  useEffect(() => {
    const pop = () => {
      const id = new URLSearchParams(window.location.hash.slice(1)).get('note')
      if (!id) requestAnimationFrame(() => window.scrollTo({ top: listScroll.current }))
    }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [])

  // Unsaved first documents remain findable after a failed save and a trip back to the list.
  const visibleNotes = useMemo(() => libraryNotes(notes, drafts), [drafts, notes])
  const olderNotes = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(legacy).flatMap((id) => {
          const older = olderNotesFor(id, notes, legacy)
          return older ? [[id, older.text]] : []
        }),
      ),
    [legacy, notes],
  )
  const groups = useMemo(
    () => buildLibrary(visibleNotes, catalog, lang, copy, olderNotes),
    [visibleNotes, catalog, lang, copy, olderNotes],
  )
  const results = useMemo(() => searchLibrary(groups, query, copy), [groups, query, copy])
  const current = selection
    ? resolveNote(notes[selection.videoId] ?? drafts[selection.videoId] ?? selection, catalog, lang, copy)
    : null

  const select = (note: NoteRecord, metadata?: NotesCatalog) => {
    if (metadata)
      setCatalog((current) => ({
        playlists: [...current.playlists, ...metadata.playlists],
        videos: [...current.videos, ...metadata.videos],
        podcasts: [...current.podcasts, ...metadata.podcasts],
      }))
    listScroll.current = window.scrollY
    setNoteLocation(note.videoId)
    requestAnimationFrame(() => document.getElementById('note-text')?.focus({ preventScroll: true }))
  }
  const back = () => {
    setNoteLocation(null, true)
    requestAnimationFrame(() => {
      libraryHeading.current?.focus({ preventScroll: true })
      window.scrollTo({ top: listScroll.current })
    })
  }
  const exportGroup = (group: NoteGroup) => {
    if (!group.playlistId) return
    // The visible group may contain only search matches or an unsaved draft.
    const fullGroup = playlistExportGroup(group.playlistId, notes, catalog, lang, copy)
    if (!fullGroup?.items.length) return
    const saved = fullGroup.items.map((item) => item.note)
    downloadTextFile(
      playlistNotesFileName(group.playlistId),
      buildPlaylistNotesMarkdown(group.playlistId, saved, {
        title: fullGroup.title,
        videoTitles: Object.fromEntries(fullGroup.items.map((item) => [item.note.videoId, item.title])),
      }),
      MARKDOWN_MIME,
    )
  }
  const retry = () => {
    useNotesStore.getState().hydrate()
    void loadCatalog()
  }
  const direction = lang === 'ar' ? 'rtl' : 'ltr'
  const playlistGroup = current?.note.playlistId
    ? playlistExportGroup(current.note.playlistId, notes, catalog, lang, copy)
    : undefined
  return (
    <main className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 lg:px-8">
      <h1 ref={libraryHeading} tabIndex={-1} className="sr-only">
        {copy.title}
      </h1>
      <div
        dir="ltr"
        className={`grid min-w-0 grid-cols-1 items-start gap-5 ${lang === 'ar' ? 'md:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]' : 'md:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]'}`}
      >
        <aside
          dir={direction}
          aria-label={copy.title}
          className={`${selection ? 'hidden md:flex' : 'flex'} ${lang === 'ar' ? 'md:order-2' : 'md:order-1'} min-w-0 w-full flex-col rounded-xl border border-slate-700 bg-slate-800/50 md:sticky md:top-24 md:h-[calc(100dvh-8rem)] md:overflow-hidden`}
        >
          <div className="shrink-0 border-b border-slate-700 bg-slate-800 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">{copy.nav}</h2>
              <span className="text-xs tabular-nums text-slate-400">
                {groups.reduce((sum, group) => sum + group.items.length, 0)}
              </span>
            </div>
            <label htmlFor="search-notes" className="sr-only">
              {copy.search}
            </label>
            <div className="flex items-center gap-1">
              <input
                id="search-notes"
                type="text"
                role="searchbox"
                enterKeyHint="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={copy.clearSearch}
                  title={copy.clearSearch}
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <svg
                    aria-hidden="true"
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="min-h-0 min-w-0 flex-1 p-4 md:overflow-y-auto">
            {(metadataError || storageError) && (
              <div role="status" className="mb-4 text-xs leading-relaxed text-slate-300">
                <p>{storageError ? copy.storageError : copy.metadataError}</p>
                <button type="button" onClick={retry} className={`${noteButton} -ms-3 text-teal-200 hover:text-white`}>
                  {copy.retry}
                </button>
              </div>
            )}
            {!hydrated ? (
              <p role="status" className="py-5 text-sm text-slate-300">
                {copy.loading}
              </p>
            ) : results.length ? (
              <NotesBrowser
                groups={results}
                selectedId={selectedId}
                onSelect={(item: NoteItem) => select(item.note)}
                query={query}
                lang={lang}
                copy={copy}
              />
            ) : (
              <div className="py-8 text-center">
                <h2 className="text-sm font-medium text-slate-200">
                  {query ? copy.noResults : catalogLoading ? copy.loading : copy.empty}
                </h2>
                {!query && !catalogLoading && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{copy.emptyHint}</p>
                )}
              </div>
            )}
          </div>
        </aside>
        <div
          dir={direction}
          className={`min-w-0 w-full ${lang === 'ar' ? 'md:order-1' : 'md:order-2'} ${current ? '' : 'hidden md:block'}`}
        >
          {current ? (
            <NotesEditor
              key={current.note.videoId}
              item={current}
              lang={lang}
              copy={copy}
              onBack={back}
              hasPlaylistExport={!!playlistGroup?.items.length}
              older={olderNotesFor(current.note.videoId, notes, legacy)}
              onExportPlaylist={() => {
                if (playlistGroup) exportGroup(playlistGroup)
              }}
            />
          ) : (
            <div className="flex min-h-[calc(100dvh-10rem)] items-center justify-center md:h-[calc(100dvh-8rem)] md:min-h-0 rounded-xl border border-slate-700 px-8 text-center text-sm text-slate-400">
              {copy.select}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
