"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Settings, Bell, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

interface NavbarProps {
  user: {
    name: string
    email: string
    company: string
  }
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso",
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="glass-dark border-b border-white/10 px-6 py-4 animate-slide-in-right relative overflow-hidden">
      {/* Efeito de brilho de fundo */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-4">
          <div className="animate-slide-in-up">
            <h1 className="text-lg font-semibold text-white">
              Bem-vindo, <span className="text-gradient">{user.name}</span>
            </h1>
            <p className="text-sm text-gray-400 flex items-center">

              {user.company}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">

          {/* Menu do usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover-lift group">
                <Avatar className="h-10 w-10 ring-2 ring-orange-500/30 group-hover:ring-orange-500/60 transition-all duration-300">
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 glass-dark border-white/20 animate-scale-in" align="end">
              <DropdownMenuLabel className="text-gray-300">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white">{user.name}</p>
                  <p className="text-xs leading-none text-gray-400">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem className="text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 focus:bg-white/10">
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-200 focus:bg-white/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
