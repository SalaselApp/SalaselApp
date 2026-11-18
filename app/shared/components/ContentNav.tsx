'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

import brandMark from '@/app/icon.png'
import LanguageSwitcher from '@/app/shared/components/LanguageSwitcher'
import type { LanguageCode, Translations } from '@/app/types'

export default function ContentNav({ lang, t }: { lang: LanguageCode; t: Translations }) {
  const pathname = usePathname()
  const isPodcasts = pathname.startsWith(`/${lang}/podcast`)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-700/60 bg-slate-800">
      <nav
        aria-label={t.contentNavigationLabel}
        className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-4 sm:gap-2 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8"
      >
        <Link
          href={`/${lang}`}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-base"
        >
          <Image src={brandMark} alt="" width={32} height={32} className="size-8 object-contain" />
          <span>{t.appTitle}</span>
        </Link>
        <div className="flex min-w-0 items-center justify-center gap-1">
          <Link
            aria-current={!isPodcasts ? 'page' : undefined}
            href={`/${lang}`}
            className={`inline-flex min-h-11 items-center border-b-2 px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${!isPodcasts ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {t.seriesNavLabel}
          </Link>
          <Link
            aria-current={isPodcasts ? 'page' : undefined}
            href={`/${lang}/podcasts`}
            className={`inline-flex min-h-11 items-center border-b-2 px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isPodcasts ? 'border-primary text-white' : 'border-transparent text-slate-400 hover:text-white'}`}
          >
            {t.podcastsNavLabel}
          </Link>
        </div>
        <div className="justify-self-end">
          <LanguageSwitcher currentLang={lang} dir={t.__language.dir} compactOnMobile label={t.filterLanguageLabel} />
        </div>
      </nav>
    </header>
  )
}
