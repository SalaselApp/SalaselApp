import NotesManager from '@/app/notes/NotesManager'
import { getTranslations } from '@/app/translate'
export default async function NotesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const t = getTranslations(lang)
  return <NotesManager lang={t.__language.code} />
}
