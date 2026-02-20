export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-gray-800 rounded animate-pulse"></div>
          <div className="h-4 w-48 bg-gray-800 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-gray-800 rounded animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 rounded animate-pulse"></div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-6 w-3/4 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-gray-800 rounded animate-pulse"></div>
            </div>
            <div className="h-16 bg-gray-800 rounded animate-pulse"></div>
            <div className="flex justify-between">
              <div className="h-6 w-20 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-4 w-16 bg-gray-800 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
