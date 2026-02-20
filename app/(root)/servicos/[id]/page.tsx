"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import {
  ArrowLeft,
  Package,
  DollarSign,
  Clock,
  Tag,
  Star,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

interface Servico {
  id: string
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

interface Proposta {
  id: string
  numero_proposta: string
  cliente_nome: string
  status: string
  valor_total: number
  data_criacao: string
  itens: any[]
}

interface FormData {
  nome: string
  descricao: string
  valor: string
}

const initialFormData: FormData = {
  nome: "",
  descricao: "",
  valor: "",
}

export default function ServicoDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [servico, setServico] = useState<Servico | null>(null)
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [saving, setSaving] = useState(false)



  const fetchServicoData = useCallback(async () => {
    if (!user?.id || !params.id) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single()

      if (error) throw error

      setServico(data)
      setFormData({
        nome: data.nome,
        descricao: data.descricao || "",
        valor: data.valor_base.toString(),
      })

      // Buscar propostas que usam este serviço
      const { data: propostasData, error: propostasError } = await supabase
        .from("propostas")
        .select("*")
        .eq("user_id", user.id)

      if (propostasError) throw propostasError

      // Filtrar propostas que contêm este serviço
      const propostasComServico = (propostasData || []).filter((proposta) => {
        if (!proposta.itens || !Array.isArray(proposta.itens)) return false
        return proposta.itens.some(
          (item: { nome: string }) => item.nome && item.nome.toLowerCase().includes(data.nome.toLowerCase()),
        )
      })

      setPropostas(propostasComServico)
    } catch (err) {
      console.error("Erro ao carregar serviço:", err)
      setError("Erro ao carregar dados do serviço")
    } finally {
      setLoading(false)
    }
  }, [user?.id, params.id, supabase])

  useEffect(() => {
    fetchServicoData()
  }, [fetchServicoData])

  const handleEdit = useCallback(() => {
    if (servico) {
      setFormData({
        nome: servico.nome,
        descricao: servico.descricao || "",
        valor: servico.valor_base.toString(),
      })
      setIsEditDialogOpen(true)
    }
  }, [servico])

  const handleSave = useCallback(async () => {
    if (!user?.id || !servico) return

    if (!formData.nome.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do serviço é obrigatório",
        variant: "destructive",
      })
      return
    }

    const valor = parseFloat(formData.valor.replace(",", "."))
    if (isNaN(valor) || valor < 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido para o serviço",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from("servicos")
        .update({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim() || null,
          valor_base: valor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", servico.id)
        .eq("user_id", user.id)

      if (error) throw error

      await fetchServicoData()
      setIsEditDialogOpen(false)
      toast({
        title: "Serviço atualizado",
        description: "As informações do serviço foram atualizadas com sucesso",
      })
    } catch (error) {
      console.error("Erro ao atualizar serviço:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o serviço. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [user?.id, servico, formData, fetchServicoData, toast])

  const handleDelete = useCallback(async () => {
    if (!user?.id || !servico) return

    try {
      // Verificar se o serviço está sendo usado em propostas
      const { data: propostasComServico } = await supabase
        .from("propostas")
        .select("id")
        .eq("user_id", user.id)
        .contains("itens", [{ nome: servico.nome }])

      if (propostasComServico && propostasComServico.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Este serviço está sendo usado em propostas. Remova o serviço das propostas primeiro.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("servicos")
        .delete()
        .eq("id", servico.id)
        .eq("user_id", user.id)

      if (error) throw error

      toast({
        title: "Serviço removido",
        description: "O serviço foi removido com sucesso",
      })
      router.push("/servicos")
    } catch (error) {
      console.error("Erro ao deletar serviço:", error)
      toast({
        title: "Erro",
        description: "Não foi possível remover o serviço. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }, [user?.id, servico, router, toast])

  const getCategoriaColor = (categoria: string) => {
    const colors: { [key: string]: string } = {
      "Desenvolvimento Web": "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "Design Gráfico": "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "Marketing Digital": "bg-green-500/20 text-green-400 border-green-500/30",
      Consultoria: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      Manutenção: "bg-red-500/20 text-red-400 border-red-500/30",
      Outros: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    }
    return colors[categoria] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aceita":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "recusada":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "pendente":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aceita":
        return <CheckCircle className="w-4 h-4" />
      case "recusada":
        return <XCircle className="w-4 h-4" />
      case "pendente":
        return <AlertCircle className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  // Calcular estatísticas
  const totalPropostas = propostas.length
  const propostasAceitas = propostas.filter((p) => p.status === "aceita").length
  const valorTotalGerado = propostas
    .filter((p) => p.status === "aceita")
    .reduce((total, proposta) => {
      // Calcular valor dos itens relacionados ao serviço
      const itensServico =
        proposta.itens?.filter(
          (item) => item.nome && item.nome.toLowerCase().includes(servico?.nome.toLowerCase() || ""),
        ) || []
      const valorServico = itensServico.reduce((sum, item) => sum + (item.valor || 0), 0)
      return total + valorServico
    }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    )
  }

  if (error || !servico) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">{error || "Serviço não encontrado"}</h3>
            <p className="text-gray-500 mb-4">O serviço que você está procurando não existe ou foi removido.</p>
            <Button onClick={() => router.push("/servicos")} className="bg-orange-600 hover:bg-orange-700">
              Ver Todos os Serviços
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-500" />
              {servico.nome}
              {servico.destaque && <Star className="w-6 h-6 text-yellow-500 fill-current" />}
            </h1>
            <p className="text-gray-400">Detalhes completos do serviço</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-gray-700 hover:border-orange-500">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-900 border-gray-700">
            <DropdownMenuItem
              className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
              onClick={handleEdit}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Editar Serviço
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Serviço
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Informações do Serviço */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                Informações do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Categoria</label>
                  <Badge className={`mt-1 ${getCategoriaColor(servico.categoria)} border`}>
                    <Tag className="w-3 h-3 mr-1" />
                    {servico.categoria}
                  </Badge>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Status</label>
                  <Badge
                    className={`mt-1 ${servico.status === "ativo"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                      } border`}
                  >
                    {servico.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Valor Base</label>
                  <div className="flex items-center text-green-400 font-semibold mt-1">
                    <DollarSign className="w-4 h-4 mr-1" />
                    R$ {servico.valor_base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {servico.tempo_entrega && (
                  <div>
                    <label className="text-sm text-gray-400">Tempo de Entrega</label>
                    <div className="flex items-center text-gray-300 mt-1">
                      <Clock className="w-4 h-4 mr-1" />
                      {servico.tempo_entrega}
                    </div>
                  </div>
                )}
              </div>

              {servico.descricao && (
                <div>
                  <label className="text-sm text-gray-400">Descrição</label>
                  <p className="text-gray-300 mt-1">{servico.descricao}</p>
                </div>
              )}

              {servico.funcionalidades.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Funcionalidades</label>
                  <div className="space-y-2">
                    {servico.funcionalidades.map((func, index) => (
                      <div key={index} className="flex items-center text-gray-300">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-3" />
                        {func}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <div>
                  <label className="text-sm text-gray-400">Criado em</label>
                  <div className="flex items-center text-gray-300 mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(servico.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Atualizado em</label>
                  <div className="flex items-center text-gray-300 mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(servico.updated_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas */}
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalPropostas}</div>
                <div className="text-sm text-gray-400">Propostas Criadas</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{propostasAceitas}</div>
                <div className="text-sm text-gray-400">Propostas Aceitas</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  R$ {valorTotalGerado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-400">Valor Total Gerado</div>
              </div>

              {totalPropostas > 0 && (
                <div className="text-center pt-4 border-t border-gray-700">
                  <div className="text-lg font-semibold text-orange-400">
                    {((propostasAceitas / totalPropostas) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">Taxa de Conversão</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Propostas que usam este serviço */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Propostas que Usam Este Serviço ({propostas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {propostas.length > 0 ? (
            <div className="space-y-4">
              {propostas.map((proposta) => (
                <div
                  key={proposta.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-orange-500/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-white">Proposta #{proposta.numero_proposta}</h4>
                      <Badge className={`text-xs ${getStatusColor(proposta.status)} border`}>
                        {getStatusIcon(proposta.status)}
                        <span className="ml-1 capitalize">{proposta.status}</span>
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center text-gray-300">
                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                        {proposta.cliente_nome}
                      </div>

                      <div className="flex items-center text-green-400">
                        <DollarSign className="w-4 h-4 mr-1" />
                        R$ {proposta.valor_total?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "0,00"}
                      </div>

                      <div className="flex items-center text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(proposta.data_criacao).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/propostas/${proposta.id}`)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Nenhuma proposta encontrada</h3>
              <p className="text-gray-500">Este serviço ainda não foi utilizado em nenhuma proposta.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Editar Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }} className="space-y-4">
            <div>
              <Label htmlFor="nome" className="text-sm text-gray-300 mb-2 block">
                Nome do Serviço *
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="bg-gray-800 border-gray-600 focus:border-orange-500"
                placeholder="Nome do serviço"
                required
              />
            </div>

            <div>
              <Label htmlFor="descricao" className="text-sm text-gray-300 mb-2 block">
                Descrição
              </Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="bg-gray-800 border-gray-600 focus:border-orange-500 min-h-[100px]"
                placeholder="Descreva o serviço em detalhes"
              />
            </div>

            <div>
              <Label htmlFor="valor" className="text-sm text-gray-300 mb-2 block">
                Valor *
              </Label>
              <Input
                id="valor"
                type="text"
                value={formData.valor}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, "")
                  setFormData({ ...formData, valor: value })
                }}
                className="bg-gray-800 border-gray-600 focus:border-orange-500"
                placeholder="0,00"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-gray-600"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir o serviço {servico.nome}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
