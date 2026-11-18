import type { CalculatedPlaylist, Translations } from '@/app/types'
import ContentDetails from '@/app/shared/components/ContentDetails'
import Librecounter from '@/app/shared/components/Librecounter'

export type SelectedPlaylistCardPlaylist = Pick<
  CalculatedPlaylist,
  | 'id'
  | 'name'
  | 'description'
  | 'thumbnailId'
  | 'participants'
  | 'videoCount'
  | 'duration'
  | 'type'
  | 'style'
  | 'categories'
  | 'classes'
  | 'startDate'
  | 'endDate'
>
export interface SelectedPlaylistCardProps {
  playlist: SelectedPlaylistCardPlaylist
  t: Translations
}

export default function SelectedPlaylistCard({ playlist, t }: SelectedPlaylistCardProps) {
  return (
    <ContentDetails
      kind="series"
      content={{ ...playlist, title: playlist.name }}
      t={t}
      collection={{ videoCount: playlist.videoCount, startDate: playlist.startDate, endDate: playlist.endDate }}
      descriptionSuffix={<Librecounter />}
    />
  )
}
