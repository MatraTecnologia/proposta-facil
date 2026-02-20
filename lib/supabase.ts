import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para as tabelas
export interface Cliente {
  id: string
  user_id: string
  nome: string
  empresa?: string
  email: string
  telefone?: string
  created_at: string
  updated_at: string
}

export interface Servico {
  id: string
  user_id: string
  nome: string
  descricao?: string
  categoria: string
  valor_base: number
  tempo_entrega?: string
  funcionalidades: string[]
  status: string
  destaque: boolean
  created_at: string
  updated_at: string
}

export interface Proposta {
  id: string
  user_id: string
  numero: string
  titulo: string
  cliente_id: string
  servicos_selecionados: any[]
  valor_total: number
  subtotal: number
  desconto: number
  acrescimo: number
  status: "rascunho" | "enviada" | "aceita" | "rejeitada" | "expirada"
  data_vencimento: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface Modelo {
  id: string
  user_id: string
  nome: string
  descricao?: string
  conteudo: any
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Imagem {
  id: string
  user_id: string
  nome: string
  url: string
  tamanho?: number
  tipo?: string
  categoria: string
  created_at: string
}

export interface Assinatura {
  id: string
  user_id: string
  nome: string
  data_assinatura: any
  largura: number
  altura: number
  created_at: string
}

export interface Configuracao {
  id: string
  user_id: string
  empresa_nome?: string
  empresa_cnpj?: string
  empresa_endereco?: string
  empresa_telefone?: string
  empresa_email?: string
  empresa_website?: string
  sistema_moeda: string
  sistema_idioma: string
  sistema_timezone: string
  sistema_formato_data: string
  dados_backup_automatico: boolean
  dados_retencao_dias: number
  created_at: string
  updated_at: string
}

export interface UserAssinatura {
  id: string
  user_id: string
  kiwify_order_id?: string
  kiwify_customer_id?: string
  kiwify_product_id?: string
  tipo_assinatura: "mensal" | "anual" | "vitalicia"
  status: "ativa" | "cancelada" | "expirada" | "pendente"
  valor?: number
  moeda: string
  data_inicio: string
  data_fim?: string
  data_cancelamento?: string
  auto_renovar: boolean
  webhook_data?: any
  created_at: string
  updated_at: string
}
