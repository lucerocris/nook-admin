import { Skeleton } from "@/components/ui/skeleton"

// Same shape as the loaded queue: title and summary, status tabs, toolbar,
// then one card of ruled rows.
export default function ReviewsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      <div className="flex gap-5 border-b pb-2.5">
        {[16, 18, 24, 18, 18, 10].map((w, i) => (
          <Skeleton key={i} className="h-5 rounded-md" style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 min-w-0 flex-1 basis-full rounded-lg sm:basis-64" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="hidden h-10 border-b bg-muted/60 sm:block" />
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-full max-w-sm rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
              </div>
              <Skeleton className="hidden h-4 w-24 rounded-md sm:block" />
              <Skeleton className="hidden h-4 w-10 rounded-md sm:block" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="hidden h-4 w-8 rounded-md sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
