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

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="h-8 w-12 bg-gray-800 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-16 bg-gray-800 rounded animate-pulse"></div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-6">
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-gray-800 rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-gray-800 rounded animate-pulse"></div>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-16 bg-gray-800 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
