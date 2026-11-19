import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPlaylistNotesMarkdown, buildVideoNoteMarkdown } from '../app/notes.ts'
const note = { videoId: 'orphan', playlistId: 'missing', text: 'Keep this text', updatedAt: 1000 }
test('video export uses a readable fallback heading without losing identity or content', () => {
  const markdown = buildVideoNoteMarkdown(note, 'Untitled video')
  assert.match(markdown, /## \[Untitled video\]/)
  assert.match(markdown, /watch\?v=orphan/)
  assert.match(markdown, /Keep this text/)
})
test('playlist export includes supplied names and preserves caller video ordering', () => {
  const markdown = buildPlaylistNotesMarkdown('missing', [note, { ...note, videoId: 'second', text: 'Second' }], {
    title: 'Unavailable series',
    videoTitles: { orphan: 'Untitled video', second: 'Another video' },
  })
  assert.match(markdown, /# Salasel notes — Unavailable series/)
  assert.ok(markdown.indexOf('Untitled video') < markdown.indexOf('Another video'))
})
test('legacy export signatures and blank-record filtering remain compatible', () => {
  assert.match(buildVideoNoteMarkdown(note), /## \[orphan\]/)
  const markdown = buildPlaylistNotesMarkdown('missing', [note, { ...note, videoId: 'cleared', text: '' }])
  assert.match(markdown, /playlist missing/)
  assert.doesNotMatch(markdown, /watch\?v=cleared/)
})
