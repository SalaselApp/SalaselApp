/** Bump only when the announcement content changes, independently of package versions. */
export const ANNOUNCED_RELEASE = '1.2.0'
const KEY_PREFIX = 'salasel-release-seen:'
interface AnnouncementStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Browser-session fallback keeps blocked storage from reopening the same announcement on navigation. */
export function createReleaseTracker(storage: () => AnnouncementStorage | null) {
  const seen = new Set<string>()
  return {
    showOnce(release: string, show: () => boolean): boolean {
      if (seen.has(release)) return false
      try {
        if (storage()?.getItem(KEY_PREFIX + release) === '1') {
          seen.add(release)
          return false
        }
      } catch {
        // Use memory when browser storage is unavailable.
      }
      try {
        if (!show()) return false
      } catch {
        return false
      }
      seen.add(release)
      try {
        storage()?.setItem(KEY_PREFIX + release, '1')
      } catch {
        // The dialog was shown; this browser session still remembers it.
      }
      return true
    },
  }
}

// Creating the tracker is safe on the server: the provider is called only when showing in an effect.
export const releaseTracker = createReleaseTracker(() => window.localStorage)
