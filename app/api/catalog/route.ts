import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'
import { parseCatalogQuery } from '@/app/catalog/paging'
import { readCatalogPage } from '@/app/catalog/read'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  let query
  try {
    const text = await request.text()
    if (text.length > 100_000) return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    query = parseCatalogQuery(JSON.parse(text))
  } catch {
    return NextResponse.json({ error: 'Invalid catalog request' }, { status: 400 })
  }
  try {
    return NextResponse.json(await readCatalogPage(query, supabase), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Catalog unavailable' }, { status: 503 })
  }
}
