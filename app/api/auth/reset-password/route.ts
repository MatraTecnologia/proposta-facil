import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

async function verificarUsuarioExiste(email: string) {
  try {
    // Buscar usuários e verificar se o email existe
    // Usa paginação pois listUsers não suporta filtro por email nesta versão
    let page = 1
    const perPage = 50
    while (true) {
      const { data, error } =
        await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error('Erro ao buscar usuários no Supabase Auth:', error)
        return false
      }
      const match = data.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      )
      if (match) return true
      if (data.users.length < perPage) break
      page++
    }
    return false
  } catch (error) {
    console.error('Erro ao verificar usuário:', error)
    return false
  }
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const { email: rawEmail } = await request.json()
  const email = String(rawEmail || '')
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  // Verificar se usuário existe
  const exists = await verificarUsuarioExiste(email)

  console.log('👤 Usuário existe:', exists)

  if (!exists) {
    console.log('⚠️ Usuário não encontrado')
    // Retorna mesma mensagem genérica para evitar enumeração de emails
    return NextResponse.json({
      message:
        'Se o email estiver cadastrado, você receberá o link de redefinição',
      sent: false,
    })
  }

  console.log('📤 Enviando link de reset para:', email)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/update-password`,
  })

  if (error) {
    console.error('Erro ao solicitar redefinição de senha:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // await sendPasswordResetEmail(email)

  return NextResponse.json({
    message:
      'Se o email estiver cadastrado, você receberá o link de redefinição',
    sent: true,
  })
}
