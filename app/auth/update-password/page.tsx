"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, XCircle, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"

type PageState = "loading" | "invalid" | "form"

export default function UpdatePasswordPage() {
  const [pageState, setPageState] = useState<PageState>("loading")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const router = useRouter()

  useEffect(() => {
    let resolved = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (resolved) return
      if (event === "PASSWORD_RECOVERY") {
        resolved = true
        setPageState("form")
      }
    })

    // Fallback: check if there's already a session (user clicked the link and session was set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (resolved) return
      if (session) {
        resolved = true
        setPageState("form")
      }
    })

    // Timeout: if no recovery event fires within 3s, show invalid state
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        setPageState("invalid")
      }
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-orange-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">PropostaFácil</h1>
          <p className="text-gray-300">Sistema de geração de propostas comerciais</p>
        </div>

        <Card className="bg-gray-900/80 border-gray-700 backdrop-blur-sm">
          {pageState === "loading" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
                <CardTitle className="text-white">Verificando link...</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm text-center">
                  Aguarde enquanto validamos seu link de redefinição.
                </p>
              </CardContent>
            </>
          )}

          {pageState === "invalid" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">Link inválido ou expirado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400 text-sm text-center">
                  Este link de redefinição de senha é inválido ou já expirou. Solicite um novo link na página de login.
                </p>
                <Button
                  onClick={() => router.push("/")}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                >
                  Voltar para o login
                </Button>
              </CardContent>
            </>
          )}

          {pageState === "form" && (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-white">Nova senha</CardTitle>
                <p className="text-gray-400 text-sm mt-2">
                  Digite sua nova senha abaixo.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nova senha (mín. 6 caracteres)"
                        required
                        className="w-full bg-gray-800 border-gray-600 text-white pr-10"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <Input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmar nova senha"
                      required
                      className="w-full bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  {error && (
                    <Alert className="border-red-500 bg-red-900/20">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <AlertDescription className="text-red-400">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                  >
                    {loading ? "Salvando..." : "Salvar nova senha"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
