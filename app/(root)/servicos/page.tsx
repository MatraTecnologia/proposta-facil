"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Edit, Trash2, Star, Clock, DollarSign, Tag, Save, X, Package, Eye } from "lucide-react"
import { useRouter } from "next/navigation"

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

const categorias = ["Desenvolvimento Web", "Design Gráfico", "Marketing Digital", "Consultoria", "Manutenção", "Outros"]

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("todas")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingServico, setEditingServico] = useState<Servico | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    categoria: "Desenvolvimento Web",
    valor_base: "",
    tempo_entrega: "",
    funcionalidades: "",
    status: "ativo",
    destaque: false,
  })

  const router = useRouter()

  useEffect(() => {
    if (user) {
      loadServicos()
    }
  }, [user])

  const loadServicos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setServicos(data || [])
    } catch (error) {
      console.error("Erro ao carregar serviços:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar serviços",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveServico = async () => {
    if (!formData.nome || !formData.categoria || !formData.valor_base) {
      toast({
        title: "Erro",
        description: "Nome, categoria e valor são obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (Number.parseFloat(formData.valor_base) < 0) {
      toast({
        title: "Erro",
        description: "Valor base não pode ser negativo",
        variant: "destructive",
      })
      return
    }

    try {
      const funcionalidadesArray = formData.funcionalidades
        .split("\n")
        .filter((f) => f.trim())
        .map((f) => f.trim())

      const servicoData = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        categoria: formData.categoria,
        valor_base: Number.parseFloat(formData.valor_base),
        tempo_entrega: formData.tempo_entrega || null,
        funcionalidades: funcionalidadesArray,
        status: formData.status,
        destaque: formData.destaque,
      }

      if (editingServico) {
        const { error } = await supabase
          .from("servicos")
          .update({
            ...servicoData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingServico.id)
          .eq("user_id", user?.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("servicos").insert({
          ...servicoData,
          user_id: user?.id,
        })

        if (error) throw error
      }

      await loadServicos()
      setIsDialogOpen(false)
      setEditingServico(null)
      resetForm()

      toast({
        title: "Sucesso!",
        description: editingServico ? "Serviço atualizado" : "Serviço criado",
      })
    } catch (error) {
      console.error("Erro ao salvar serviço:", error)
      toast({
        title: "Erro",
        description: "Falha ao salvar serviço",
        variant: "destructive",
      })
    }
  }

  const deleteServico = async (id: string) => {
    try {
      const { error } = await supabase.from("servicos").delete().eq("id", id).eq("user_id", user?.id)

      if (error) throw error

      await loadServicos()
      toast({
        title: "Serviço removido",
        description: "Serviço foi removido com sucesso",
      })
    } catch (error) {
      console.error("Erro ao deletar serviço:", error)
      toast({
        title: "Erro",
        description: "Falha ao remover serviço",
        variant: "destructive",
      })
    }
  }

  const toggleDestaque = async (id: string, currentDestaque: boolean) => {
    try {
      const { error } = await supabase
        .from("servicos")
        .update({
          destaque: !currentDestaque,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user?.id)

      if (error) throw error
      await loadServicos()
    } catch (error) {
      console.error("Erro ao atualizar destaque:", error)
      toast({
        title: "Erro",
        description: "Falha ao atualizar destaque",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (servico: Servico) => {
    setEditingServico(servico)
    setFormData({
      nome: servico.nome,
      descricao: servico.descricao || "",
      categoria: servico.categoria,
      valor_base: servico.valor_base.toString(),
      tempo_entrega: servico.tempo_entrega || "",
      funcionalidades: servico.funcionalidades.join("\n"),
      status: servico.status,
      destaque: servico.destaque,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      categoria: "Desenvolvimento Web",
      valor_base: "",
      tempo_entrega: "",
      funcionalidades: "",
      status: "ativo",
      destaque: false,
    })
  }

  const filteredServicos = servicos.filter((servico) => {
    const matchesSearch =
      servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servico.categoria.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategoria = categoriaFilter === "todas" || servico.categoria === categoriaFilter

    return matchesSearch && matchesCategoria
  })

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Serviços</h1>
          <p className="text-gray-400">Gerencie seu catálogo de serviços</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                setEditingServico(null)
                resetForm()
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center">
                <Package className="w-6 h-6 mr-2 text-orange-500" />
                {editingServico ? "Editar Serviço" : "Novo Serviço"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome" className="text-sm text-gray-300 mb-2 block">
                    Nome do Serviço *
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="bg-gray-800 border-gray-600 focus:border-orange-500"
                    placeholder="Site Institucional"
                  />
                </div>

                <div>
                  <Label htmlFor="categoria" className="text-sm text-gray-300 mb-2 block">
                    Categoria *
                  </Label>
                  <select
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:border-orange-500"
                  >
                    {categorias.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="descricao" className="text-sm text-gray-300 mb-2 block">
                  Descrição
                </Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="bg-gray-800 border-gray-600 focus:border-orange-500"
                  rows={3}
                  placeholder="Descrição detalhada do serviço..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valor_base" className="text-sm text-gray-300 mb-2 block">
                    Valor Base (R$) *
                  </Label>
                  <Input
                    id="valor_base"
                    type="number"
                    step="0.01"
                    value={formData.valor_base}
                    onChange={(e) => setFormData({ ...formData, valor_base: e.target.value })}
                    className="bg-gray-800 border-gray-600 focus:border-orange-500"
                    placeholder="2500.00"
                  />
                </div>

                <div>
                  <Label htmlFor="tempo_entrega" className="text-sm text-gray-300 mb-2 block">
                    Tempo de Entrega
                  </Label>
                  <Input
                    id="tempo_entrega"
                    value={formData.tempo_entrega}
                    onChange={(e) => setFormData({ ...formData, tempo_entrega: e.target.value })}
                    className="bg-gray-800 border-gray-600 focus:border-orange-500"
                    placeholder="2 semanas"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="funcionalidades" className="text-sm text-gray-300 mb-2 block">
                  Funcionalidades (uma por linha)
                </Label>
                <Textarea
                  id="funcionalidades"
                  value={formData.funcionalidades}
                  onChange={(e) => setFormData({ ...formData, funcionalidades: e.target.value })}
                  className="bg-gray-800 border-gray-600 focus:border-orange-500"
                  rows={4}
                  placeholder="Design responsivo&#10;SEO otimizado&#10;Painel administrativo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status" className="text-sm text-gray-300 mb-2 block">
                    Status
                  </Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:border-orange-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-6">
                  <input
                    type="checkbox"
                    id="destaque"
                    checked={formData.destaque}
                    onChange={(e) => setFormData({ ...formData, destaque: e.target.checked })}
                    className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                  />
                  <Label htmlFor="destaque" className="text-sm text-gray-300">
                    Serviço em destaque
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={saveServico} className="flex-1 bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />
                  {editingServico ? "Atualizar" : "Criar"}
                </Button>
                <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="border-gray-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600"
          />
        </div>

        <select
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-600 rounded-md text-white"
        >
          <option value="todas">Todas as categorias</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="text-sm text-gray-400 flex items-center">
          <Package className="w-4 h-4 mr-2" />
          {filteredServicos.length} serviço{filteredServicos.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Serviços Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServicos.map((servico) => (
          <Card
            key={servico.id}
            className="bg-gray-900 border-gray-700 hover:border-orange-500/50 transition-all duration-300 group card-hover cursor-pointer"
            onClick={() => router.push(`/servicos/${servico.id}`)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-white text-lg group-hover:text-orange-400 transition-colors">
                      {servico.nome}
                    </CardTitle>
                    {servico.destaque && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  </div>
                  <Badge className={`text-xs ${getCategoriaColor(servico.categoria)} border`}>
                    <Tag className="w-3 h-3 mr-1" />
                    {servico.categoria}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Eye className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {servico.descricao && <p className="text-gray-300 text-sm">{servico.descricao}</p>}

              <div className="flex items-center justify-between">
                <div className="flex items-center text-green-400 font-semibold">
                  <DollarSign className="w-4 h-4 mr-1" />
                  R$ {servico.valor_base.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                {servico.tempo_entrega && (
                  <div className="flex items-center text-gray-400 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {servico.tempo_entrega}
                  </div>
                )}
              </div>

              {servico.funcionalidades.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs mb-2">Funcionalidades:</p>
                  <div className="space-y-1">
                    {servico.funcionalidades.slice(0, 3).map((func, index) => (
                      <div key={index} className="text-gray-300 text-xs flex items-center">
                        <div className="w-1 h-1 bg-orange-500 rounded-full mr-2" />
                        {func}
                      </div>
                    ))}
                    {servico.funcionalidades.length > 3 && (
                      <div className="text-gray-500 text-xs">+{servico.funcionalidades.length - 3} mais...</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <Badge
                  className={`text-xs ${servico.status === "ativo"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                    } border`}
                >
                  {servico.status === "ativo" ? "Ativo" : "Inativo"}
                </Badge>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServicos.length === 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {searchTerm || categoriaFilter !== "todas" ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || categoriaFilter !== "todas"
                ? "Tente ajustar os filtros de busca"
                : "Comece criando seu catálogo de serviços"}
            </p>
            {!searchTerm && categoriaFilter === "todas" && (
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Serviço
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
