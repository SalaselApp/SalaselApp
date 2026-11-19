'use client'

import { useState } from 'react'
import type { NoteGroup, NoteItem, NoteSection } from './library'
import type { NotesCopy } from './copy'

export const noteButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50'
export function DirectionArrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0 rtl:rotate-180"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={back ? 'm15 18-6-6 6-6' : 'm9 6 6 6-6 6'} />
    </svg>
  )
}
export function NoteFileIcon({ folder = false }: { folder?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      {folder ? (
        <path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z" />
      ) : (
        <>
          <path d="M6 3h8l4 4v14H6Z" />
          <path d="M14 3v5h4" />
        </>
      )}
    </svg>
  )
}
export function noteDate(timestamp: number, lang: string, copy: NotesCopy): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return copy.unknownDate
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
  } catch {
    return copy.unknownDate
  }
}
export default function NotesBrowser({
  groups,
  selectedId,
  onSelect,
  query,
  copy,
}: {
  groups: NoteGroup[]
  selectedId?: string
  onSelect: (item: NoteItem) => void
  query: string
  lang: string
  copy: NotesCopy
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const sections: NoteSection[] = ['series', 'podcasts', 'standalone']
  return (
    <div className="space-y-7">
      {sections.map((section) => {
        const entries = groups.filter((group) => group.section === section)
        if (!entries.length) return null
        return (
          <section
            key={section}
            aria-labelledby={`notes-section-${section}`}
            className="border-t border-slate-600 pt-5 first:border-t-0 first:pt-0"
          >
            <h2
              id={`notes-section-${section}`}
              className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-slate-100"
            >
              <span>{copy[section]}</span>
              <span className="text-xs font-normal tabular-nums text-slate-400">
                {entries.reduce((sum, group) => sum + group.items.length, 0)}
              </span>
            </h2>
            <div className="space-y-3">
              {entries.map((group) => {
                const open = !group.playlistId || !!query.trim() || expanded[group.id] === true
                return (
                  <div
                    key={group.id}
                    className={
                      group.playlistId ? 'overflow-hidden rounded-lg border border-slate-600 bg-slate-900/30' : ''
                    }
                  >
                    {group.playlistId && (
                      <button
                        type="button"
                        onClick={() => setExpanded({ ...expanded, [group.id]: !open })}
                        aria-expanded={open}
                        aria-controls={`group-${encodeURIComponent(group.id)}`}
                        className="flex min-h-14 w-full items-center gap-2 px-3 py-3 text-start text-sm font-medium leading-relaxed text-slate-100 hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400"
                      >
                        <NoteFileIcon folder />
                        <span dir="auto" className="min-w-0 flex-1 break-words">
                          {group.title}
                        </span>
                        <span className={open ? 'rotate-90 rtl:-rotate-90' : ''}>
                          <DirectionArrow />
                        </span>
                      </button>
                    )}
                    {open && (
                      <ul
                        id={`group-${encodeURIComponent(group.id)}`}
                        className={group.playlistId ? 'border-t border-slate-700 py-1' : ''}
                      >
                        {group.items.map((item) => (
                          <li key={item.note.videoId}>
                            <button
                              type="button"
                              aria-current={selectedId === item.note.videoId ? 'true' : undefined}
                              onClick={() => onSelect(item)}
                              className={`flex min-h-14 w-full items-start gap-2 px-3 py-3 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400 ${selectedId === item.note.videoId ? 'bg-teal-900/50 text-white' : 'text-slate-200 hover:bg-slate-700/40'}`}
                            >
                              <span className={group.playlistId ? 'ms-3 mt-1' : 'mt-1'}>
                                <NoteFileIcon />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span dir="auto" className="block break-words text-sm leading-relaxed">
                                  {item.title}
                                </span>
                                {item.unavailable && (
                                  <bdi className="mt-1 block truncate text-xs text-slate-400">{item.note.videoId}</bdi>
                                )}
                                <span dir="auto" className="mt-1 block truncate text-xs leading-relaxed text-slate-400">
                                  {item.note.text || (item.olderText ? copy.olderNotes : '')}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
