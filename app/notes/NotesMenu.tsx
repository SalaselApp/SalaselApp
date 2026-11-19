'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type { NotesCopy } from './copy'

function MenuIcon({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="material-icons-round size-5 shrink-0 text-xl leading-none">
      {name}
    </span>
  )
}

export default function NotesMenu({
  copy,
  canDownload,
  canClear,
  playlist,
  href,
  onDownload,
  onPlaylistDownload,
  onNavigate,
  onClear,
  onOlderNotes,
  olderOpen = false,
}: {
  copy: NotesCopy
  canDownload: boolean
  canClear: boolean
  playlist: boolean
  href: string | null
  onDownload: () => void
  onPlaylistDownload: () => void
  onNavigate: () => void
  onClear: () => void
  onOlderNotes?: () => void
  olderOpen?: boolean
}) {
  const menu = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const close = () => {
    if (menu.current) menu.current.open = false
  }
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) close()
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  const item =
    'flex min-h-11 w-full items-center gap-3 px-4 py-3 text-start text-sm transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <details
      ref={menu}
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          close()
          trigger.current?.focus()
        }
      }}
    >
      <summary
        ref={trigger}
        aria-label={copy.more}
        title={copy.more}
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </summary>
      <div
        className="absolute end-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-600 bg-slate-800 text-slate-200 shadow-xl"
        aria-label={copy.more}
      >
        <button
          type="button"
          className={item}
          disabled={!canDownload}
          onClick={() => {
            onDownload()
            close()
          }}
        >
          <MenuIcon name="download" />
          <span>{olderOpen ? copy.downloadOlder : copy.downloadNote}</span>
        </button>
        {onOlderNotes && (
          <button
            type="button"
            className={item}
            onClick={() => {
              onOlderNotes()
              close()
            }}
          >
            <MenuIcon name={olderOpen ? 'description' : 'history'} />
            <span>{olderOpen ? copy.backToNote : copy.olderNotes}</span>
          </button>
        )}
        {playlist && (
          <button
            type="button"
            className={item}
            onClick={() => {
              onPlaylistDownload()
              close()
            }}
          >
            <MenuIcon name="download" />
            <span>{copy.downloadPlaylist}</span>
          </button>
        )}
        {href && (
          <Link
            href={href}
            className={item}
            onClick={() => {
              onNavigate()
              close()
            }}
          >
            <MenuIcon name="open_in_new" />
            <span>{copy.open}</span>
          </Link>
        )}
        {!olderOpen && (
          <div className="border-t border-slate-600">
            <button
              type="button"
              className={`${item} text-red-300 hover:text-red-200`}
              disabled={!canClear}
              onClick={() => {
                close()
                onClear()
              }}
            >
              <MenuIcon name="delete_outline" />
              <span>{copy.clear}</span>
            </button>
          </div>
        )}
      </div>
    </details>
  )
}
