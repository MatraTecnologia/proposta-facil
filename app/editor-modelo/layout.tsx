"use client"

import type React from "react"
import { Toaster } from "@/components/ui/toaster"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function EditorModeloLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // <ProtectedRoute>
    <div className="min-h-screen bg-gray-950">
      {children}
      <Toaster />
    </div>
    // </ProtectedRoute>
  )
}
