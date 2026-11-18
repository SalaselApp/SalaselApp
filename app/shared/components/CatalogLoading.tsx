/** Route fallback mirrors the shared header, filters and card dimensions. */
export default function CatalogLoading() {
  return (
    <main
      className="mx-auto min-h-[calc(100svh-6rem)] w-full max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8"
      aria-busy="true"
    >
      <div className="motion-safe:animate-pulse" aria-hidden="true">
        <div className="mb-8 text-center">
          <div className="mx-auto h-9 w-40 rounded bg-slate-800" />
          <div className="mx-auto mt-5 max-w-md px-4">
            <div className="h-11 rounded-md bg-slate-800" />
          </div>
        </div>
        <div className="mb-12 flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-11 w-20 rounded-full bg-slate-800" />
            ))}
          </div>
          <div className="h-11 w-28 rounded-md bg-slate-800" />
        </div>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/50">
              <div className="aspect-video bg-slate-800" />
              <div className="p-4">
                <div className="h-14">
                  <div className="h-6 w-3/4 rounded bg-slate-800" />
                </div>
                <div className="mt-1 h-15 space-y-2">
                  <div className="h-4 rounded bg-slate-800" />
                  <div className="h-4 w-4/5 rounded bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
