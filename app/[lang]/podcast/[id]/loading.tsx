export default function PodcastLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8" aria-busy="true">
      <div className="motion-safe:animate-pulse" aria-hidden="true">
        <div className="mb-4 h-11 w-40 rounded bg-slate-800" />
        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-700 lg:flex-row">
          <div className="space-y-5 p-6 lg:w-1/2">
            <div className="h-9 w-3/4 rounded bg-slate-800" />
            <div className="h-11 w-36 rounded-full bg-slate-800" />
            <div className="h-20 rounded bg-slate-800" />
            <div className="h-40 rounded bg-slate-800" />
          </div>
          <div className="aspect-video bg-slate-800 lg:w-1/2" />
        </div>
      </div>
    </main>
  )
}
