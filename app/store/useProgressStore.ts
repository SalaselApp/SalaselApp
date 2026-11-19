import { archiveBeforeProgressWrite } from '../notes/legacyArchive.ts'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { mergeActivity, mergeRecentActivity, migrateProgressState, type ActivityRecord } from '@/app/activity/contract'

/** Legacy extension-compatible playlist observation shape. */
export interface LastWatched {
  playlistId: string
  videoId: string
  playlistName: string
  thumbnailId?: string
  updatedAt: number
}

export interface ProgressState {
  completedVideos: Record<string, Set<string>>
  recentPlaylists: string[]
  /** Retained for older extension builds; new consumers use latestActivity. */
  lastWatched: LastWatched | null
  latestActivity: ActivityRecord | null
  activityHistory: ActivityRecord[]
  toggleVideoCompleted: (playlistId: string, videoId: string) => void
  recordPlaylistVisit: (playlistId: string) => void
  recordLastWatched: (playlistId: string, videoId: string, playlistName: string) => void
  /** Called only from a confirmed YouTube player-start event. */
  recordPlayback: (activity: ActivityRecord) => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      completedVideos: {},
      recentPlaylists: [],
      lastWatched: null,
      latestActivity: null,
      activityHistory: [],
      toggleVideoCompleted: (playlistId, videoId) =>
        set((state) => {
          const playlistCompleted = new Set(state.completedVideos[playlistId] || [])
          if (playlistCompleted.has(videoId)) playlistCompleted.delete(videoId)
          else playlistCompleted.add(videoId)
          return { completedVideos: { ...state.completedVideos, [playlistId]: playlistCompleted } }
        }),
      recordPlaylistVisit: (playlistId) =>
        set((state) => {
          const filtered = state.recentPlaylists.filter((id) => id !== playlistId)
          return { recentPlaylists: [playlistId, ...filtered].slice(0, 10) }
        }),
      // Kept for external legacy callers, but never called on route open.
      recordLastWatched: (playlistId, videoId, playlistName) =>
        set(() => ({
          lastWatched: { playlistId, videoId, playlistName, thumbnailId: videoId, updatedAt: Date.now() },
        })),
      recordPlayback: (activity) =>
        set((state) => {
          const latestActivity = mergeActivity(state.latestActivity, activity, Date.now())
          if (latestActivity === state.latestActivity) return state
          const lastWatched =
            activity.kind === 'playlist-video' && activity.playlistId
              ? {
                  playlistId: activity.playlistId,
                  videoId: activity.mediaId,
                  playlistName: activity.playlistName ?? activity.title,
                  thumbnailId: activity.thumbnailId,
                  updatedAt: activity.playedAt,
                }
              : state.lastWatched
          const previousHistory = mergeRecentActivity(state.activityHistory, state.latestActivity)
          return { latestActivity, lastWatched, activityHistory: mergeRecentActivity(previousHistory, activity) }
        }),
    }),
    {
      name: 'progress-storage',
      version: 1,
      migrate: (persisted) => migrateProgressState(persisted) as unknown as ProgressState,
      storage: createJSONStorage(
        () => ({
          getItem: (key) => localStorage.getItem(key),
          setItem: (key, value) => {
            archiveBeforeProgressWrite(localStorage)
            localStorage.setItem(key, value)
          },
          removeItem: (key) => {
            archiveBeforeProgressWrite(localStorage)
            localStorage.removeItem(key)
          },
        }),
        {
          replacer: (key, value) =>
            key === 'completedVideos'
              ? Object.fromEntries(
                  Object.entries(value as Record<string, Set<string>>).map(([playlistId, videoSet]) => [
                    playlistId,
                    Array.from(videoSet as Set<string>),
                  ]),
                )
              : value,
          reviver: (key, value) => {
            if (key !== 'completedVideos') return value
            const completed: Record<string, Set<string>> = {}
            for (const playlistId in value as Record<string, string[]>)
              if (Array.isArray((value as Record<string, string[]>)[playlistId]))
                completed[playlistId] = new Set((value as Record<string, string[]>)[playlistId])
            return completed
          },
        },
      ),
    },
  ),
)
