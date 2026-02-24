import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

async function verificarUsuarioEAssinatura(email: string) {
  try {
    // Verificar se o usuário existe no Supabase Auth
    const { data: user, error: userError } =
      await supabaseAdmin.auth.admin.getUserByEmail(email)

    if (userError) {
      console.error('Erro ao buscar usuário no Supabase Auth:', userError)
      return { exists: false, hasActiveSubscription: false }
    }

    const userId = user.user?.id

    if (!userId) {
      return { exists: false, hasActiveSubscription: false }
    }

    // Verificar se o usuário tem uma assinatura ativa no Supabase Storage
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (customerError) {
      console.error('Erro ao buscar customer no Supabase:', customerError)
      return { exists: true, hasActiveSubscription: false }
    }

    if (!customerData || !customerData.stripe_customer_id) {
      return { exists: true, hasActiveSubscription: false }
    }

    const { data: subscriptionData, error: subscriptionError } =
      await supabaseAdmin
        .from('subscriptions')
        .select('status')
        .eq('customer_id', customerData.stripe_customer_id)
        .single()

    if (subscriptionError) {
      console.error(
        'Erro ao buscar subscription no Supabase:',
        subscriptionError,
      )
      return { exists: true, hasActiveSubscription: false }
    }

    const hasActiveSubscription = subscriptionData?.status === 'active'

    return { exists: true, hasActiveSubscription }
  } catch (error) {
    console.error('Erro ao verificar usuário e assinatura:', error)
    return { exists: false, hasActiveSubscription: false }
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

  // Verificar se usuário existe e tem assinatura
  const userInfo = await verificarUsuarioEAssinatura(email)

  console.log('👤 Usuário existe:', userInfo.exists)
  // console.log("📋 Tem assinatura ativa:", userInfo.hasActiveSubscription)

  if (!userInfo.exists) {
    console.log('⚠️ Usuário não encontrado')
    return NextResponse.json({
      message:
        'Se o email estiver cadastrado, você receberá o link de redefinição',
      sent: false,
    })
  }

  // Comentar verificação de assinatura temporariamente
  /*
  if (!userInfo.hasActiveSubscription) {
    console.log("⚠️ Usuário sem assinatura ativa")
    return NextResponse.json(
      { error: "Usuário sem assinatura ativa. Entre em contato com o suporte." },
      { status: 403 },
    )
  }
  */

  console.log(
    '📤 Enviando link de reset para:',
    email,
    '(verificação de assinatura desabilitada)',
  )

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
