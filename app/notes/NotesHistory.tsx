import type { LegacyDocument } from './legacy'
import type { NotesCopy } from './copy'

/** A history projection only: no onChange, restore or canonical-write action. */
export default function NotesHistory({ older, copy }: { older: LegacyDocument; copy: NotesCopy }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-7">
      <p id="older-notes-label" className="mb-4 text-sm text-slate-400">
        {copy.olderReadOnly}
      </p>
      <textarea
        readOnly
        dir="auto"
        aria-labelledby="older-notes-label"
        value={older.text}
        className="min-h-80 w-full flex-1 resize-y bg-transparent text-base leading-8 text-slate-100 focus:outline-none md:min-h-40"
      />
    </div>
  )
}
