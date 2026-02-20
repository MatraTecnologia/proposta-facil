import { supabaseAdmin } from '@/lib/supabase-admin'
import { type NextRequest, NextResponse } from 'next/server'

// Interface para o corpo da requisição
interface DirectLoginRequest {
  email: string
  adminKey: string
}

// Chave secreta para autorizar login direto (apenas para desenvolvimento/testes)
const ADMIN_KEY = process.env.ADMIN_KEY || 'dev_only_key_123456'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('=== SOLICITAÇÃO DE LOGIN DIRETO (APENAS DESENVOLVIMENTO) ===')

    // Extrair dados do corpo da requisição
    const body: DirectLoginRequest = await request.json()
    const { email, adminKey } = body

    // Validar admin key
    if (adminKey !== ADMIN_KEY) {
      console.error('❌ Admin key inválida')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log('📧 Email solicitado:', email)

    // Validar dados obrigatórios
    if (!email) {
      console.error('❌ Email não fornecido')
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 },
      )
    }

    // Buscar usuário
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)

    if (!user) {
      console.error('❌ Usuário não encontrado:', email)
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 },
      )
    }

    console.log('✅ Usuário encontrado:', user.id)

    // Criar link de login direto
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        }`,
      },
    })

    if (error) {
      console.error('❌ Erro ao gerar link:', error)
      return NextResponse.json(
        { error: `Erro ao gerar link: ${error.message}` },
        { status: 500 },
      )
    }

    console.log('✅ Link gerado com sucesso')

    return NextResponse.json({
      message: 'Link gerado com sucesso',
      link: data.properties.action_link,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('❌ Erro no endpoint de login direto:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}
