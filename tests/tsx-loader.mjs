// Render React components under Node without starting a web server or browser.
import { registerHooks, createRequire } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import ts from 'typescript'
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const require = createRequire(path.join(root, 'app/static.ts'))
globalThis.require = require
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))) {
      const base = specifier.startsWith('@/')
        ? path.join(root, specifier.slice(2))
        : fileURLToPath(new URL(specifier, context.parentURL))
      for (const candidate of [base + '.ts', base + '.tsx', base + '.json', base + '/index.ts'])
        if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true }
    }
    try {
      return next(specifier, context)
    } catch (error) {
      if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:'))
        return { url: pathToFileURL(require.resolve(specifier)).href, shortCircuit: true }
      throw error
    }
  },
  load(url, context, next) {
    if (url.endsWith('.ts') || url.endsWith('.tsx'))
      return {
        format: 'module',
        shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      }
    return next(url, context)
  },
})
