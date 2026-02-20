export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-400 text-lg">Carregando editor de modelos...</p>
        <p className="text-gray-500 text-sm mt-2">Preparando interface drag & drop</p>
      </div>
    </div>
  )
}
