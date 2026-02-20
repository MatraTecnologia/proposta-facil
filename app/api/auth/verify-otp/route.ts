import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseAuth = createClient(supabaseUrl!, supabaseAnonKey!)

// Interface para o corpo da requisição
interface VerifyOTPRequest {
  email: string
  token: string
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== VERIFICAÇÃO DE OTP ===")

    // Validar environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ Environment variables não configuradas")
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 })
    }

    // Extrair dados do corpo da requisição
    const body: VerifyOTPRequest = await request.json()
    const { email, token } = body

    console.log("Email:", email)
    console.log("Token recebido:", token ? "✅ Presente" : "❌ Ausente")

    // Validar dados obrigatórios
    if (!email || !token) {
      console.error("❌ Email ou token não fornecido")
      return NextResponse.json({ error: "Email e código são obrigatórios" }, { status: 400 })
    }

    // Verificar OTP
    console.log("🔍 Verificando OTP...")
    const { data, error } = await supabaseAuth.auth.verifyOtp({
      email,
      token,
      type: "email",
    })

    if (error) {
      console.error("❌ Erro ao verificar OTP:", error)
      return NextResponse.json({ error: `Código inválido ou expirado: ${error.message}` }, { status: 400 })
    }

    if (!data.session) {
      console.error("❌ Sessão não criada")
      return NextResponse.json({ error: "Não foi possível criar a sessão" }, { status: 400 })
    }

    console.log("✅ OTP verificado com sucesso")
    console.log("👤 Usuário logado:", data.session.user.email)

    return NextResponse.json({
      message: "Login realizado com sucesso!",
      session: data.session,
      user: data.user,
    })
  } catch (error) {
    console.error("❌ Erro no endpoint de verificação OTP:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint de verificação OTP está funcionando",
    timestamp: new Date().toISOString(),
  })
}
