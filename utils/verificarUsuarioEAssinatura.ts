import { supabaseAdmin as supabase } from "@/lib/supabase-admin"

interface VerificacaoResult {
  exists: boolean
  hasActiveSubscription: boolean
  user?: any
  subscription?: any
  error?: string
}

export async function verificarUsuarioEAssinatura(email: string): Promise<VerificacaoResult> {
  try {
    console.log("🔍 Verificando usuário e assinatura para:", email)

    // Verificar se o usuário existe
    const { data: users, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      console.error("❌ Erro ao buscar usuários:", userError)
      return {
        exists: false,
        hasActiveSubscription: false,
        error: userError.message,
      }
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      console.log("❌ Usuário não encontrado:", email)
      return {
        exists: false,
        hasActiveSubscription: false,
        error: "Usuário não encontrado",
      }
    }

    console.log("✅ Usuário encontrado:", user.id)

    // Verificar assinatura ativa (temporariamente desabilitado)
    // TODO: Reativar quando necessário
    /*
    const { data: subscription, error: subError } = await supabase
      .from('user_assinaturas')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'ativa')
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error("❌ Erro ao verificar assinatura:", subError)
      return {
        exists: true,
        hasActiveSubscription: false,
        user,
        error: subError.message
      }
    }

    const hasActiveSubscription = !!subscription
    console.log("📋 Assinatura ativa:", hasActiveSubscription)

    return {
      exists: true,
      hasActiveSubscription,
      user,
      subscription
    }
    */

    // Temporariamente retornando como se tivesse assinatura ativa
    console.log("📋 Verificação de assinatura desabilitada - permitindo acesso")
    return {
      exists: true,
      hasActiveSubscription: true, // Temporariamente true
      user,
    }
  } catch (error) {
    console.error("❌ Erro inesperado na verificação:", error)
    return {
      exists: false,
      hasActiveSubscription: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

export async function verificarApenasUsuario(email: string): Promise<{ exists: boolean; user?: any; error?: string }> {
  try {
    console.log("🔍 Verificando apenas usuário para:", email)

    const { data: users, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      console.error("❌ Erro ao buscar usuários:", userError)
      return {
        exists: false,
        error: userError.message,
      }
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      console.log("❌ Usuário não encontrado:", email)
      return {
        exists: false,
        error: "Usuário não encontrado",
      }
    }

    console.log("✅ Usuário encontrado:", user.id)
    return {
      exists: true,
      user,
    }
  } catch (error) {
    console.error("❌ Erro inesperado na verificação:", error)
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
