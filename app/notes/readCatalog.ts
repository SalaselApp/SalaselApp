import { supabase } from '@/app/lib/supabase'
import { createNotesCatalogReader } from './catalog'

/** Public metadata only, restricted to saved identities; note bodies never cross this boundary. */
export const readNotesCatalog = createNotesCatalogReader({
  async playlists(ids) {
    const { data, error } = await supabase.from('playlists').select('id,name').in('id', ids)
    return { ok: !error, items: (data ?? []).map((p) => ({ id: p.id, title: p.name, section: 'series' as const })) }
  },
  async podcasts(videoIds) {
    const { data, error } = await supabase
      .from('podcasts')
      .select('id,title,youtube_video_id')
      .in('youtube_video_id', videoIds)
    return { ok: !error, items: (data ?? []).map((p) => ({ id: p.id, videoId: p.youtube_video_id, title: p.title })) }
  },
  async videos(ids) {
    const { data, error } = await supabase.from('videos').select('id,playlist_id,title,position').in('id', ids)
    return {
      ok: !error,
      items: (data ?? []).map((v) => ({
        videoId: v.id,
        playlistId: v.playlist_id,
        title: v.title,
        position: v.position,
      })),
    }
  },
})
