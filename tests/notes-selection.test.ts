import assert from 'node:assert/strict'
import test from 'node:test'
import { noteIdFromHash, selectedNoteForLocation } from '../app/notes/selection.ts'
const note = { videoId: 'saved-one', playlistId: 'series', text: 'Retained content', updatedAt: 100 }

test('a direct note hash resolves again after saved-note hydration instead of staying an empty selection', () => {
  const hash = '#note=saved-one'
  assert.equal(selectedNoteForLocation(hash, {}, {}), null)
  assert.deepEqual(selectedNoteForLocation(hash, { 'saved-one': note }, {}), note)
})
test('location selection supports browser back to list, encoded identities and retained drafts', () => {
  assert.equal(noteIdFromHash(''), null)
  assert.equal(selectedNoteForLocation('', { 'saved-one': note }, {}), null)
  assert.equal(noteIdFromHash('#note=video%2Done'), 'video-one')
  assert.deepEqual(selectedNoteForLocation('#note=saved-one', {}, { 'saved-one': note }), note)
  assert.equal(selectedNoteForLocation('#note=unknown', { 'saved-one': note }, {}), null)
})
