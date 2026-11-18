export default function PodcastWatchLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8" aria-busy="true">
      <div className="motion-safe:animate-pulse" aria-hidden="true">
        <div className="mb-4 h-11 w-40 rounded bg-slate-800" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="aspect-video rounded-xl bg-slate-800" />
            <div className="mt-4 h-7 w-2/3 rounded bg-slate-800" />
          </div>
          <div className="min-h-72 rounded-xl bg-slate-800" />
        </div>
      </div>
    </main>
  )
}
