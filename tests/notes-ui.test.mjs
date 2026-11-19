import './tsx-loader.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const { default: NotesBrowser, DirectionArrow } = await import('../app/notes/NotesBrowser.tsx')
const { buildLibrary } = await import('../app/notes/library.ts')
const { getNotesCopy } = await import('../app/notes/copy.ts')
const note = { videoId: 'one', playlistId: 'series', text: 'An existing saved note', updatedAt: 1000 }
const catalog = {
  playlists: [{ id: 'series', title: 'Heart lessons', section: 'series' }],
  videos: [{ videoId: 'one', playlistId: 'series', title: 'Intention', position: 0 }],
  podcasts: [{ id: 'pod_1', videoId: 'podvideo', title: 'Conversation' }],
}
const records = [
  note,
  { ...note, videoId: 'podvideo', playlistId: null },
  { ...note, videoId: 'orphan', playlistId: null },
]

test('rendered Arabic and English browser has three separately labelled sections, selectable documents and disclosure controls', () => {
  for (const lang of ['ar', 'en']) {
    const copy = getNotesCopy(lang)
    const groups = buildLibrary(records, catalog, lang, copy)
    const html = renderToStaticMarkup(
      React.createElement(NotesBrowser, {
        groups,
        copy,
        lang,
        query: '',
        selectedId: 'one',
        onSelect: () => {},
        onExport: () => {},
      }),
    )
    for (const section of ['series', 'podcasts', 'standalone'])
      assert.ok(html.includes(`id="notes-section-${section}"`))
    assert.ok(html.includes(copy.series) && html.includes(copy.podcasts) && html.includes(copy.standalone))
    assert.match(html, /aria-expanded="false"/)
    assert.ok(!html.includes('Intention'))
    assert.ok(html.includes('Conversation'), 'unfoldered podcast notes stay visible')
  }
})
test('search reveals matching notes inside otherwise collapsed playlist folders', () => {
  const copy = getNotesCopy('en')
  const groups = buildLibrary(records, catalog, 'en', copy)
  const html = renderToStaticMarkup(
    React.createElement(NotesBrowser, {
      groups,
      copy,
      lang: 'en',
      query: 'Intention',
      selectedId: 'one',
      onSelect: () => {},
    }),
  )
  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /aria-current="true"/)
  assert.ok(html.includes('Intention'))
})

test('directional SVGs distinguish back and forward and mirror through RTL styles', () => {
  const back = renderToStaticMarkup(React.createElement(DirectionArrow, { back: true }))
  const forward = renderToStaticMarkup(React.createElement(DirectionArrow))
  assert.match(back, /rtl:rotate-180/)
  assert.match(back, /m15 18-6-6 6-6/)
  assert.match(forward, /m9 6 6 6-6 6/)
})

test('Notes page keeps search in the navigator and omits revoked Add, subtitle and storage footer controls', async () => {
  const { default: NotesManager } = await import('../app/notes/NotesManager.tsx')
  const copy = getNotesCopy('ar')
  const html = renderToStaticMarkup(React.createElement(NotesManager, { lang: 'ar' }))
  assert.match(html, /<aside[^>]*>[\s\S]*id="search-notes"/)
  assert.ok(!html.includes(copy.add))
  assert.ok(!html.includes(copy.subtitle))
  assert.ok(!html.includes(copy.local))
  assert.match(html, /md:order-2/)
  assert.match(html, /md:overflow-y-auto/)
})

test('one icon summary owns contextual note and full-playlist download actions', async () => {
  const { default: NotesMenu } = await import('../app/notes/NotesMenu.tsx')
  const copy = getNotesCopy('en')
  const props = {
    copy,
    canDownload: true,
    canClear: true,
    playlist: true,
    href: '/en/video/one',
    onDownload: () => {},
    onPlaylistDownload: () => {},
    onNavigate: () => {},
    onClear: () => {},
  }
  const html = renderToStaticMarkup(React.createElement(NotesMenu, props))
  assert.equal((html.match(/<summary/g) || []).length, 1)
  assert.match(html, /<summary[^>]*aria-label="More actions"/)
  assert.ok(html.includes(copy.downloadNote) && html.includes(copy.downloadPlaylist) && html.includes(copy.clear))
  for (const action of html.matchAll(/<(?:button|a)\b[^>]*>[\s\S]*?<\/(?:button|a)>/g))
    assert.match(action[0], /aria-hidden="true"[^>]*class="material-icons-round/, 'each action has an existing icon')
  const clear = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].find(([markup]) =>
    markup.includes(copy.clear),
  )[0]
  assert.match(clear, /text-red-300/)
  assert.ok(!clear.includes('text-slate-200'), 'destructive color has no competing default text class')
  const standalone = renderToStaticMarkup(React.createElement(NotesMenu, { ...props, playlist: false, href: null }))
  assert.ok(!standalone.includes(copy.downloadPlaylist) && !standalone.includes(copy.open))
})

test('older-note collisions expose a conditional menu action and a complete read-only text view', async () => {
  const { default: NotesMenu } = await import('../app/notes/NotesMenu.tsx')
  const { default: NotesHistory } = await import('../app/notes/NotesHistory.tsx')
  const copy = getNotesCopy('en')
  const props = {
    copy,
    canDownload: true,
    canClear: true,
    playlist: false,
    href: null,
    onDownload: () => {},
    onPlaylistDownload: () => {},
    onNavigate: () => {},
    onClear: () => {},
    onOlderNotes: () => {},
  }
  const menu = renderToStaticMarkup(React.createElement(NotesMenu, props))
  assert.ok(menu.includes(copy.olderNotes))
  assert.match(menu, />history<\/span>/)
  const current = renderToStaticMarkup(React.createElement(NotesMenu, { ...props, onOlderNotes: undefined }))
  assert.ok(!current.includes(copy.olderNotes))
  const content = '[01:20]\n  Full older note\n\n    More retained text\n  '
  const history = renderToStaticMarkup(
    React.createElement(NotesHistory, {
      copy,
      older: { videoId: 'one', playlistId: null, text: content, updatedAt: 1, blocks: [] },
    }),
  )
  assert.match(history, /readOnly=""/i)
  assert.ok(history.includes(content))
  assert.match(history, /dir="auto"/)
  const open = renderToStaticMarkup(React.createElement(NotesMenu, { ...props, olderOpen: true }))
  assert.ok(open.includes(copy.downloadOlder) && open.includes(copy.backToNote) && !open.includes(copy.clear))
})
