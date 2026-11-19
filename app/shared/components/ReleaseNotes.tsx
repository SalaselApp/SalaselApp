'use client'

import { useEffect, useRef } from 'react'
import type { LanguageCode, Translations } from '@/app/types'
import { usePreferencesStore } from '@/app/store/usePreferencesStore'
import { ANNOUNCED_RELEASE, releaseTracker } from '@/app/releases/announcement'

export default function ReleaseNotes({ lang, copy }: { lang: LanguageCode; copy: Translations['releaseNotes'] }) {
  const preferredLanguage = usePreferencesStore((state) => state.preferredLanguage)
  const dialog = useRef<HTMLDialogElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Let the existing first-visit language choice/redirect finish before announcing anything.
    if (!preferredLanguage || preferredLanguage !== lang || !dialog.current) return
    const element = dialog.current
    if (
      !element.open &&
      !releaseTracker.showOnce(ANNOUNCED_RELEASE, () => {
        if (!element.isConnected) return false
        element.showModal()
        return element.open
      })
    )
      return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirm.current?.focus({ preventScroll: true })
    const unlock = () => {
      document.body.style.overflow = previousOverflow
    }
    element.addEventListener('close', unlock)
    return () => {
      unlock()
      element.removeEventListener('close', unlock)
      // Native removal closes the dialog. Keeping it open here also preserves Strict Mode replay.
    }
  }, [lang, preferredLanguage])

  const highlights = [
    { icon: 'sticky_note_2', title: copy.notesTitle, body: copy.notesBody },
    { icon: 'podcasts', title: copy.podcastsTitle, body: copy.podcastsBody },
    { icon: 'view_list', title: copy.browsingTitle, body: copy.browsingBody },
    { icon: 'link', title: copy.suggestionsTitle, body: copy.suggestionsBody },
  ]
  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      aria-labelledby="release-notes-title"
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border-0 bg-slate-800 p-0 text-slate-100 shadow-2xl backdrop:bg-black/70"
    >
      <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-2">
            <h2 id="release-notes-title" className="text-2xl font-semibold leading-snug text-white">
              {copy.title}
            </h2>
            <span
              dir="ltr"
              className="mt-3 inline-block rounded-md bg-teal-950 px-2.5 py-1 text-xs font-medium tabular-nums text-teal-200"
            >
              {ANNOUNCED_RELEASE}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={copy.close}
            className="-me-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          >
            <span aria-hidden="true" className="material-icons-round text-2xl">
              close
            </span>
          </button>
        </header>
        <ul className="mb-8 mt-7 space-y-6">
          {highlights.map(({ icon, title, body }) => (
            <li key={icon} className="flex items-start gap-4">
              <span aria-hidden="true" className="material-icons-round mt-0.5 shrink-0 text-2xl text-teal-300">
                {icon}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-7 text-white">{title}</h3>
                <p className="mt-1 text-base leading-7 text-slate-300">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <button
          ref={confirm}
          type="button"
          onClick={close}
          className="min-h-11 w-full rounded-lg bg-teal-700 px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
        >
          {copy.confirm}
        </button>
      </div>
    </dialog>
  )
}
