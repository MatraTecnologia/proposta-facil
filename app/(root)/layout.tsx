"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Sidebar from "@/components/Sidebar"
import Navbar from "@/components/Navbar"
import { Toaster } from "@/components/ui/toaster"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    company: "",
  })

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuário",
        email: user.email || "",
        company: user.user_metadata?.company || "Minha Empresa",
      })
    }
  }, [user])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-950 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar user={userData} />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
        <Toaster />
      </div>
    </ProtectedRoute>
  )
}
