'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { CatalogSession } from './session'
import type { CatalogPage, CatalogQuery } from './paging'

export interface InitialCatalogPage<T> {
  key: string
  page?: CatalogPage<T>
  error?: boolean
}
export function catalogQueryKey(query: CatalogQuery): string {
  return JSON.stringify(query)
}
export function useCatalogPage<T extends { id: string }>(query: CatalogQuery, initial?: InitialCatalogPage<T>) {
  const key = catalogQueryKey(query)
  // The key is the complete validated filter state; old sessions cannot update a new query.
  const session = useMemo(() => {
    const request = JSON.parse(key) as CatalogQuery
    const matching = initial?.key === key ? initial : undefined
    return new CatalogSession<T>(
      async (cursor, signal) => {
        const response = await fetch('/api/catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...request, ...(cursor ? { cursor } : {}) }),
          signal,
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Catalog unavailable')
        return response.json() as Promise<CatalogPage<T>>
      },
      matching?.page,
      matching?.error,
    )
    // Initial data is immutable for this exact query; a route/search change creates a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)
  useEffect(() => {
    if (!session.getSnapshot().loaded && !session.getSnapshot().error) void session.loadMore()
    return session.cancel
  }, [session])
  return { ...state, loadMore: session.loadMore }
}
