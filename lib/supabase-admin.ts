import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables")
  }

  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _supabaseAdmin
}

// Cliente admin com service role key para operações administrativas
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdmin(), prop, receiver)
  },
})

// Função helper para verificar se o admin client está configurado
export function isAdminConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Função helper para operações de usuário
export async function getUser(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (error) {
      console.error("Erro ao buscar usuário:", error)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (error) {
    console.error("Erro inesperado ao buscar usuário:", error)
    return { user: null, error }
  }
}

// Função helper para listar usuários
export async function listUsers() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      console.error("Erro ao listar usuários:", error)
      return { users: [], error }
    }

    return { users: data.users, error: null }
  } catch (error) {
    console.error("Erro inesperado ao listar usuários:", error)
    return { users: [], error }
  }
}

// Função helper para criar usuário
export async function createUser(email: string, password: string, userData?: any) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData || {},
    })

    if (error) {
      console.error("Erro ao criar usuário:", error)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (error) {
    console.error("Erro inesperado ao criar usuário:", error)
    return { user: null, error }
  }
}

// Função helper para atualizar usuário
export async function updateUser(userId: string, updates: any) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)

    if (error) {
      console.error("Erro ao atualizar usuário:", error)
      return { user: null, error }
    }

    return { user: data.user, error: null }
  } catch (error) {
    console.error("Erro inesperado ao atualizar usuário:", error)
    return { user: null, error }
  }
}

// Função helper para deletar usuário
export async function deleteUser(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error("Erro ao deletar usuário:", error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error("Erro inesperado ao deletar usuário:", error)
    return { success: false, error }
  }
}
