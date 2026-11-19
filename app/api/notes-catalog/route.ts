import { readNotesCatalog } from '@/app/notes/readCatalog'
import { parseMetadataRequest } from '@/app/notes/catalog'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  let input
  try {
    input = parseMetadataRequest(await request.json())
  } catch {
    return Response.json({ error: 'Invalid metadata identities' }, { status: 400 })
  }
  try {
    return Response.json(await readNotesCatalog(input))
  } catch {
    return Response.json({ error: 'Content details unavailable' }, { status: 503 })
  }
}
