import { Skeleton } from "@/components/ui/skeleton"

export default function ReviewsLoading() {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 px-4 py-6 lg:px-6">
      <Skeleton className="h-8 w-44 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-[200px] rounded-md" />
        <Skeleton className="h-8 w-[180px] rounded-md" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
