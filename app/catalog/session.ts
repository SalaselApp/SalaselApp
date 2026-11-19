import { appendCatalogPage, type CatalogPage } from './paging.ts'

export interface CatalogSnapshot<T> extends CatalogPage<T> {
  loaded: boolean
  loading: boolean
  error: boolean
}

/** One filter/query session. Cancellation makes late responses harmless, including React effect replays. */
export class CatalogSession<T extends { id: string }> {
  private state: CatalogSnapshot<T>
  private generation = 0
  private controller?: AbortController
  private listeners = new Set<() => void>()
  private fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<CatalogPage<T>>
  constructor(
    fetchPage: (cursor: string | null, signal: AbortSignal) => Promise<CatalogPage<T>>,
    initial?: CatalogPage<T>,
    initialError = false,
  ) {
    this.fetchPage = fetchPage
    this.state = {
      items: initial?.items ?? [],
      nextCursor: initial?.nextCursor ?? null,
      loaded: !!initial,
      loading: false,
      error: initialError,
    }
  }
  subscribe = (notify: () => void) => {
    this.listeners.add(notify)
    return () => {
      this.listeners.delete(notify)
    }
  }
  getSnapshot = () => this.state
  private update(next: Partial<CatalogSnapshot<T>>) {
    this.state = { ...this.state, ...next }
    for (const notify of this.listeners) notify()
  }
  cancel = () => {
    this.generation++
    this.controller?.abort()
    this.update({ loading: false })
  }
  loadMore = async () => {
    if (this.state.loading || (this.state.loaded && !this.state.nextCursor)) return
    const generation = ++this.generation
    this.controller = new AbortController()
    this.update({ loading: true, error: false })
    try {
      const page = await this.fetchPage(this.state.nextCursor, this.controller.signal)
      if (generation !== this.generation) return
      this.update({
        items: appendCatalogPage(this.state.items, page.items),
        nextCursor: page.nextCursor,
        loaded: true,
        loading: false,
      })
    } catch {
      if (generation !== this.generation) return
      this.update({ error: true, loading: false })
    }
  }
}
