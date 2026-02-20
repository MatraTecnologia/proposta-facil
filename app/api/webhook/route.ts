import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

// Configuração do Supabase (lazy init para funcionar no Docker build)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Configuração do NotifyX
const NOTIFYX_WEBHOOK_URL = 'https://notifyx.com.br/api/webhooks/rh0pdwfc'
const NOTIFYX_SECRET = '12489accabb2a96172ba11a7ceb9547c'

// Interface para os dados reais do webhook da Kiwify
interface KiwifyWebhookData {
  order_id: string
  order_ref: string
  order_status: string
  product_type: string
  payment_method: string
  store_id: string
  payment_merchant_id: string
  installments: number
  card_type: string | null
  card_last4digits: string | null
  card_rejection_reason: string | null
  boleto_URL: string | null
  boleto_barcode: string | null
  boleto_expiry_date: string | null
  pix_code: string | null
  pix_expiration: string | null
  sale_type: string
  created_at: string
  updated_at: string
  approved_date: string | null
  refunded_at: string | null
  webhook_event_type: string
  Product: {
    product_id: string
    product_name: string
  }
  Customer: {
    full_name: string
    first_name: string
    email: string
    mobile: string
    CPF: string | null
    cnpj: string | null
    ip: string
    instagram: string | null
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zipcode?: string
  }
  Commissions: {
    charge_amount: number
    product_base_price: number
    product_base_price_currency: string
    kiwify_fee: number
    kiwify_fee_currency: string
    settlement_amount: number
    settlement_amount_currency: string
    sale_tax_rate: number
    sale_tax_amount: number
    commissioned_stores: Array<{
      id: string
      type: string
      custom_name: string
      email: string
      value: string
    }>
    currency: string
    my_commission: number
    funds_status: string | null
    estimated_deposit_date: string | null
    deposit_date: string | null
  }
  TrackingParameters: {
    src: string | null
    sck: string | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    utm_content: string | null
    utm_term: string | null
    s1: string | null
    s2: string | null
    s3: string | null
  }
  Subscription?: {
    id: string
    start_date: string
    next_payment: string
    status: string
    plan: {
      id: string
      name: string
      frequency: string
      qty_charges: number
    }
    charges: {
      completed: Array<{
        order_id: string
        amount: number
        status: string
        installments: number
        card_type: string
        card_last_digits: string
        card_first_digits: string
        created_at: string
      }>
      future: Array<{
        charge_date: string
      }>
    }
  }
  subscription_id?: string
  access_url: string | null
}

// dynamic
export const dynamic = 'force-dynamic'

