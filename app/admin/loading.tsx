import { Skeleton } from "@/components/ui/skeleton"

// Generic admin page placeholder: title, a row of stat cards, then the main
// list, which is the shape most admin pages share.
export default function AdminLoading() {
  return (
    <div
      aria-busy
      aria-label="Loading"
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <Skeleton className="h-8 w-48 rounded-md" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full rounded-md" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border p-5">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-7 w-12 rounded-md" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b px-5 py-4 last:border-0">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
