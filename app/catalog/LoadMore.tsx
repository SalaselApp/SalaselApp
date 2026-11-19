'use client'

import { useEffect, useRef } from 'react'
import { catalogCopy } from './copy'
import type { LanguageCode } from '../types'
export default function LoadMore({
  loaded,
  loading,
  error,
  hasMore,
  count,
  onLoad,
  lang,
}: {
  loaded: boolean
  loading: boolean
  error: boolean
  hasMore: boolean
  count: number
  onLoad: () => Promise<void>
  lang: LanguageCode
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const copy = catalogCopy(lang)
  useEffect(() => {
    if (!loaded || loading || error || !hasMore || !sentinel.current || typeof IntersectionObserver === 'undefined')
      return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void onLoad()
      },
      { rootMargin: '240px' },
    )
    observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [loaded, loading, error, hasMore, onLoad])
  return (
    <div ref={sentinel} className="mt-8 flex min-h-20 flex-col items-center justify-center gap-3" aria-live="polite">
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {copy.error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-slate-400">
          {copy.loading}
        </p>
      )}
      {!loading && (error || hasMore) && (
        <button
          type="button"
          onClick={() => void onLoad()}
          className="min-h-11 rounded-md border border-slate-600 px-5 py-2 text-sm text-slate-200 hover:border-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          {error ? copy.retry : copy.more}
        </button>
      )}
      {loaded && !loading && !error && !hasMore && count > 0 && <p className="text-sm text-slate-400">{copy.end}</p>}
      {loaded && !loading && !error && count === 0 && (
        <p role="status" className="py-8 text-slate-400">
          {copy.empty}
        </p>
      )}
    </div>
  )
}