// Função para enviar dados para o NotifyX
async function enviarParaNotifyX(dados: {
  nome: string
  telefone: string
  email: string
  senha: string
}) {
  try {
    console.log('=== ENVIANDO PARA NOTIFYX ===')
    console.log('URL:', NOTIFYX_WEBHOOK_URL)
    console.log('Dados:', dados)

    const response = await fetch(NOTIFYX_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': NOTIFYX_SECRET,
      },
      body: JSON.stringify(dados),
    })

    const responseText = await response.text()

    if (response.ok) {
      console.log('✅ NotifyX: Dados enviados com sucesso')
      console.log('Resposta:', responseText)
      return { success: true, response: responseText }
    } else {
      console.error('❌ NotifyX: Erro na resposta')
      console.error('Status:', response.status)
      console.error('Resposta:', responseText)
      return {
        success: false,
        error: `HTTP ${response.status}: ${responseText}`,
      }
    }
  } catch (error) {
    console.error('❌ NotifyX: Erro ao enviar dados')
    console.error('Erro:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

// Função para limpar documento (remover pontos, traços e espaços)
function limparDocumento(documento: string): string {
  return documento.replace(/[^\d]/g, '')
}

// Função para detectar se é CPF ou CNPJ
function detectarTipoDocumento(documento: string): {
  tipo: 'cpf' | 'cnpj' | 'invalido'
  limpo: string
} {
  const documentoLimpo = limparDocumento(documento)

  if (documentoLimpo.length === 11) {
    return { tipo: 'cpf', limpo: documentoLimpo }
  } else if (documentoLimpo.length === 14) {
    return { tipo: 'cnpj', limpo: documentoLimpo }
  } else {
    return { tipo: 'invalido', limpo: documentoLimpo }
  }
}

// Função para gerar senha aleatória
function generateRandomPassword(length = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return password
}

// Função para determinar o tipo de assinatura baseado no produto e frequência
function determinarTipoAssinatura(
  productName: string,
  subscription?: KiwifyWebhookData['Subscription'],
): {
  tipo: 'mensal' | 'anual' | 'vitalicia'
  dataFim?: string
} {
  const productNameLower = productName.toLowerCase()

  // Se tem subscription, usar a frequência
  if (subscription?.plan?.frequency) {
    const frequency = subscription.plan.frequency.toLowerCase()

    switch (frequency) {
      case 'weekly':
        // Semanal - calcular data fim baseada em next_payment
        const nextPayment = new Date(subscription.next_payment)
        return {
          tipo: 'mensal', // Tratamos semanal como mensal para simplificar
          dataFim: nextPayment.toISOString(),
        }
      case 'monthly':
        const monthlyEnd = new Date()
        monthlyEnd.setMonth(monthlyEnd.getMonth() + 1)
        return {
          tipo: 'mensal',
          dataFim: monthlyEnd.toISOString(),
        }
      case 'yearly':
        const yearlyEnd = new Date()
        yearlyEnd.setFullYear(yearlyEnd.getFullYear() + 1)
        return {
          tipo: 'anual',
          dataFim: yearlyEnd.toISOString(),
        }
      default:
        return { tipo: 'vitalicia' }
    }
  }

  // Fallback baseado no nome do produto
  if (
    productNameLower.includes('mensal') ||
    productNameLower.includes('monthly')
  ) {
    const monthlyEnd = new Date()
    monthlyEnd.setMonth(monthlyEnd.getMonth() + 1)
    return {
      tipo: 'mensal',
      dataFim: monthlyEnd.toISOString(),
    }
  }

  if (
    productNameLower.includes('anual') ||
    productNameLower.includes('yearly')
  ) {
    const yearlyEnd = new Date()
    yearlyEnd.setFullYear(yearlyEnd.getFullYear() + 1)
    return {
      tipo: 'anual',
      dataFim: yearlyEnd.toISOString(),
    }
  }

  // Default para vitalícia
  return { tipo: 'vitalicia' }
}

// Função para criar ou atualizar usuário no Supabase Auth
async function createOrUpdateUser(
  email: string,
  documento: string,
  userData: any,
) {
  const supabase = getSupabase()
  try {
    // Detectar tipo de documento e priorizar CPF
    const docInfo = detectarTipoDocumento(documento)

    console.log('🔍 Analisando documento:')
    console.log('Documento original:', documento)
    console.log('Documento limpo:', docInfo.limpo)
    console.log('Tipo detectado:', docInfo.tipo)

    // Definir senha baseada na prioridade: CPF > Gerada
    let senhaParaUsar: string
    let tipoSenha: string

    if (docInfo.tipo === 'cpf') {
      senhaParaUsar = docInfo.limpo
      tipoSenha = 'CPF'
      console.log('✅ USANDO CPF COMO SENHA (PRIORIDADE MÁXIMA)')
    } else {
      senhaParaUsar = generateRandomPassword(10)
      tipoSenha = 'GERADA'
      console.log('⚠️ CPF NÃO DISPONÍVEL - USANDO SENHA GERADA')
    }

    console.log('🔑 Definindo senha:')
    console.log('Senha escolhida:', senhaParaUsar)
    console.log('Tipo de senha:', tipoSenha)

    // Verificar se o usuário já existe
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser.users.find(user => user.email === email)

    if (userExists) {
      console.log('👤 Usuário já existe:', email)

      // Se o usuário existente não tem senha baseada em CPF, atualizar para CPF se disponível
      const metadata = userExists.user_metadata || {}
      const currentPasswordType = metadata.password_type || 'gerada'

      if (docInfo.tipo === 'cpf' && currentPasswordType !== 'cpf') {
        console.log('🔄 Atualizando senha para CPF:', docInfo.limpo)

        const { data: updatedUser, error: updateError } =
          await supabase.auth.admin.updateUserById(userExists.id, {
            password: docInfo.limpo,
            user_metadata: {
              ...metadata,
              name: userData.name,
              documento: documento,
              documento_tipo: docInfo.tipo,
              phone: userData.phone,
              address: userData.address,
              last_kiwify_order: userData.orderId,
              password_updated_at: new Date().toISOString(),
              password_type: 'cpf',
            },
          })

        if (updateError) {
          console.error('❌ Erro ao atualizar usuário:', updateError)
          return { success: false, error: updateError }
        }

        console.log('✅ Senha atualizada para CPF com sucesso!')
        return {
          success: true,
          user: updatedUser.user,
          isExisting: true,
          senha: docInfo.limpo,
          tipoSenha: 'CPF',
        }
      }

      // Se não for atualizar a senha, apenas atualizar os metadados
      const { data: updatedUser, error: updateError } =
        await supabase.auth.admin.updateUserById(userExists.id, {
          user_metadata: {
            ...metadata,
            name: userData.name,
            documento: documento,
            documento_tipo: docInfo.tipo,
            phone: userData.phone,
            address: userData.address,
            last_kiwify_order: userData.orderId,
          },
        })

      if (updateError) {
        console.error('❌ Erro ao atualizar usuário:', updateError)
        return { success: false, error: updateError }
      }

      return {
        success: true,
        user: updatedUser.user,
        isExisting: true,
        senha:
          metadata.password_type === 'cpf' ? metadata.documento : senhaParaUsar,
        tipoSenha: metadata.password_type === 'cpf' ? 'CPF' : 'GERADA',
      }
    }

    // Criar novo usuário
    console.log('🆕 Criando novo usuário com senha:', senhaParaUsar)

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: senhaParaUsar,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        documento: documento,
        documento_tipo: docInfo.tipo,
        phone: userData.phone,
        address: userData.address,
        created_via: 'kiwify_webhook',
        kiwify_order_id: userData.orderId,
        password_type: tipoSenha.toLowerCase(),
      },
    })

    if (error) {
      console.error('❌ Erro ao criar usuário no Supabase:', error)
      return { success: false, error }
    }

    console.log('✅ Novo usuário criado com sucesso!')
    return {
      success: true,
      user: data.user,
      isExisting: false,
      senha: senhaParaUsar,
      tipoSenha,
    }
  } catch (error) {
    console.error('❌ Erro inesperado ao criar/atualizar usuário:', error)
    return { success: false, error }
  }
}

