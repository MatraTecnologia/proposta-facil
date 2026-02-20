"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Briefcase, FileText, Settings, ChevronLeft, ChevronRight, ImageIcon, PenTool } from 'lucide-react'

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Serviços", href: "/servicos", icon: Briefcase },
  { name: "Propostas", href: "/propostas", icon: FileText },
  { name: "Modelos", href: "/modelos", icon: FileText },
  { name: "Imagens", href: "/imagens", icon: ImageIcon },
  { name: "Assinaturas", href: "/assinaturas", icon: PenTool },

]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "glass-dark border-r border-white/10 flex flex-col transition-all duration-500 ease-out animate-slide-in-left relative overflow-hidden",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Efeito de brilho de fundo */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none" />

      {/* Header */}
      <div className="p-4 border-b border-white/10 relative z-10">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h2 className="text-xl font-bold text-gradient animate-scale-in">
              PropostaFácil
            </h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300 hover-scale"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 relative z-10">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start transition-all duration-300 hover-lift group relative overflow-hidden",
                  isActive
                    ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-white border border-orange-500/30 shadow-lg animate-pulse-glow"
                    : "text-gray-300 hover:text-white hover:bg-white/10",
                  collapsed && "px-2",
                )}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Efeito shimmer no hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                <item.icon className={cn(
                  "w-5 h-5 transition-all duration-300 group-hover:scale-110",
                  !collapsed && "mr-3",
                  isActive && "text-orange-400"
                )} />
                {!collapsed && (
                  <span className="font-medium transition-all duration-300">
                    {item.name}
                  </span>
                )}

                {/* Indicador ativo */}
                {isActive && (
                  <div className="absolute right-2 w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Footer com efeito */}
      <div className="p-4 border-t border-white/10 relative z-10">
        <div className={cn(
          "text-xs text-gray-500 transition-all duration-300",
          collapsed ? "text-center" : "text-left"
        )}>
          {!collapsed && (
            <div className="space-y-1 animate-slide-in-up">
              <p className="font-medium text-gray-400">v2.0.0</p>
              <p>Sistema Avançado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
