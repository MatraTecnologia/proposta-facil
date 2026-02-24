"use client"

import type React from "react"
import { useState, memo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, KeyRound, CheckCircle, XCircle, Eye, EyeOff, Lock, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"

const AuthPage = memo(function AuthPage() {
  const [step, setStep] = useState<"email" | "otp" | "password" | "signup" | "reset">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const router = useRouter()
  const { signUp } = useAuth()


  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    if (!email || !isValidEmail(email)) {
      setError("Digite um email válido")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Código enviado! Verifique seu email.")
        setStep("otp")
      } else {
        setError(data.error || "Erro ao enviar código")
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    if (!otp || otp.length !== 6) {
      setError("Digite o código de 6 dígitos")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token: otp }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.session) {
          await supabase.auth.setSession(data.session)
        }
        setMessage("Entrando...")
        setTimeout(() => {
          router.push("/dashboard")
        }, 500)
      } else {
        setError(data.error || "Código inválido")
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    if (!email || !password) {
      setError("Email e senha são obrigatórios")
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else if (data.session) {
        setMessage("Entrando...")
        setTimeout(() => {
          router.push("/dashboard")
        }, 500)
      }
    } catch (error) {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    if (!name.trim()) {
      setError("Nome é obrigatório")
      setLoading(false)
      return
    }

    if (!company.trim()) {
      setError("Nome da empresa é obrigatório")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem")
      setLoading(false)
      return
    }

    try {
      const { error } = await signUp(email, password, name.trim(), company.trim())

      if (error) {
        setError(error.message)
      } else {
        setMessage("Conta criada! Verifique seu email para confirmar o cadastro.")
      }
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message || "Se o email estiver cadastrado, você receberá o link de redefinição.")
      } else {
        setError(data.error || "Erro ao solicitar redefinição de senha.")
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
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center mb-4">
              {step === "email" ? (
                <Mail className="w-6 h-6 text-white" />
              ) : step === "password" ? (
                <Lock className="w-6 h-6 text-white" />
              ) : step === "signup" ? (
                <UserPlus className="w-6 h-6 text-white" />
              ) : step === "reset" ? (
                <Mail className="w-6 h-6 text-white" />
              ) : (
                <KeyRound className="w-6 h-6 text-white" />
              )}
            </div>
            <CardTitle className="text-white">
              {step === "email" ? "Digite seu email" : step === "password" ? "Digite sua senha" : step === "signup" ? "Criar sua conta" : step === "reset" ? "Redefinir senha" : "Digite o código"}
            </CardTitle>
            {step === "otp" && (
              <p className="text-gray-400 text-sm mt-2">
                Código enviado para <strong>{email}</strong>
              </p>
            )}
            {step === "reset" && (
              <p className="text-gray-400 text-sm mt-2">
                Enviaremos um link de redefinição para <strong>{email}</strong>
              </p>
            )}
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full bg-gray-800 border-gray-600 text-white text-center text-lg h-12"
                  autoFocus
                />

                {error && (
                  <Alert className="border-red-500 bg-red-900/20">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert className="border-green-500 bg-green-900/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-400">{message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                >
                  {loading ? "Enviando..." : "Enviar Código"}
                </Button>

                <div className="relative mt-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-900 px-2 text-gray-400">Ou</span>
                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() => setStep("password")}
                    className="text-sm text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    Entrar com senha
                  </button>
                </div>

                <div className="text-center mt-4 pt-4 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Não tem conta? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("signup")
                      setError("")
                      setMessage("")
                    }}
                    className="text-sm text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    Criar conta
                  </button>
                </div>
              </form>
            ) : step === "password" ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-gray-800 border-gray-600 text-white"
                    disabled
                  />

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
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
                </div>

                {error && (
                  <Alert className="border-red-500 bg-red-900/20">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert className="border-green-500 bg-green-900/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-400">{message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email")
                      setPassword("")
                      setError("")
                      setMessage("")
                    }}
                    className="text-gray-400 hover:text-orange-400"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("reset")
                      setPassword("")
                      setError("")
                      setMessage("")
                    }}
                    className="text-gray-400 hover:text-orange-400"
                  >
                    Esqueci a senha
                  </button>
                </div>
              </form>
            ) : step === "signup" ? (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-3">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full bg-gray-800 border-gray-600 text-white"
                    autoFocus
                  />

                  <Input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Nome da empresa"
                    required
                    className="w-full bg-gray-800 border-gray-600 text-white"
                  />

                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-gray-800 border-gray-600 text-white"
                  />

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Senha (mín. 6 caracteres)"
                      required
                      className="w-full bg-gray-800 border-gray-600 text-white pr-10"
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
                    placeholder="Confirmar senha"
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

                {message && (
                  <Alert className="border-green-500 bg-green-900/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-400">{message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email || !password || !name || !company || !confirmPassword}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-gray-400">Já tem conta? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email")
                      setPassword("")
                      setConfirmPassword("")
                      setError("")
                      setMessage("")
                    }}
                    className="text-orange-400 hover:text-orange-300 font-medium transition-colors"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            ) : step === "reset" ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-gray-800 border-gray-600 text-white"
                />

                <p className="text-gray-400 text-sm text-center">
                  Você receberá um email com um link para criar uma nova senha.
                </p>

                {error && (
                  <Alert className="border-red-500 bg-red-900/20">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert className="border-green-500 bg-green-900/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-400">{message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                >
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </Button>

                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("password")
                      setError("")
                      setMessage("")
                    }}
                    className="text-gray-400 hover:text-orange-400"
                  >
                    ← Voltar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} autoFocus>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-12 text-2xl bg-gray-800 border-gray-600 text-white" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-2xl bg-gray-800 border-gray-600 text-white" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-2xl bg-gray-800 border-gray-600 text-white" />
                    </InputOTPGroup>
                    <InputOTPSeparator className="text-gray-400" />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="w-12 h-12 text-2xl bg-gray-800 border-gray-600 text-white" />
                      <InputOTPSlot index={4} className="w-12 h-12 text-2xl bg-gray-800 border-gray-600 text-white" />
                      <InputOTPSlot index={5} className="w-12 h-12 text-2xl bg-gray-800 border-gray-600 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {error && (
                  <Alert className="border-red-500 bg-red-900/20">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-400">{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert className="border-green-500 bg-green-900/20">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-400">{message}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg"
                >
                  {loading ? "Verificando..." : "Entrar"}
                </Button>

                <div className="flex justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email")
                      setOtp("")
                      setError("")
                      setMessage("")
                    }}
                    className="text-gray-400 hover:text-orange-400"
                  >
                    ← Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="text-gray-400 hover:text-orange-400"
                  >
                    Reenviar
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
})

export default AuthPage
