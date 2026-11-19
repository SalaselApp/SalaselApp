import type { SelectedPlaylistParams } from '@/app/[lang]/playlist/[id]/params'

import React from 'react'
import SelectedPlaylistCard from '@/app/[lang]/playlist/[id]/components/SelectedPlaylistCard'
import SelectedPlaylistContent from '@/app/[lang]/playlist/[id]/components/SelectedPlaylistContent'
import RecordVisit from '@/app/[lang]/playlist/[id]/components/RecordVisit'
import { getPlaylist } from '@/app/db'
import { initialCatalogPage } from '@/app/catalog/server'
import type { CalculatedVideo } from '@/app/types'
import { getTranslations } from '@/app/translate'

export { generateStaticParams } from '@/app/[lang]/playlist/[id]/params'
export { generateMetadata } from '@/app/[lang]/playlist/[id]/meta'

export interface SelectedPlaylistPageProps {
  params: Promise<SelectedPlaylistParams>
}

const SelectedPlaylistPage: React.FC<SelectedPlaylistPageProps> = async ({ params }) => {
  const { lang, id } = await params
  const t = getTranslations(lang)
  const playlist = await getPlaylist(id)

  if (!playlist) {
    return <div>{t.playlistNotFound}</div>
  }

  const initial = await initialCatalogPage<CalculatedVideo>({
    kind: 'lessons',
    language: 'all',
    q: '',
    playlistId: playlist.id,
  })

  return (
    <>
      <RecordVisit playlistId={playlist.id} />
      <SelectedPlaylistCard playlist={playlist} t={t} />
      <SelectedPlaylistContent playlist={playlist} initial={initial} t={t} />
    </>
  )
}

export default SelectedPlaylistPage
