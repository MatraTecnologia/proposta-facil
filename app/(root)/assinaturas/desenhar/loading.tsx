import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20 bg-gray-800" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-gray-800" />
            <Skeleton className="h-4 w-96 bg-gray-800" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas Area */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-40 bg-gray-800" />
            <Skeleton className="h-80 w-full bg-gray-800 rounded-xl" />
            <Skeleton className="h-6 w-48 bg-gray-800" />
            <Skeleton className="h-80 w-full bg-gray-800 rounded-xl" />
          </div>

          {/* Configurações */}
          <div className="space-y-6">
            <Skeleton className="h-64 w-full bg-gray-800 rounded-xl" />
            <Skeleton className="h-64 w-full bg-gray-800 rounded-xl" />
            <Skeleton className="h-64 w-full bg-gray-800 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
