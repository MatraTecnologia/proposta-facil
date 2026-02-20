"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Plus, Edit, Trash2, Eye, FileText, Calendar, Sparkles, Zap, Clock } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { processarVariaveis, type DadosProposta } from "@/lib/processarVariaveis"

interface Modelo {
  id: string
  nome: string
  descricao?: string
  conteudo: string
  tipo: "visual" | "tradicional"
  created_at: string
  updated_at: string
}

export default function ModelosPage() {
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Estados para modal de preview
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [clienteId, setClienteId] = useState("")
  const [servicoId, setServicoId] = useState("")
  const [modeloPreview, setModeloPreview] = useState<Modelo | null>(null)
  const [loadingPreviewData, setLoadingPreviewData] = useState(false)

  useEffect(() => {
    if (user) {
      loadModelos()
    }
  }, [user])

  useEffect(() => {
    if (showPreviewModal && user?.id) {
      setLoadingPreviewData(true)
      Promise.all([
        supabase.from("clientes").select("*").eq("user_id", user.id).order("nome"),
        supabase.from("servicos").select("*").eq("user_id", user.id).order("nome"),
      ]).then(([clientesRes, servicosRes]) => {
        setClientes(clientesRes.data || [])
        setServicos(servicosRes.data || [])
        setLoadingPreviewData(false)
      })
    }
  }, [showPreviewModal, user?.id])

  const loadModelos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("modelos")
        .select("*")
        .eq("user_id", user?.id)
        .order("updated_at", { ascending: false })

      if (error) throw error
      setModelos(data || [])
    } catch (error) {
      console.error("Erro ao carregar modelos:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar modelos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const excluirModelo = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo?")) return

    try {
      const { error } = await supabase.from("modelos").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Modelo excluído com sucesso",
      })

      loadModelos()
    } catch (error) {
      console.error("Erro ao excluir modelo:", error)
      toast({
        title: "Erro",
        description: "Falha ao excluir modelo",
        variant: "destructive",
      })
    }
  }

  // Função para converter modelo visual JSON em HTML
  const renderizarModeloVisual = (modeloData: any) => {
    try {
      const { template, cabecalho, introducao, rodape, cores, observacoes } = modeloData

      let html = `
        <div style="
          font-family: ${template?.configuracoes?.fontFamily || "Arial, sans-serif"};
          background-color: ${template?.configuracoes?.corFundo || "#ffffff"};
          padding: ${template?.configuracoes?.padding || "40px"};
          max-width: ${template?.configuracoes?.largura || "800px"};
          margin: 0 auto;
          min-height: ${template?.configuracoes?.altura || "auto"};
          color: ${cores?.texto || "#333333"};
        ">
      `

      // Cabeçalho
      if (cabecalho) {
        html += `
          <div style="
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            color: ${cores?.primaria || "#FF6F00"};
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${cores?.primaria || "#FF6F00"};
          ">
            ${cabecalho}
          </div>
        `
      }

      // Introdução
      if (introducao) {
        html += `
          <div style="
            margin-bottom: 30px;
            color: ${cores?.texto || "#333333"};
            line-height: 1.6;
          ">
            ${introducao}
          </div>
        `
      }

      // Elementos do template
      if (template?.elementos && Array.isArray(template.elementos)) {
        template.elementos.forEach((elemento: any) => {
          if (!elemento || !elemento.estilo) return

          const estilo = Object.entries(elemento.estilo)
            .map(([key, value]) => `${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value}`)
            .join("; ")

          switch (elemento.tipo) {
            case "texto":
              html += `<div style="${estilo}">${elemento.conteudo || ""}</div>`
              break
            case "titulo":
              html += `<h2 style="${estilo}">${elemento.conteudo || ""}</h2>`
              break
            case "subtitulo":
              html += `<h3 style="${estilo}">${elemento.conteudo || ""}</h2>`
              break
            case "paragrafo":
              html += `<p style="${estilo}">${elemento.conteudo || ""}</p>`
              break
            case "lista":
              if (elemento.conteudo) {
                const itens = elemento.conteudo.split("\n").filter((item: string) => item.trim())
                html += `<ul style="${estilo}">`
                itens.forEach((item: string) => {
                  html += `<li>${item.trim()}</li>`
                })
                html += `</ul>`
              } else {
                html += `<ul style="${estilo}"><li>Item de exemplo</li></ul>`
              }
              break
            case "tabela":
              html += `<div style="${estilo}">{{servicos_tabela}}</div>`
              break
            case "variavel":
              html += `<span style="${estilo}">{{${elemento.conteudo || "variavel"}}}</span>`
              break
            default:
              html += `<div style="${estilo}">${elemento.conteudo || ""}</div>`
          }
        })
      }

      // Seção de valores (sempre incluir para propostas)
      html += `
        <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <h3 style="color: ${cores?.primaria || "#FF6F00"}; margin-bottom: 15px;">Resumo Financeiro</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Subtotal:</span>
            <span>{{valor_subtotal}}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Desconto:</span>
            <span>{{valor_desconto}}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Acréscimo:</span>
            <span>{{valor_acrescimo}}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: ${cores?.primaria || "#FF6F00"
        }; border-top: 1px solid #ddd; padding-top: 10px;">
            <span>Total:</span>
            <span>{{valor_total}}</span>
          </div>
        </div>
      `

      // Observações
      if (observacoes) {
        html += `
          <div style="
            margin-top: 30px;
            padding: 15px;
            background-color: #f5f5f5;
            border-left: 4px solid ${cores?.primaria || "#FF6F00"};
            color: ${cores?.texto || "#333333"};
          ">
            <h4 style="margin-top: 0; color: ${cores?.primaria || "#FF6F00"};">Observações:</h4>
            <p>${observacoes}</p>
          </div>
        `
      }

      // Rodapé
      if (rodape) {
        html += `
          <div style="
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: ${cores?.texto || "#333333"};
            font-style: italic;
          ">
            ${rodape}
          </div>
        `
      }

      html += `</div>`

      return html
    } catch (error) {
      console.error("Erro ao renderizar modelo visual:", error)
      return `
        <div style="padding: 40px; text-align: center;">
          <h2 style="color: #e74c3c;">Erro ao Renderizar Modelo</h2>
          <p>Não foi possível renderizar este modelo. O formato pode estar corrompido.</p>
          <pre style="text-align: left; background: #f8f8f8; padding: 15px; border-radius: 5px; overflow: auto; max-height: 300px;">${JSON.stringify(
        error,
        null,
        2,
      )}</pre>
        </div>
      `
    }
  }

  const clientePreview = clientes.find((c) => c.id === clienteId) || null
  const servicoPreview = servicos.find((s) => s.id === servicoId) || null

  const previewModelo = (modelo: Modelo) => {
    setModeloPreview(modelo)
    setShowPreviewModal(true)
  }

  const abrirPreviewFinal = () => {
    if (!modeloPreview) return
    // Redirecionar para a página de preview dedicada
    router.push(`/modelos/preview/${modeloPreview.id}?cliente=${clienteId}&servico=${servicoId}`)
    setShowPreviewModal(false)
    setModeloPreview(null)
    setClienteId("")
    setServicoId("")
  }

  const usarModelo = (modeloId: string) => {
    router.push(`/proposta-novo?modelo=${modeloId}`)
  }

  const formatarDataRelativa = (data: string) => {
    const agora = new Date()
    const dataModelo = new Date(data)
    const diffMs = agora.getTime() - dataModelo.getTime()
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDias === 0) return "Hoje"
    if (diffDias === 1) return "Ontem"
    if (diffDias < 7) return `${diffDias} dias atrás`
    if (diffDias < 30) return `${Math.floor(diffDias / 7)} semanas atrás`
    return dataModelo.toLocaleDateString("pt-BR")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <div className="absolute inset-0 rounded-full border-2 border-orange-200 opacity-25"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-orange-700 to-orange-800 p-8">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>

        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              Modelos de Proposta
            </h1>
            <p className="text-orange-100 text-lg">
              Crie propostas profissionais em segundos com nossos modelos personalizados
            </p>
          </div>
          <Link href="/editor-modelo">
            <Button
              size="lg"
              className="bg-white text-orange-700 hover:bg-orange-50 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Novo Modelo
            </Button>
          </Link>
        </div>
      </div>

      {modelos.length === 0 ? (
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-yellow-800" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Nenhum modelo encontrado</h3>
            <p className="text-gray-400 text-center mb-8 max-w-md leading-relaxed">
              Crie seu primeiro modelo de proposta para agilizar a criação de propostas comerciais e impressionar seus
              clientes.
            </p>
            <Link href="/editor-modelo">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5 mr-2" />
                Criar Primeiro Modelo
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelos.map((modelo, index) => (
            <Card
              key={modelo.id}
              className="group bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-orange-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 flex flex-col h-full overflow-hidden hover:-translate-y-1"
            >
              {/* Header do Card com gradiente */}
              <div className="relative p-6 bg-gradient-to-r from-gray-800 to-gray-700">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {modelo.tipo === "visual" ? (
                        <Sparkles className="w-5 h-5 text-orange-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-400" />
                      )}
                      <CardTitle className="text-white text-xl font-bold truncate group-hover:text-orange-100 transition-colors">
                        {modelo.nome}
                      </CardTitle>
                    </div>
                    {modelo.descricao && (
                      <p className="text-gray-400 text-sm line-clamp-2 break-words leading-relaxed">
                        {modelo.descricao}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-3">
                    <Badge
                      variant={modelo.tipo === "visual" ? "default" : "secondary"}
                      className={`${modelo.tipo === "visual"
                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0"
                        } shadow-lg font-medium`}
                    >
                      {modelo.tipo === "visual" ? "Visual" : "Tradicional"}
                    </Badge>
                    <div className="text-xs text-gray-500 font-medium">#{String(index + 1).padStart(2, "0")}</div>
                  </div>
                </div>
              </div>

              <CardContent className="flex-1 flex flex-col justify-between p-6 space-y-6">
                {/* Informações do modelo */}
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">
                    <Clock className="w-4 h-4 mr-2 text-orange-400" />
                    <span className="font-medium">{formatarDataRelativa(modelo.updated_at)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">
                    <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                    <span>Criado em {new Date(modelo.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={() => previewModelo(modelo)}
                      className="flex-1 border-gray-600 hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-300 transition-all duration-200 group/btn"
                    >
                      <Eye className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                      Preview
                    </Button> */}
                    <Button
                      size="sm"
                      onClick={() => usarModelo(modelo.id)}
                      className="flex-1 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-lg hover:shadow-xl transition-all duration-200 group/btn"
                    >
                      <Zap className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                      Usar
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/editor-modelo?editid=${modelo.id}`} className="flex-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all duration-200 group/btn"
                      >
                        <Edit className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                        Editar
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => excluirModelo(modelo.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group/btn"
                    >
                      <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>

              {/* Indicador de hover */}
              <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Pré-visualizar Modelo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Cliente de Teste</label>
              <Select value={clienteId} onValueChange={setClienteId} disabled={loadingPreviewData || clientes.length === 0}>
                <SelectTrigger className="bg-gray-800 border-gray-600 w-full">
                  <SelectValue placeholder={loadingPreviewData ? "Carregando..." : "Selecione um cliente"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-gray-300">
                      {c.nome} {c.empresa && `- ${c.empresa}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Serviço de Teste</label>
              <Select value={servicoId} onValueChange={setServicoId} disabled={loadingPreviewData || servicos.length === 0}>
                <SelectTrigger className="bg-gray-800 border-gray-600 w-full">
                  <SelectValue placeholder={loadingPreviewData ? "Carregando..." : "Selecione um serviço"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {servicos.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-gray-300">
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700 mt-4"
              onClick={abrirPreviewFinal}
              disabled={!clienteId || !servicoId || loadingPreviewData}
            >
              Visualizar Modelo Preenchido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
