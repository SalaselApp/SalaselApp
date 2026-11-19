import type { NotesStorage } from './repository.ts'
export const LEGACY_ARCHIVE_KEY = 'salasel-notes-legacy-archive-v1'
export type LegacySourceKey = 'salasel-video-notes' | 'progress-storage'
export interface LegacySnapshot {
  key: LegacySourceKey
  raw: string
  fingerprint: string
}
const sources: LegacySourceKey[] = ['salasel-video-notes', 'progress-storage']
function fingerprint(key: LegacySourceKey, raw: string): string | null {
  const parsed = JSON.parse(raw)
  const notes = key === 'progress-storage' ? parsed?.state?.notes : parsed
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return null
  if (
    !Object.values(notes).some(
      (value) =>
        Array.isArray(value) &&
        value.some((block) => block && typeof block.content === 'string' && block.content.trim()),
    )
  )
    return null
  return JSON.stringify(notes)
}
export function archivedSnapshots(storage: NotesStorage): LegacySnapshot[] {
  const raw = storage.getItem(LEGACY_ARCHIVE_KEY)
  if (!raw) return []
  const archive = JSON.parse(raw)
  if (
    archive?.version !== 1 ||
    !Array.isArray(archive.snapshots) ||
    archive.snapshots.some(
      (entry: LegacySnapshot) =>
        !entry ||
        !sources.includes(entry.key) ||
        typeof entry.raw !== 'string' ||
        typeof entry.fingerprint !== 'string',
    )
  )
    throw new Error('Unreadable legacy note archive')
  return archive.snapshots
}
/** Save exact source bytes once per distinct legacy-note set, before any source can be rewritten. */
export function ensureLegacyArchive(storage: NotesStorage, keys: LegacySourceKey[] = sources): void {
  const snapshots = [...archivedSnapshots(storage)]
  let changed = false
  for (const key of keys) {
    const raw = storage.getItem(key)
    if (!raw) continue
    const content = fingerprint(key, raw)
    if (!content || snapshots.some((snapshot) => snapshot.key === key && snapshot.fingerprint === content)) continue
    snapshots.push({ key, raw, fingerprint: content })
    changed = true
  }
  if (changed) storage.setItem(LEGACY_ARCHIVE_KEY, JSON.stringify({ version: 1, snapshots }))
}
/** Progress remains independently active; protect legacy notes before its next ordinary write. */
export function archiveBeforeProgressWrite(storage: NotesStorage): void {
  ensureLegacyArchive(storage, ['progress-storage'])
}
