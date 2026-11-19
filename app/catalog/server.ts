import { supabase } from '@/app/lib/supabase'
import { readCatalogPage } from './read'
import type { CatalogPage, CatalogQuery } from './paging'

export async function initialCatalogPage<T>(
  query: CatalogQuery,
): Promise<{ key: string; page?: CatalogPage<T>; error?: boolean }> {
  const key = JSON.stringify(query)
  try {
    return { key, page: (await readCatalogPage(query, supabase)) as CatalogPage<T> }
  } catch {
    return { key, error: true }
  }
}
