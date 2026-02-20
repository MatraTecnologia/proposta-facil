"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Trash2, Save, Plus } from "lucide-react"
import Link from "next/link"

interface ServicoSelecionado {
  id: string
  nome: string
  descricao?: string
  valor_base: number
  quantidade: number
  valor_personalizado?: number
  observacoes?: string
}

interface Cliente {
  id: string
  nome: string
  empresa?: string
  email: string
  telefone?: string
}

interface Servico {
  id: string
  nome: string
  descricao?: string
  valor_base: number
  categoria: string
  status: string
}

interface Modelo {
  id: string
  nome: string
  descricao?: string
}

export default function NovaPropostaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    titulo: "",
    cliente_id: "",
    modelo_id: "",
    data_vencimento: "",
    observacoes: "",
    desconto: 0,
    acrescimo: 0,
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  useEffect(() => {
    // Verificar se há modelo pré-selecionado na URL
    const modeloId = searchParams.get("modelo")
    if (modeloId && modelos.length > 0 && formData.modelo_id !== modeloId) {
      setFormData((prev) => ({ ...prev, modelo_id: modeloId }))
    }
  }, [searchParams, modelos.length])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", user?.id)
        .order("nome")

      if (clientesError) throw clientesError

      // Carregar serviços ativos
      const { data: servicosData, error: servicosError } = await supabase
        .from("servicos")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "ativo")
        .order("nome")

      if (servicosError) throw servicosError

      // Carregar modelos
      const { data: modelosData, error: modelosError } = await supabase
        .from("modelos")
        .select("*")
        .eq("user_id", user?.id)
        .order("nome")

      if (modelosError) throw modelosError

      setClientes(clientesData || [])
      setServicos(servicosData || [])
      setModelos(modelosData || [])

      // Definir data de vencimento padrão apenas se ainda não foi definida
      setFormData((prev) => {
        if (!prev.data_vencimento) {
          const defaultDate = new Date()
          defaultDate.setDate(defaultDate.getDate() + 30)
          return {
            ...prev,
            data_vencimento: defaultDate.toISOString().split("T")[0],
          }
        }
        return prev
      })
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar dados",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const adicionarServico = (servicoId: string) => {
    const servico = servicos.find((s) => s.id === servicoId)
    if (!servico) return

    const servicoExistente = servicosSelecionados.find((s) => s.id === servicoId)
    if (servicoExistente) {
      setServicosSelecionados((prev) =>
        prev.map((s) => (s.id === servicoId ? { ...s, quantidade: s.quantidade + 1 } : s)),
      )
    } else {
      setServicosSelecionados((prev) => [
        ...prev,
        {
          id: servico.id,
          nome: servico.nome,
          descricao: servico.descricao,
          valor_base: servico.valor_base,
          quantidade: 1,
        },
      ])
    }
  }

  const removerServico = (servicoId: string) => {
    setServicosSelecionados((prev) => prev.filter((s) => s.id !== servicoId))
  }

  const atualizarServico = (servicoId: string, campo: string, valor: any) => {
    setServicosSelecionados((prev) => prev.map((s) => (s.id === servicoId ? { ...s, [campo]: valor } : s)))
  }

  const calcularSubtotal = () => {
    return servicosSelecionados.reduce((total, servico) => {
      const valor = servico.valor_personalizado || servico.valor_base
      return total + valor * servico.quantidade
    }, 0)
  }

  const calcularTotal = () => {
    const subtotal = calcularSubtotal()
    const desconto = (subtotal * formData.desconto) / 100
    const acrescimo = (subtotal * formData.acrescimo) / 100
    return subtotal - desconto + acrescimo
  }

  const salvarProposta = async (status: "rascunho" | "enviada" = "rascunho") => {
    if (!formData.titulo || !formData.cliente_id || servicosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios e adicione pelo menos um serviço",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Gerar número único da proposta
      const agora = new Date()
      const ano = agora.getFullYear()
      const mes = String(agora.getMonth() + 1).padStart(2, "0")
      const dia = String(agora.getDate()).padStart(2, "0")
      const hora = String(agora.getHours()).padStart(2, "0")
      const minuto = String(agora.getMinutes()).padStart(2, "0")
      const segundo = String(agora.getSeconds()).padStart(2, "0")

      const numero = `PROP-${ano}${mes}${dia}-${hora}${minuto}${segundo}`

      const novaProposta = {
        user_id: user?.id,
        numero,
        titulo: formData.titulo,
        cliente_id: formData.cliente_id,
        modelo_id: formData.modelo_id || null,
        servicos_selecionados: servicosSelecionados,
        valor_total: calcularTotal(),
        subtotal: calcularSubtotal(),
        desconto: formData.desconto,
        acrescimo: formData.acrescimo,
        status,
        data_vencimento: formData.data_vencimento,
        observacoes: formData.observacoes || null,
      }

      const { data, error } = await supabase.from("propostas").insert([novaProposta]).select("id").single()

      if (error) {
        console.error("Erro do Supabase:", error)
        throw error
      }

      if (!data || !data.id) {
        throw new Error("Proposta criada mas ID não retornado")
      }

      toast({
        title: "Sucesso!",
        description: `Proposta ${status === "rascunho" ? "salva como rascunho" : "criada e enviada"}`,
      })

      // Aguardar um pouco antes de redirecionar para garantir que a proposta foi salva
      setTimeout(() => {
        router.push(`/propostas/${data.id}`)
      }, 500)
    } catch (error) {
      console.error("Erro ao salvar proposta:", error)
      toast({
        title: "Erro",
        description: `Falha ao salvar proposta: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const clienteSelecionado = clientes.find((c) => c.id === formData.cliente_id)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/propostas">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Nova Proposta</h1>
            <p className="text-gray-400">Crie uma nova proposta comercial</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => salvarProposta("rascunho")}
            className="border-gray-600"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Rascunho"}
          </Button>
          <Button
            onClick={() => salvarProposta("enviada")}
            className="bg-orange-600 hover:bg-orange-700"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Criando..." : "Criar Proposta"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Básicas */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da Proposta *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Ex: Desenvolvimento de Site Institucional"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id} className="text-gray-300">
                          {cliente.nome} {cliente.empresa && `- ${cliente.empresa}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {clientes.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Nenhum cliente encontrado.
                      <Link href="/clientes" className="text-orange-400 hover:underline ml-1">
                        Cadastre um cliente primeiro
                      </Link>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo de Proposta</Label>
                  <Select
                    value={formData.modelo_id}
                    onValueChange={(value) => setFormData({ ...formData, modelo_id: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Selecione um modelo (opcional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {modelos.map((modelo) => (
                        <SelectItem key={modelo.id} value={modelo.id} className="text-gray-300">
                          {modelo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modelos.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Nenhum modelo encontrado.
                      <Link href="/modelos" className="text-orange-400 hover:underline ml-1">
                        Crie um modelo primeiro
                      </Link>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serviços */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Adicionar Serviço</Label>
                <Select onValueChange={adicionarServico}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue placeholder="Selecione um serviço para adicionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {servicos.map((servico) => (
                      <SelectItem key={servico.id} value={servico.id} className="text-gray-300">
                        {servico.nome} - R$ {servico.valor_base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {servicos.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Nenhum serviço ativo encontrado.
                    <Link href="/servicos" className="text-orange-400 hover:underline ml-1">
                      Cadastre serviços primeiro
                    </Link>
                  </p>
                )}
              </div>

              {servicosSelecionados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum serviço adicionado</p>
                  <p className="text-sm">Selecione serviços acima para adicionar à proposta</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {servicosSelecionados.map((servico) => (
                    <div key={servico.id} className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{servico.nome}</h4>
                          {servico.descricao && <p className="text-sm text-gray-400">{servico.descricao}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerServico(servico.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={servico.quantidade}
                            onChange={(e) =>
                              atualizarServico(servico.id, "quantidade", Number.parseInt(e.target.value))
                            }
                            className="bg-gray-700 border-gray-600 h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Valor Unitário (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={servico.valor_personalizado || servico.valor_base}
                            onChange={(e) =>
                              atualizarServico(servico.id, "valor_personalizado", Number.parseFloat(e.target.value))
                            }
                            className="bg-gray-700 border-gray-600 h-8"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Total</Label>
                          <div className="h-8 flex items-center text-orange-400 font-medium">
                            R${" "}
                            {((servico.valor_personalizado || servico.valor_base) * servico.quantidade).toLocaleString(
                              "pt-BR",
                              { minimumFractionDigits: 2 },
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3">
                        <Label className="text-xs">Observações do Serviço</Label>
                        <Textarea
                          value={servico.observacoes || ""}
                          onChange={(e) => atualizarServico(servico.id, "observacoes", e.target.value)}
                          className="bg-gray-700 border-gray-600 mt-1"
                          rows={2}
                          placeholder="Observações específicas deste serviço..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="bg-gray-800 border-gray-600"
                rows={4}
                placeholder="Observações gerais da proposta, condições de pagamento, prazos especiais, etc..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Section */}
        <div className="space-y-6">
          {/* Cliente Info */}
          {clienteSelecionado && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Cliente Selecionado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium text-white">{clienteSelecionado.nome}</p>
                  {clienteSelecionado.empresa && <p className="text-sm text-gray-400">{clienteSelecionado.empresa}</p>}
                </div>
                <div className="text-sm text-gray-400">
                  <p>{clienteSelecionado.email}</p>
                  {clienteSelecionado.telefone && <p>{clienteSelecionado.telefone}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumo Financeiro */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">
                    R$ {calcularSubtotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Desconto (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.desconto}
                      onChange={(e) => setFormData({ ...formData, desconto: Number.parseFloat(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-600 h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Acréscimo (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.acrescimo}
                      onChange={(e) => setFormData({ ...formData, acrescimo: Number.parseFloat(e.target.value) || 0 })}
                      className="bg-gray-800 border-gray-600 h-8"
                    />
                  </div>
                </div>

                {formData.desconto > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400">Desconto:</span>
                    <span className="text-red-400">
                      -R${" "}
                      {((calcularSubtotal() * formData.desconto) / 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {formData.acrescimo > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Acréscimo:</span>
                    <span className="text-green-400">
                      +R${" "}
                      {((calcularSubtotal() * formData.acrescimo) / 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Total:</span>
                    <span className="font-bold text-xl text-orange-400">
                      R$ {calcularTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {formData.data_vencimento && (
                <div className="text-sm text-gray-400 pt-2 border-t border-gray-700">
                  Válida até {new Date(formData.data_vencimento).toLocaleDateString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
