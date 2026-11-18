import { Suspense, type ReactNode } from 'react'
import type { Translations } from '@/app/types'
import SearchBar from './SearchBar'

export default function CatalogPage({
  title,
  t,
  placeholder,
  children,
}: {
  title: string
  t: Translations
  placeholder?: string
  children: ReactNode
}) {
  return (
    <main className="catalogue-page mx-auto min-h-[calc(100svh-6rem)] w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        <div className="mx-auto mt-5 max-w-md">
          <Suspense fallback={<div className="h-11 rounded-md bg-slate-800" />}>
            <SearchBar t={t} placeholder={placeholder} />
          </Suspense>
        </div>
      </header>
      {children}
    </main>
  )
}
