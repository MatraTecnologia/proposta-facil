"use client"

import type React from "react"

import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useRef, memo, useMemo } from "react"

const ProtectedRoute = memo(({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const hasRedirected = useRef(false)

  const handleRedirect = useCallback(() => {
    if (!loading && !user && !isRedirecting && !hasRedirected.current) {
      setIsRedirecting(true)
      hasRedirected.current = true
      router.push("/")
    }
  }, [user, loading, router, isRedirecting])

  useEffect(() => {
    if (!user && !loading) {
      handleRedirect()
    }
  }, [handleRedirect, loading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-orange-500 text-lg">Acesso não autorizado</p>
      </div>
    )
  }

  return <>{children}</>
})

ProtectedRoute.displayName = "ProtectedRoute"

export default ProtectedRoute
