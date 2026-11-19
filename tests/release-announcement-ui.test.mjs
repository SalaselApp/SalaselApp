import './tsx-loader.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const { default: ReleaseNotes } = await import('../app/shared/components/ReleaseNotes.tsx')
const { getTranslations } = await import('../app/translate.ts')

test('release dialog SSR stays closed with localized accessible controls and four simple highlights', () => {
  for (const lang of ['ar', 'en', 'ja']) {
    const t = getTranslations(lang)
    const html = renderToStaticMarkup(React.createElement(ReleaseNotes, { lang, copy: t.releaseNotes }))
    assert.match(html, /<dialog[^>]*aria-labelledby="release-notes-title"/)
    assert.doesNotMatch(html, /<dialog[^>]*\bopen(?:[ =>])/)
    assert.doesNotMatch(html, /<dialog[^>]*class="[^"]*\bflex\b/)
    assert.ok(html.includes(t.releaseNotes.title) && html.includes(t.releaseNotes.confirm))
    assert.ok(html.includes(t.releaseNotes.close))
    assert.ok(html.includes(t.releaseNotes.podcastsTitle) && html.includes(t.releaseNotes.podcastsBody))
    assert.equal((html.match(/<li\b/g) || []).length, 4)
    assert.match(html, /dir="ltr"[^>]*>1\.2\.0/)
    assert.match(html, /aria-hidden="true"/)
  }
})