// Função para processar reembolso e cancelar assinatura
async function processarReembolso(webhookData: KiwifyWebhookData) {
  const supabase = getSupabase()
  try {
    // Buscar assinatura pelo order_id
    const { data: assinatura, error: findError } = await supabase
      .from('user_assinaturas')
      .select('*')
      .eq('kiwify_order_id', webhookData.order_id)
      .single()

    if (findError) {
      console.error('Erro ao buscar assinatura para reembolso:', findError)
      return { success: false, error: findError }
    }

    if (!assinatura) {
      console.log(
        'Assinatura não encontrada para reembolso:',
        webhookData.order_id,
      )
      return { success: false, error: 'Assinatura não encontrada' }
    }

    // Atualizar status da assinatura para cancelada
    const { error: updateError } = await supabase
      .from('user_assinaturas')
      .update({
        status: 'cancelada',
        data_cancelamento: new Date().toISOString(),
        webhook_data: webhookData,
        updated_at: new Date().toISOString(),
      })
      .eq('kiwify_order_id', webhookData.order_id)

    if (updateError) {
      console.error('Erro ao cancelar assinatura:', updateError)
      return { success: false, error: updateError }
    }

    console.log('Assinatura cancelada com sucesso:', webhookData.order_id)
    return { success: true, assinatura }
  } catch (error) {
    console.error('Erro inesperado ao processar reembolso:', error)
    return { success: false, error }
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase()
  try {
    // Extrair dados do corpo da requisição
    const webhookData: KiwifyWebhookData = await request.json()

    console.log('Webhook recebido:', JSON.stringify(webhookData, null, 2))

    // Processar reembolso (order_refunded)
    if (
      webhookData.webhook_event_type === 'order_refunded' ||
      webhookData.order_status === 'refunded'
    ) {
      console.log('Processando reembolso para pedido:', webhookData.order_id)
      const result = await processarReembolso(webhookData)

      if (!result.success) {
        return NextResponse.json(
          { error: 'Erro ao processar reembolso' },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          message: 'Reembolso processado com sucesso',
          order_id: webhookData.order_id,
          status: 'cancelada',
        },
        { status: 200 },
      )
    }

    // Verificar se o evento é order_approved
    if (webhookData.webhook_event_type !== 'order_approved') {
      console.log('Evento ignorado:', webhookData.webhook_event_type)
      return NextResponse.json(
        { message: 'Evento não processado' },
        { status: 200 },
      )
    }

    // Verificar se o status do pedido é "paid"
    if (webhookData.order_status !== 'paid') {
      console.log('Status do pedido ignorado:', webhookData.order_status)
      return NextResponse.json(
        { message: 'Status não processado' },
        { status: 200 },
      )
    }

    // Extrair dados do comprador
    const { Customer, Product, Commissions, Subscription } = webhookData
    const nome = Customer.full_name
    const email = Customer.email
    const documento = Customer.CPF || Customer.cnpj || 'Não informado'
    const telefone = Customer.mobile || 'Não informado'

    // Montar endereço completo
    const endereco = Customer.street
      ? `${Customer.street}, ${Customer.number || ''}${
          Customer.complement ? `, ${Customer.complement}` : ''
        }, ${Customer.neighborhood || ''}, ${Customer.city || ''}/${
          Customer.state || ''
        }, CEP: ${Customer.zipcode || ''}`
      : 'Não informado'

    // Validar dados obrigatórios
    if (!nome || !email) {
      console.error('Dados obrigatórios ausentes:', { nome, email })
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 },
      )
    }

    // Dados do usuário para criação/atualização
    const userData = {
      name: nome,
      documento,
      phone: telefone,
      address: endereco,
      orderId: webhookData.order_id,
    }

    // Criar ou atualizar conta de usuário
    const result = await createOrUpdateUser(email, documento, userData)

    if (!result.success) {
      console.error('Falha ao criar/atualizar usuário:', result.error)
      return NextResponse.json(
        { error: 'Erro ao criar/atualizar conta de usuário' },
        { status: 500 },
      )
    }

    // Determinar tipo de assinatura
    const assinaturaInfo = determinarTipoAssinatura(
      Product.product_name,
      Subscription,
    )

    // Exibir dados no console
    console.log('=== CONTA CRIADA/ATUALIZADA ===')
    console.log('Nome:', nome)
    console.log('Email:', email)
    console.log('Documento original:', documento)
    console.log('Documento limpo:', limparDocumento(documento))
    console.log('Telefone:', telefone)
    console.log('Endereço:', endereco)
    console.log('🔑 SENHA DEFINIDA:', result.senha)
    console.log('📋 Tipo de senha:', result.tipoSenha)
    console.log(
      '👤 Status:',
      result.isExisting
        ? `EXISTENTE (senha atualizada para ${result.tipoSenha})`
        : `NOVO (senha = ${result.tipoSenha})`,
    )
    console.log('ID do usuário:', result.user?.id)
    console.log('ID do pedido Kiwify:', webhookData.order_id)
    console.log('Produto:', Product.product_name)
    console.log(
      'Valor pago:',
      `${Commissions.currency} ${(Commissions.charge_amount / 100).toFixed(2)}`,
    )
    console.log('Tipo de assinatura:', assinaturaInfo.tipo)
    console.log('Data fim:', assinaturaInfo.dataFim || 'Vitalícia')
    console.log('====================================')

    // Criar ou atualizar assinatura na tabela user_assinaturas
    if (result.user) {
      try {
        // Verificar se já existe uma assinatura para este pedido
        const { data: existingAssinatura } = await supabase
          .from('user_assinaturas')
          .select('*')
          .eq('kiwify_order_id', webhookData.order_id)
          .single()

        if (existingAssinatura) {
          // Atualizar assinatura existente
          const { error: updateError } = await supabase
            .from('user_assinaturas')
            .update({
              status: 'ativa',
              webhook_data: webhookData,
              updated_at: new Date().toISOString(),
            })
            .eq('kiwify_order_id', webhookData.order_id)

          if (updateError) {
            console.error('Erro ao atualizar assinatura:', updateError)
          } else {
            console.log('Assinatura atualizada com sucesso')
          }
        } else {
          // Criar nova assinatura
          const { error: assinaturaError } = await supabase
            .from('user_assinaturas')
            .insert({
              user_id: result.user.id,
              kiwify_order_id: webhookData.order_id,
              kiwify_customer_id: Customer.email,
              kiwify_product_id: Product.product_id,
              tipo_assinatura: assinaturaInfo.tipo,
              status: 'ativa',
              valor: Commissions.charge_amount / 100, // Converter de centavos para reais
              moeda: Commissions.currency,
              data_inicio: new Date().toISOString(),
              data_fim: assinaturaInfo.dataFim,
              webhook_data: webhookData,
            })

          if (assinaturaError) {
            console.error('Erro ao criar assinatura:', assinaturaError)
          } else {
            console.log(
              'Assinatura criada com sucesso para o usuário:',
              result.user.id,
            )
          }
        }
      } catch (error) {
        console.error('Erro inesperado ao processar assinatura:', error)
      }
    }

    // 🚀 ENVIAR DADOS PARA NOTIFYX (SEMPRE)
    console.log('📤 Enviando dados para NotifyX...')

    const dadosNotifyX = {
      nome: nome,
      telefone: telefone,
      email: email,
      senha: result.senha, // Sempre a senha atual (CPF prioritário > CNPJ > gerada)
    }

    const notifyXResult = await enviarParaNotifyX(dadosNotifyX)

    if (notifyXResult.success) {
      console.log('✅ NotifyX: Dados enviados com sucesso')
    } else {
      console.error('❌ NotifyX: Falha ao enviar dados:', notifyXResult.error)
      // Não falha o webhook principal se o NotifyX falhar
    }

    return NextResponse.json(
      {
        message: result.isExisting
          ? 'Conta atualizada e senha redefinida com sucesso'
          : 'Conta criada com sucesso',
        user_id: result.user?.id,
        order_id: webhookData.order_id,
        subscription_type: assinaturaInfo.tipo,
        is_existing_user: result.isExisting,
        password_updated: result.isExisting,
        new_password: result.senha,
        password_type: result.tipoSenha,
        notifyx_sent: true,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Erro no webhook:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

// Método GET para verificar se o endpoint está funcionando
export async function GET() {
  return NextResponse.json(
    {
      message: 'Webhook endpoint está funcionando',
      timestamp: new Date().toISOString(),
      notifyx_configured: !!NOTIFYX_WEBHOOK_URL,
    },
    { status: 200 },
  )
}
