import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function sendMagicLink(email: string, redirectTo?: string) {
  try {
    console.log("📧 Enviando magic link para:", email)
    const supabase = getSupabase()

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      },
    })

    if (error) {
      console.error("❌ Erro ao enviar magic link:", error)
      throw error
    }

    console.log("✅ Magic link enviado com sucesso")
    return { success: true, data }
  } catch (error) {
    console.error("❌ Erro inesperado ao enviar magic link:", error)
    return { success: false, error }
  }
}

export async function sendOTP(email: string) {
  try {
    console.log("📧 Enviando OTP para:", email)

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      console.error("❌ Erro ao enviar OTP:", error)
      throw error
    }

    console.log("✅ OTP enviado com sucesso")
    return { success: true, data }
  } catch (error) {
    console.error("❌ Erro inesperado ao enviar OTP:", error)
    return { success: false, error }
  }
}

export async function sendPasswordReset(email: string, redirectTo?: string) {
  try {
    console.log("🔑 Enviando reset de senha para:", email)

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/reset-password`,
    })

    if (error) {
      console.error("❌ Erro ao enviar reset de senha:", error)
      throw error
    }

    console.log("✅ Reset de senha enviado com sucesso")
    return { success: true, data }
  } catch (error) {
    console.error("❌ Erro inesperado ao enviar reset de senha:", error)
    return { success: false, error }
  }
}
