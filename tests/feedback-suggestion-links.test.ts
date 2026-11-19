import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playlist = 'https://www.youtube.com/playlist?list=PL12345678901234567890123456789012'
const video = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

function feedbackFields(type: string, lang: string) {
  const React = require('react')
  const values = [true, type, '', '', 'idle', false]
  let state = 0
  const fakeReact = {
    ...React,
    useState: () => [values[state++], () => {}],
    useRef: () => ({ current: null }),
    useEffect: () => {},
  }
  const modules: Record<string, unknown> = {
    'react': fakeReact,
    'next/navigation': { usePathname: () => '/' + lang },
  }
  function load(filename: string): Record<string, unknown> {
    const output = ts.transpileModule(readFileSync(resolve(root, filename), 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    const testModule = { exports: {} }
    runInNewContext(output, {
      exports: testModule.exports,
      module: testModule,
      URL,
      require: (id: string) => modules[id] ?? load(id.slice(2) + '.ts'),
    })
    return testModule.exports
  }
  const widget = load('app/shared/components/FeedbackWidget.tsx').default as (props: unknown) => unknown
  const t = JSON.parse(readFileSync(resolve(root, 'public/i18n/' + lang + '.json'), 'utf8'))
  t.__language = { dir: lang === 'ar' ? 'rtl' : 'ltr' }
  const tree = widget({ t, lang })
  type Element = {
    type?: string
    props?: { id?: string; htmlFor?: string; children?: unknown; [key: string]: unknown }
  }
  const elements: Element[] = []
  function visit(node: unknown) {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    const element = node as Element
    elements.push(element)
    visit(element.props?.children)
  }
  visit(tree)
  return {
    field: elements.find((element) => element.props?.id === 'feedback-message'),
    label: elements.find((element) => element.props?.htmlFor === 'feedback-message'),
    translations: t.feedback,
  }
}

test('suggestion fields render localized URL inputs, while other feedback retains its textarea', () => {
  for (const lang of ['ar', 'en', 'ja']) {
    for (const type of ['playlist', 'podcast']) {
      const { field, label, translations } = feedbackFields(type, lang)
      assert.equal(field?.type, 'input')
      assert.equal(field?.props?.type, 'url')
      assert.equal(field?.props?.dir, 'ltr')
      assert.equal(label?.props?.children, translations.linkLabel)
    }
    for (const type of ['app', 'complaint', 'general']) {
      const { field, label, translations } = feedbackFields(type, lang)
      assert.equal(field?.type, 'textarea')
      assert.equal(label?.props?.children, translations.messageLabel)
    }
  }
})

// Execute the real route. Only its external DB/webhook dependencies are replaced.
// No request is sent to production and no development server is started.
function route() {
  const delivered: { embeds: { description: string }[] }[] = []
  let allowed = true
  const process = { env: { DISCORD_FEEDBACK_WEBHOOK_URL: 'https://discord.example/webhook' } }
  const external = {
    '@/app/lib/supabase': { supabase: { rpc: async () => ({ data: allowed, error: null }) } },
  }
  function load(path: string): Record<string, unknown> {
    const filename = resolve(root, path)
    const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    const testModule = { exports: {} }
    runInNewContext(output, {
      exports: testModule.exports,
      module: testModule,
      process,
      URL,
      Request,
      Response,
      console,
      fetch: async (_url: string, init: { body: string }) => {
        delivered.push(JSON.parse(init.body))
        return new Response(null, { status: 204 })
      },
      require: (id: string) => {
        if (id in external) return external[id as keyof typeof external]
        if (id.startsWith('@/')) return load(id.slice(2) + '.ts')
        return load(resolve(dirname(path), id).replace(/\.ts$/, '') + '.ts')
      },
    })
    return testModule.exports
  }
  const { POST } = load('app/api/feedback/route.ts') as { POST: (request: Request) => Promise<Response> }
  return {
    delivered,
    limit: () => {
      allowed = false
    },
    post: (type: string, message: unknown) =>
      POST(
        new Request('https://salasel.app/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, message, contact: 'user@example.com', lang: 'ar' }),
        }),
      ),
  }
}

test('series and podcast suggestions reject prose instead of delivering it', async () => {
  const handler = route()
  for (const type of ['playlist', 'podcast']) {
    assert.equal((await handler.post(type, 'Please add a useful lecture')).status, 400)
  }
  assert.equal(handler.delivered.length, 0)
})

test('series suggestions accept supported YouTube playlist links and preserve the submitted link', async () => {
  const handler = route()
  for (const link of [playlist, playlist.replace('www.', 'm.'), video + '&list=PL12345678901234567890123456789012']) {
    assert.equal((await handler.post('playlist', '  ' + link + '  ')).status, 200)
    assert.equal(handler.delivered.at(-1)?.embeds[0].description, link)
  }
})

test('podcast suggestions accept supported watch and short YouTube links', async () => {
  const handler = route()
  for (const link of [video, 'https://youtu.be/dQw4w9WgXcQ?t=25', video.replace('www.', 'm.')]) {
    assert.equal((await handler.post('podcast', link)).status, 200)
    assert.equal(handler.delivered.at(-1)?.embeds[0].description, link)
  }
})

test('suggestion validation rejects missing, wrong-content and unsupported or disguised links', async () => {
  const handler = route()
  const invalid = [
    ['playlist', video],
    ['playlist', 'https://www.youtube.com/playlist?list=bad'],
    ['podcast', playlist],
    ['podcast', 'https://youtu.be/bad'],
    ['podcast', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'],
    ['podcast', 'https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ'],
    ['podcast', 'https://user@youtube.com/watch?v=dQw4w9WgXcQ'],
    ['podcast', 'javascript:alert(1)'],
    ['playlist', ''],
    ['podcast', null],
  ]
  for (const [type, message] of invalid) {
    assert.equal((await handler.post(type as string, message)).status, 400, String(message))
  }
  assert.equal(handler.delivered.length, 0)
})

test('app suggestions, complaints and general feedback still accept plain messages', async () => {
  const handler = route()
  for (const type of ['app', 'complaint', 'general']) {
    assert.equal((await handler.post(type, 'A normal feedback message')).status, 200)
  }
  assert.equal(handler.delivered.length, 3)
})

test('feedback length limits and existing rate limiting remain enforced', async () => {
  const handler = route()
  assert.equal((await handler.post('general', 'x'.repeat(2001))).status, 400)
  handler.limit()
  assert.equal((await handler.post('podcast', video)).status, 429)
  assert.equal(handler.delivered.length, 0)
})
