import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

// Cliente Supabase com service role para operações administrativas
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Token do webhook Kiwify
const KIWIFY_WEBHOOK_SECRET = process.env.KIWIFY_WEBHOOK_SECRET || "amsrut44n9z"

// Tipos de eventos do Kiwify
interface KiwifyWebhookData {
  order_id: string
  customer_id: string
  customer_email: string
  product_id: string
  product_name: string
  order_status: string
  payment_method: string
  installments: number
  order_total: number
  currency: string
  created_at: string
  updated_at: string
  custom_fields?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    // Verificar se é uma requisição válida do Kiwify
    const signature = request.headers.get("x-kiwify-signature")

    if (!signature) {
      console.error("Webhook signature não encontrada")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.text()
    const data: KiwifyWebhookData = JSON.parse(body)

    console.log("Webhook Kiwify recebido:", data)

    // Verificar assinatura do webhook
    const isValidSignature = verifyKiwifySignature(body, signature, KIWIFY_WEBHOOK_SECRET)
    if (!isValidSignature) {
      console.error("Assinatura do webhook inválida")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Buscar usuário pelo email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()

    if (userError) {
      console.error("Erro ao buscar usuários:", userError)
      return NextResponse.json({ error: "User lookup failed" }, { status: 500 })
    }

    const user = userData.users.find((u) => u.email === data.customer_email)

    if (!user) {
      console.error("Usuário não encontrado:", data.customer_email)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Determinar tipo de assinatura baseado no produto
    let tipoAssinatura: "mensal" | "anual" | "vitalicia" = "mensal"
    let dataFim: string | null = null

    // Mapear produtos do Kiwify para tipos de assinatura
    // Você deve substituir estes IDs pelos IDs reais dos seus produtos no Kiwify
    const produtoConfig: Record<string, { tipo: "mensal" | "anual" | "vitalicia"; duracao?: number }> = {
      // Exemplo: substitua pelos IDs reais dos seus produtos
      produto_mensal: { tipo: "mensal", duracao: 30 },
      produto_anual: { tipo: "anual", duracao: 365 },
      produto_vitalicio: { tipo: "vitalicia" },
    }

    // Tentar identificar o tipo de assinatura pelo nome do produto se não encontrar pelo ID
    if (!produtoConfig[data.product_id]) {
      const nomeProduto = data.product_name.toLowerCase()
      if (nomeProduto.includes("mensal")) {
        tipoAssinatura = "mensal"
        const dataInicio = new Date()
        const dataFimCalculada = new Date(dataInicio)
        dataFimCalculada.setDate(dataFimCalculada.getDate() + 30)
        dataFim = dataFimCalculada.toISOString()
      } else if (nomeProduto.includes("anual")) {
        tipoAssinatura = "anual"
        const dataInicio = new Date()
        const dataFimCalculada = new Date(dataInicio)
        dataFimCalculada.setDate(dataFimCalculada.getDate() + 365)
        dataFim = dataFimCalculada.toISOString()
      } else if (nomeProduto.includes("vitalic") || nomeProduto.includes("lifetime")) {
        tipoAssinatura = "vitalicia"
        dataFim = null
      }
    } else {
      const config = produtoConfig[data.product_id]
      tipoAssinatura = config.tipo

      if (config.duracao) {
        const dataInicio = new Date()
        const dataFimCalculada = new Date(dataInicio)
        dataFimCalculada.setDate(dataFimCalculada.getDate() + config.duracao)
        dataFim = dataFimCalculada.toISOString()
      }
    }

    // Determinar status baseado no status do pedido
    let status: "ativa" | "cancelada" | "expirada" | "pendente" = "pendente"

    switch (data.order_status.toLowerCase()) {
      case "paid":
      case "completed":
      case "aprovado":
      case "approved":
        status = "ativa"
        break
      case "cancelled":
      case "refunded":
      case "cancelado":
      case "reembolsado":
        status = "cancelada"
        break
      case "pending":
      case "pendente":
        status = "pendente"
        break
      default:
        status = "pendente"
    }

    // Verificar se já existe uma assinatura para este pedido
    const { data: existingAssinatura } = await supabaseAdmin
      .from("user_assinaturas")
      .select("*")
      .eq("kiwify_order_id", data.order_id)
      .single()

    if (existingAssinatura) {
      // Atualizar assinatura existente
      const { error: updateError } = await supabaseAdmin
        .from("user_assinaturas")
        .update({
          status,
          valor: data.order_total,
          data_fim: dataFim,
          webhook_data: data,
          updated_at: new Date().toISOString(),
        })
        .eq("kiwify_order_id", data.order_id)

      if (updateError) {
        console.error("Erro ao atualizar assinatura:", updateError)
        return NextResponse.json({ error: "Update failed" }, { status: 500 })
      }

      console.log("Assinatura atualizada:", data.order_id)
    } else {
      // Criar nova assinatura
      const { error: insertError } = await supabaseAdmin.from("user_assinaturas").insert({
        user_id: user.id,
        kiwify_order_id: data.order_id,
        kiwify_customer_id: data.customer_id,
        kiwify_product_id: data.product_id,
        tipo_assinatura: tipoAssinatura,
        status,
        valor: data.order_total,
        moeda: data.currency || "BRL",
        data_inicio: new Date().toISOString(),
        data_fim: dataFim,
        auto_renovar: tipoAssinatura !== "vitalicia",
        webhook_data: data,
      })

      if (insertError) {
        console.error("Erro ao criar assinatura:", insertError)
        return NextResponse.json({ error: "Insert failed" }, { status: 500 })
      }

      console.log("Nova assinatura criada:", data.order_id)
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" })
  } catch (error) {
    console.error("Erro no webhook Kiwify:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Função para verificar assinatura do webhook Kiwify
function verifyKiwifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Implementação básica de verificação HMAC
    const hmac = crypto.createHmac("sha256", secret)
    const calculatedSignature = hmac.update(payload).digest("hex")

    // Comparação segura de strings para evitar timing attacks
    return crypto.timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(signature))
  } catch (error) {
    console.error("Erro ao verificar assinatura:", error)
    // Em caso de erro, permitir a requisição em ambiente de desenvolvimento
    return process.env.NODE_ENV === "development"
  }
}
