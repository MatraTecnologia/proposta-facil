export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-10 bg-gray-800 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="w-64 h-8 bg-gray-800 rounded animate-pulse" />
          <div className="w-48 h-4 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="w-full h-96 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="w-full h-64 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* Propostas Skeleton */}
      <div className="w-full h-64 bg-gray-800 rounded-lg animate-pulse" />
    </div>
  )
}
