"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Copy,
  Download,
  Calendar,
  DollarSign,
  FileText,
  Filter,
  User,
  Building,
} from "lucide-react"
import Link from "next/link"

interface Proposta {
  id: string
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
  // Dados do cliente (join)
  cliente_nome?: string
  cliente_empresa?: string
}

const statusOptions = [
  { value: "rascunho", label: "Rascunho", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  { value: "enviada", label: "Enviada", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "aceita", label: "Aceita", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "rejeitada", label: "Rejeitada", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { value: "expirada", label: "Expirada", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
]

export default function PropostasPage() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [clienteFilter, setClienteFilter] = useState("todos")
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar propostas com dados do cliente
      const { data: propostasData, error: propostasError } = await supabase
        .from("propostas")
        .select(`
          *,
          clientes!inner(nome, empresa)
        `)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (propostasError) throw propostasError

      // Formatar dados das propostas
      const propostasFormatadas =
        propostasData?.map((proposta) => ({
          ...proposta,
          cliente_nome: proposta.clientes?.nome,
          cliente_empresa: proposta.clientes?.empresa,
        })) || []

      setPropostas(propostasFormatadas)

      // Carregar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", user?.id)
        .order("nome")

      if (clientesError) throw clientesError
      setClientes(clientesData || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar propostas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteProposta = async (id: string) => {
    try {
      const { error } = await supabase.from("propostas").delete().eq("id", id).eq("user_id", user?.id)

      if (error) throw error

      await loadData()
      toast({
        title: "Proposta removida",
        description: "Proposta foi removida com sucesso",
      })
    } catch (error) {
      console.error("Erro ao deletar proposta:", error)
      toast({
        title: "Erro",
        description: "Falha ao remover proposta",
        variant: "destructive",
      })
    }
  }

  const duplicateProposta = async (proposta: Proposta) => {
    try {
      const novaProposta = {
        user_id: user?.id,
        numero: `PROP-${Date.now()}`,
        titulo: `${proposta.titulo} (Cópia)`,
        cliente_id: proposta.cliente_id,
        servicos_selecionados: proposta.servicos_selecionados,
        valor_total: proposta.valor_total,
        subtotal: proposta.subtotal,
        desconto: proposta.desconto,
        acrescimo: proposta.acrescimo,
        status: "rascunho" as const,
        data_vencimento: proposta.data_vencimento,
        observacoes: proposta.observacoes,
      }

      const { error } = await supabase.from("propostas").insert(novaProposta)

      if (error) throw error

      await loadData()
      toast({
        title: "Proposta duplicada",
        description: "Uma cópia da proposta foi criada",
      })
    } catch (error) {
      console.error("Erro ao duplicar proposta:", error)
      toast({
        title: "Erro",
        description: "Falha ao duplicar proposta",
        variant: "destructive",
      })
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("propostas")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user?.id)

      if (error) throw error

      await loadData()
      toast({
        title: "Status atualizado",
        description: `Proposta marcada como ${statusOptions.find((s) => s.value === newStatus)?.label}`,
      })
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast({
        title: "Erro",
        description: "Falha ao atualizar status",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((s) => s.value === status)
    return statusConfig || statusOptions[0]
  }

  const isExpired = (dataVencimento: string) => {
    return new Date(dataVencimento) < new Date()
  }

  const filteredPropostas = propostas.filter((proposta) => {
    const matchesSearch =
      proposta.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposta.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposta.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposta.cliente_empresa?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "todos" || proposta.status === statusFilter
    const matchesCliente = clienteFilter === "todos" || proposta.cliente_id === clienteFilter

    return matchesSearch && matchesStatus && matchesCliente
  })

  const stats = {
    total: propostas.length,
    rascunho: propostas.filter((p) => p.status === "rascunho").length,
    enviada: propostas.filter((p) => p.status === "enviada").length,
    aceita: propostas.filter((p) => p.status === "aceita").length,
    rejeitada: propostas.filter((p) => p.status === "rejeitada").length,
    valorTotal: propostas.filter((p) => p.status === "aceita").reduce((acc, p) => acc + p.valor_total, 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Propostas</h1>
          <p className="text-gray-400">Gerencie suas propostas comerciais</p>
        </div>

        <Link href="/proposta-novo">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Proposta
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <p className="text-xs text-gray-400">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-400">{stats.rascunho}</div>
            <p className="text-xs text-gray-400">Rascunhos</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.enviada}</div>
            <p className="text-xs text-gray-400">Enviadas</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">{stats.aceita}</div>
            <p className="text-xs text-gray-400">Aceitas</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">{stats.rejeitada}</div>
            <p className="text-xs text-gray-400">Rejeitadas</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-orange-400">
              R$ {stats.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-400">Faturado</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar propostas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-gray-800 border-gray-600">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="todos" className="text-gray-300">
              Todos os status
            </SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value} className="text-gray-300">
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="bg-gray-800 border-gray-600">
            <User className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            <SelectItem value="todos" className="text-gray-300">
              Todos os clientes
            </SelectItem>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id} className="text-gray-300">
                {cliente.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-sm text-gray-400 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          {filteredPropostas.length} proposta{filteredPropostas.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Propostas List */}
      <div className="space-y-4">
        {filteredPropostas.map((proposta) => {
          const statusConfig = getStatusBadge(proposta.status)
          const expired = isExpired(proposta.data_vencimento)

          return (
            <Card
              key={proposta.id}
              className="bg-gray-900 border-gray-700 hover:border-orange-500/50 transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{proposta.titulo}</h3>
                        <p className="text-sm text-gray-400">#{proposta.numero}</p>
                      </div>
                      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      {expired && proposta.status === "enviada" && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expirada</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center text-gray-300">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{proposta.cliente_nome}</div>
                          {proposta.cliente_empresa && (
                            <div className="text-gray-500 flex items-center">
                              <Building className="w-3 h-3 mr-1" />
                              {proposta.cliente_empresa}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-gray-300">
                        <DollarSign className="w-4 h-4 mr-2 text-orange-400" />
                        <div>
                          <div className="font-medium text-orange-400">
                            R$ {proposta.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-gray-500">Valor total</div>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-300">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {new Date(proposta.data_vencimento).toLocaleDateString("pt-BR")}
                          </div>
                          <div className="text-gray-500">Vencimento</div>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-300">
                        <FileText className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{proposta.servicos_selecionados?.length || 0} serviço(s)</div>
                          <div className="text-gray-500">Itens</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <div className="flex gap-1">
                      <Link href={`/propostas/${proposta.id}`}>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/propostas/${proposta.id}`}>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicateProposta(proposta)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProposta(proposta.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Select value={proposta.status} onValueChange={(value) => updateStatus(proposta.id, value)}>
                      <SelectTrigger className="w-32 h-8 bg-gray-800 border-gray-600 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value} className="text-gray-300 text-xs">
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredPropostas.length === 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {searchTerm || statusFilter !== "todos" || clienteFilter !== "todos"
                ? "Nenhuma proposta encontrada"
                : "Nenhuma proposta criada"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== "todos" || clienteFilter !== "todos"
                ? "Tente ajustar os filtros de busca"
                : "Comece criando sua primeira proposta comercial"}
            </p>
            {!searchTerm && statusFilter === "todos" && clienteFilter === "todos" && (
              <Link href="/proposta-novo">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Proposta
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
