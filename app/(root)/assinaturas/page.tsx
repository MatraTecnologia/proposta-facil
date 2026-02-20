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
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/contexts/AuthContext"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Eye,
  PenTool,
  Palette,
  Type,
  Download,
  Save,
  Wand2,
  Loader2,
} from "lucide-react"

interface Assinatura {
  id: string
  user_id: string
  nome: string
  data_assinatura: {
    texto?: string
    html?: string
    imagemUrl?: string
    canvasData?: string
    estilo?: {
      fontFamily: string
      fontSize: string
      color: string
      backgroundColor: string
      padding: string
      borderRadius: string
    }
  }
  largura?: number
  altura?: number
  created_at: string
}

const fontFamilies = [
  "Arial, sans-serif",
  "Georgia, serif",
  "Times New Roman, serif",
  "Helvetica, sans-serif",
  "Verdana, sans-serif",
  "Courier New, monospace",
  "Impact, sans-serif",
  "Comic Sans MS, cursive",
]

const fontSizes = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"]

export default function AssinaturasPage() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFilter, setTipoFilter] = useState("todos")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAssinatura, setEditingAssinatura] = useState<Assinatura | null>(null)
  const [selectedAssinatura, setSelectedAssinatura] = useState<Assinatura | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estados para controlar os popups de cores
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome: "",
    tipo: "texto" as "texto" | "imagem" | "html",
    texto: "",
    html: "",
    imagemUrl: "",
    fontFamily: "Arial, sans-serif",
    fontSize: "16px",
    color: "#333333",
    backgroundColor: "transparent",
    padding: "10px",
    borderRadius: "0px",
  })

  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadAssinaturas()
    }
  }, [user])

  const loadAssinaturas = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("assinaturas")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setAssinaturas(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar assinaturas:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar assinaturas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveAssinatura = async () => {
    if (!formData.nome || !formData.tipo) {
      toast({
        title: "Erro",
        description: "Nome e tipo são obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (formData.tipo === "texto" && !formData.texto) {
      toast({
        title: "Erro",
        description: "Conteúdo de texto é obrigatório",
        variant: "destructive",
      })
      return
    }

    if (formData.tipo === "html" && !formData.html) {
      toast({
        title: "Erro",
        description: "Código HTML é obrigatório",
        variant: "destructive",
      })
      return
    }

    if (formData.tipo === "imagem" && !formData.imagemUrl) {
      toast({
        title: "Erro",
        description: "URL da imagem é obrigatória",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const dataAssinatura: any = {}

      if (formData.tipo === "texto") {
        dataAssinatura.texto = formData.texto
        dataAssinatura.estilo = {
          fontFamily: formData.fontFamily,
          fontSize: formData.fontSize,
          color: formData.color,
          backgroundColor: formData.backgroundColor,
          padding: formData.padding,
          borderRadius: formData.borderRadius,
        }
      } else if (formData.tipo === "html") {
        dataAssinatura.html = formData.html
      } else if (formData.tipo === "imagem") {
        dataAssinatura.imagemUrl = formData.imagemUrl
      }

      const assinaturaData = {
        user_id: user.id,
        nome: formData.nome,
        data_assinatura: dataAssinatura,
        largura: 400, // Default width for non-canvas signatures
        altura: 200, // Default height for non-canvas signatures
      }

      if (editingAssinatura) {
        // Atualizar assinatura existente
        const { error } = await supabase
          .from("assinaturas")
          .update(assinaturaData)
          .eq("id", editingAssinatura.id)
          .eq("user_id", user.id)

        if (error) throw error

        toast({
          title: "Sucesso!",
          description: "Assinatura atualizada",
        })
      } else {
        // Criar nova assinatura
        const { error } = await supabase.from("assinaturas").insert(assinaturaData)

        if (error) throw error

        toast({
          title: "Sucesso!",
          description: "Assinatura criada",
        })
      }

      setIsDialogOpen(false)
      setEditingAssinatura(null)
      resetForm()
      loadAssinaturas()
    } catch (error: any) {
      console.error("Erro ao salvar assinatura:", error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar assinatura",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const deleteAssinatura = async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("assinaturas").delete().eq("id", id).eq("user_id", user.id)

      if (error) throw error

      toast({
        title: "Assinatura removida",
        description: "Assinatura foi removida com sucesso",
      })

      loadAssinaturas()
    } catch (error: any) {
      console.error("Erro ao deletar assinatura:", error)
      toast({
        title: "Erro",
        description: "Falha ao remover assinatura",
        variant: "destructive",
      })
    }
  }

  const copyAssinatura = (assinatura: Assinatura) => {
    let conteudo = ""

    if (assinatura.data_assinatura.texto) {
      conteudo = assinatura.data_assinatura.texto
    } else if (assinatura.data_assinatura.html) {
      conteudo = assinatura.data_assinatura.html
    } else if (assinatura.data_assinatura.imagemUrl) {
      conteudo = assinatura.data_assinatura.imagemUrl
    } else if (assinatura.data_assinatura.canvasData) {
      conteudo = assinatura.data_assinatura.canvasData
    }

    navigator.clipboard.writeText(conteudo)
    toast({
      title: "Assinatura copiada",
      description: "Conteúdo da assinatura copiado para a área de transferência",
    })
  }

  const downloadAssinatura = (assinatura: Assinatura) => {
    if (assinatura.data_assinatura.canvasData) {
      const link = document.createElement("a")
      link.download = `${assinatura.nome}.png`
      link.href = assinatura.data_assinatura.canvasData
      link.click()
    }
  }

  const openEditDialog = (assinatura: Assinatura) => {
    setEditingAssinatura(assinatura)

    // Determinar o tipo baseado no conteúdo
    let tipo: "texto" | "html" | "imagem" = "texto"
    if (assinatura.data_assinatura.html) tipo = "html"
    else if (assinatura.data_assinatura.imagemUrl) tipo = "imagem"

    setFormData({
      nome: assinatura.nome,
      tipo,
      texto: assinatura.data_assinatura.texto || "",
      html: assinatura.data_assinatura.html || "",
      imagemUrl: assinatura.data_assinatura.imagemUrl || "",
      fontFamily: assinatura.data_assinatura.estilo?.fontFamily || "Arial, sans-serif",
      fontSize: assinatura.data_assinatura.estilo?.fontSize || "16px",
      color: assinatura.data_assinatura.estilo?.color || "#333333",
      backgroundColor: assinatura.data_assinatura.estilo?.backgroundColor || "transparent",
      padding: assinatura.data_assinatura.estilo?.padding || "10px",
      borderRadius: assinatura.data_assinatura.estilo?.borderRadius || "0px",
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "texto",
      texto: "",
      html: "",
      imagemUrl: "",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: "#333333",
      backgroundColor: "transparent",
      padding: "10px",
      borderRadius: "0px",
    })
  }

  const renderAssinatura = (assinatura: Assinatura) => {
    if (assinatura.data_assinatura.texto) {
      return (
        <div
          style={{
            fontFamily: assinatura.data_assinatura.estilo?.fontFamily,
            fontSize: assinatura.data_assinatura.estilo?.fontSize,
            color: assinatura.data_assinatura.estilo?.color,
            backgroundColor: assinatura.data_assinatura.estilo?.backgroundColor,
            padding: assinatura.data_assinatura.estilo?.padding,
            borderRadius: assinatura.data_assinatura.estilo?.borderRadius,
          }}
          className="whitespace-pre-wrap"
        >
          {assinatura.data_assinatura.texto}
        </div>
      )
    } else if (assinatura.data_assinatura.html) {
      return <div dangerouslySetInnerHTML={{ __html: assinatura.data_assinatura.html }} />
    } else if (assinatura.data_assinatura.imagemUrl) {
      return (
        <img
          src={assinatura.data_assinatura.imagemUrl || "/placeholder.svg"}
          alt={assinatura.nome}
          className="max-w-full h-auto"
        />
      )
    } else if (assinatura.data_assinatura.canvasData) {
      return (
        <img
          src={assinatura.data_assinatura.canvasData || "/placeholder.svg"}
          alt={assinatura.nome}
          className="max-w-full h-auto bg-white rounded"
        />
      )
    }
    return null
  }

  const getTipoFromAssinatura = (assinatura: Assinatura) => {
    if (assinatura.data_assinatura.canvasData) return "canvas"
    if (assinatura.data_assinatura.html) return "html"
    if (assinatura.data_assinatura.imagemUrl) return "imagem"
    return "texto"
  }

  const filteredAssinaturas = assinaturas.filter((assinatura) => {
    const matchesSearch = assinatura.nome.toLowerCase().includes(searchTerm.toLowerCase())

    const tipo = getTipoFromAssinatura(assinatura)
    const matchesTipo = tipoFilter === "todos" || tipo === tipoFilter

    return matchesSearch && matchesTipo
  })

  const getTipoColor = (tipo: string) => {
    const colors: { [key: string]: string } = {
      texto: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      html: "bg-green-500/20 text-green-400 border-green-500/30",
      imagem: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      canvas: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    }
    return colors[tipo] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }

  const getTipoIcon = (tipo: string) => {
    const icons: { [key: string]: any } = {
      texto: Type,
      html: PenTool,
      imagem: Eye,
      canvas: Wand2,
    }
    return icons[tipo] || Type
  }

  // Fechar popups ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest(".color-picker-container")) {
        setActiveColorPicker(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando assinaturas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Assinaturas</h1>
          <p className="text-gray-400">Crie e gerencie assinaturas para suas propostas</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-gray-600"
            onClick={() => (window.location.href = "/assinaturas/desenhar")}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Desenhar Assinatura
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => {
                  setEditingAssinatura(null)
                  resetForm()
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Assinatura
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-gray-700 max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white text-xl flex items-center">
                  <Plus className="w-6 h-6 mr-2 text-orange-500" />
                  {editingAssinatura ? "Editar Assinatura" : "Nova Assinatura"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Formulário */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-xl">
                    <Label className="text-lg font-medium text-white flex items-center mb-4">
                      <Type className="w-5 h-5 mr-2 text-blue-500" />
                      Informações Básicas
                    </Label>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nome" className="text-sm text-gray-300 mb-2 block">
                          Nome da Assinatura *
                        </Label>
                        <Input
                          id="nome"
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          className="bg-gray-800 border-gray-600 focus:border-orange-500"
                          placeholder="Ex: Assinatura Corporativa"
                        />
                      </div>

                      <div>
                        <Label htmlFor="tipo" className="text-sm text-gray-300 mb-2 block">
                          Tipo de Assinatura *
                        </Label>
                        <select
                          id="tipo"
                          value={formData.tipo}
                          onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="texto">📝 Texto Simples</option>
                          <option value="html">🎨 HTML Personalizado</option>
                          <option value="imagem">🖼️ Imagem</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo específico por tipo */}
                  {formData.tipo === "texto" && (
                    <>
                      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-xl">
                        <Label className="text-lg font-medium text-white flex items-center mb-4">
                          <Type className="w-5 h-5 mr-2 text-green-500" />
                          Conteúdo do Texto
                        </Label>

                        <div>
                          <Label htmlFor="texto" className="text-sm text-gray-300 mb-2 block">
                            Conteúdo do Texto *
                          </Label>
                          <Textarea
                            id="texto"
                            value={formData.texto}
                            onChange={(e) => setFormData({ ...formData, texto: e.target.value })}
                            className="bg-gray-800 border-gray-600 focus:border-green-500 min-h-[120px]"
                            rows={5}
                            placeholder="Digite o conteúdo da assinatura..."
                          />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-xl">
                        <Label className="text-lg font-medium text-white flex items-center mb-4">
                          <Palette className="w-5 h-5 mr-2 text-purple-500" />
                          Estilo do Texto
                        </Label>

                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm text-gray-300 mb-2 block">Fonte</Label>
                              <select
                                value={formData.fontFamily}
                                onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500"
                              >
                                {fontFamilies.map((font) => (
                                  <option key={font} value={font}>
                                    {font.split(",")[0]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-300 mb-2 block">Tamanho</Label>
                              <select
                                value={formData.fontSize}
                                onChange={(e) => setFormData({ ...formData, fontSize: e.target.value })}
                                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-purple-500"
                              >
                                {fontSizes.map((size) => (
                                  <option key={size} value={size}>
                                    {size}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="relative color-picker-container">
                              <Label className="text-sm text-gray-300 mb-3 block">Cor do Texto</Label>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveColorPicker(activeColorPicker === "text-color" ? null : "text-color")
                                  }
                                  className="w-10 h-10 rounded-lg border-2 border-gray-600 shadow-lg transition-all hover:scale-105 relative"
                                  style={{
                                    backgroundColor: formData.color === "transparent" ? "#ffffff" : formData.color,
                                    backgroundImage:
                                      formData.color === "transparent"
                                        ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                                        : "none",
                                    backgroundSize: formData.color === "transparent" ? "8px 8px" : "auto",
                                    backgroundPosition:
                                      formData.color === "transparent" ? "0 0, 0 4px, 4px -4px, -4px 0px" : "auto",
                                  }}
                                >
                                  {formData.color === "transparent" && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-6 h-0.5 bg-red-500 rotate-45"></div>
                                    </div>
                                  )}
                                </button>
                                <Input
                                  value={formData.color}
                                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                  className="bg-gray-800 border-gray-600 text-center font-mono flex-1"
                                  placeholder={formData.color === "transparent" ? "transparent" : "#000000"}
                                />
                              </div>
                              {activeColorPicker === "text-color" && (
                                <div className="absolute top-16 left-0 z-[9999] p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl">
                                  <input
                                    type="color"
                                    value={formData.color === "transparent" ? "#ffffff" : formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    style={{ width: "200px", height: "150px" }}
                                  />
                                  <div className="mt-3 flex gap-2">
                                    <button
                                      onClick={() => {
                                        setFormData({ ...formData, color: "transparent" })
                                        setActiveColorPicker(null)
                                      }}
                                      className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 flex-1"
                                    >
                                      Transparente
                                    </button>
                                    <button
                                      onClick={() => setActiveColorPicker(null)}
                                      className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 flex-1"
                                    >
                                      Fechar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="relative color-picker-container">
                              <Label className="text-sm text-gray-300 mb-3 block">Cor de Fundo</Label>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveColorPicker(
                                      activeColorPicker === "text-background" ? null : "text-background",
                                    )
                                  }
                                  className="w-10 h-10 rounded-lg border-2 border-gray-600 shadow-lg transition-all hover:scale-105 relative"
                                  style={{
                                    backgroundColor:
                                      formData.backgroundColor === "transparent" ? "#ffffff" : formData.backgroundColor,
                                    backgroundImage:
                                      formData.backgroundColor === "transparent"
                                        ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                                        : "none",
                                    backgroundSize: formData.backgroundColor === "transparent" ? "8px 8px" : "auto",
                                    backgroundPosition:
                                      formData.backgroundColor === "transparent"
                                        ? "0 0, 0 4px, 4px -4px, -4px 0px"
                                        : "auto",
                                  }}
                                >
                                  {formData.backgroundColor === "transparent" && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-6 h-0.5 bg-red-500 rotate-45"></div>
                                    </div>
                                  )}
                                </button>
                                <Input
                                  value={formData.backgroundColor}
                                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                  className="bg-gray-800 border-gray-600 text-center font-mono flex-1"
                                  placeholder={formData.backgroundColor === "transparent" ? "transparent" : "#000000"}
                                />
                              </div>
                              {activeColorPicker === "text-background" && (
                                <div className="absolute top-16 left-0 z-[9999] p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl">
                                  <input
                                    type="color"
                                    value={
                                      formData.backgroundColor === "transparent" ? "#ffffff" : formData.backgroundColor
                                    }
                                    onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                    style={{ width: "200px", height: "150px" }}
                                  />
                                  <div className="mt-3 flex gap-2">
                                    <button
                                      onClick={() => {
                                        setFormData({ ...formData, backgroundColor: "transparent" })
                                        setActiveColorPicker(null)
                                      }}
                                      className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 flex-1"
                                    >
                                      Transparente
                                    </button>
                                    <button
                                      onClick={() => setActiveColorPicker(null)}
                                      className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 flex-1"
                                    >
                                      Fechar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm text-gray-300 mb-2 block">Padding</Label>
                              <Input
                                value={formData.padding}
                                onChange={(e) => setFormData({ ...formData, padding: e.target.value })}
                                className="bg-gray-800 border-gray-600 text-sm"
                                placeholder="10px"
                              />
                            </div>
                            <div>
                              <Label className="text-sm text-gray-300 mb-2 block">Border Radius</Label>
                              <Input
                                value={formData.borderRadius}
                                onChange={(e) => setFormData({ ...formData, borderRadius: e.target.value })}
                                className="bg-gray-800 border-gray-600 text-sm"
                                placeholder="0px"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {formData.tipo === "html" && (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-xl">
                      <Label className="text-lg font-medium text-white flex items-center mb-4">
                        <PenTool className="w-5 h-5 mr-2 text-green-500" />
                        Código HTML
                      </Label>

                      <div>
                        <Label htmlFor="html" className="text-sm text-gray-300 mb-2 block">
                          Código HTML *
                        </Label>
                        <Textarea
                          id="html"
                          value={formData.html}
                          onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                          className="bg-gray-800 border-gray-600 font-mono text-sm focus:border-green-500 min-h-[200px]"
                          rows={10}
                          placeholder="<div>Seu código HTML aqui...</div>"
                        />
                      </div>
                    </div>
                  )}

                  {formData.tipo === "imagem" && (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-xl">
                      <Label className="text-lg font-medium text-white flex items-center mb-4">
                        <Eye className="w-5 h-5 mr-2 text-blue-500" />
                        Configuração da Imagem
                      </Label>

                      <div>
                        <Label htmlFor="imagemUrl" className="text-sm text-gray-300 mb-2 block">
                          URL da Imagem *
                        </Label>
                        <Input
                          id="imagemUrl"
                          value={formData.imagemUrl}
                          onChange={(e) => setFormData({ ...formData, imagemUrl: e.target.value })}
                          className="bg-gray-800 border-gray-600 focus:border-blue-500"
                          placeholder="https://exemplo.com/assinatura.png"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={saveAssinatura}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-medium py-3 rounded-lg shadow-lg transition-all duration-200"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingAssinatura ? "Atualizar Assinatura" : "Criar Assinatura"}
                      </>
                    )}
                  </Button>
                </div>

                {/* Preview */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl border border-gray-700 shadow-xl">
                    <Label className="text-lg font-medium text-white flex items-center mb-4">
                      <Eye className="w-5 h-5 mr-2 text-blue-500" />
                      Preview da Assinatura
                    </Label>

                    <div className="bg-white p-6 rounded-lg shadow-lg min-h-48 border-2 border-dashed border-gray-300">
                      {formData.tipo === "texto" && formData.texto && (
                        <div
                          style={{
                            fontFamily: formData.fontFamily,
                            fontSize: formData.fontSize,
                            color: formData.color,
                            backgroundColor:
                              formData.backgroundColor === "transparent" ? "transparent" : formData.backgroundColor,
                            padding: formData.padding,
                            borderRadius: formData.borderRadius,
                          }}
                          className="whitespace-pre-wrap"
                        >
                          {formData.texto}
                        </div>
                      )}

                      {formData.tipo === "html" && formData.html && (
                        <div dangerouslySetInnerHTML={{ __html: formData.html }} />
                      )}

                      {formData.tipo === "imagem" && formData.imagemUrl && (
                        <img
                          src={formData.imagemUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="max-w-full h-auto rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      )}

                      {formData.tipo === "texto" && !formData.texto && (
                        <div className="text-gray-500 text-center py-12 flex flex-col items-center">
                          <Eye className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-lg">Digite o texto da assinatura</p>
                          <p className="text-sm">O preview aparecerá aqui</p>
                        </div>
                      )}

                      {formData.tipo === "html" && !formData.html && (
                        <div className="text-gray-500 text-center py-12 flex flex-col items-center">
                          <Eye className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-lg">Digite o código HTML</p>
                          <p className="text-sm">O preview aparecerá aqui</p>
                        </div>
                      )}

                      {formData.tipo === "imagem" && !formData.imagemUrl && (
                        <div className="text-gray-500 text-center py-12 flex flex-col items-center">
                          <Eye className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-lg">Insira a URL da imagem</p>
                          <p className="text-sm">O preview aparecerá aqui</p>
                        </div>
                      )}

                      {!formData.tipo && (
                        <div className="text-gray-500 text-center py-12 flex flex-col items-center">
                          <Eye className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="text-lg">Selecione um tipo de assinatura</p>
                          <p className="text-sm">O preview aparecerá aqui</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dicas */}
                  <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-4 rounded-xl border border-blue-500/20">
                    <h4 className="text-white font-medium mb-2 flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      Dicas
                    </h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Use texto simples para assinaturas básicas</li>
                      <li>• HTML permite formatação avançada e links</li>
                      <li>• Imagens devem ter URLs públicas</li>
                      <li>• Use a ferramenta de desenho para assinaturas manuscritas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar assinaturas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600"
          />
        </div>

        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="p-2 bg-gray-800 border border-gray-600 rounded-md text-white"
        >
          <option value="todos">Todos os tipos</option>
          <option value="texto">Texto</option>
          <option value="html">HTML</option>
          <option value="imagem">Imagem</option>
          <option value="canvas">Desenhada</option>
        </select>

        <div className="text-sm text-gray-400 flex items-center">
          <PenTool className="w-4 h-4 mr-2" />
          {filteredAssinaturas.length} assinatura{filteredAssinaturas.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Assinaturas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssinaturas.map((assinatura) => {
          const tipo = getTipoFromAssinatura(assinatura)
          const TipoIcon = getTipoIcon(tipo)

          return (
            <Card
              key={assinatura.id}
              className="bg-gray-900 border-gray-700 hover:border-orange-500/50 transition-all duration-300 group"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-white text-lg group-hover:text-orange-400 transition-colors">
                        {assinatura.nome}
                      </CardTitle>
                    </div>
                    <Badge className={`text-xs ${getTipoColor(tipo)} border`}>
                      <TipoIcon className="w-3 h-3 mr-1" />
                      {tipo === "canvas" ? "Desenhada" : tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {tipo !== "canvas" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(assinatura)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAssinatura(assinatura)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {tipo === "canvas" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadAssinatura(assinatura)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAssinatura(assinatura.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview Miniatura */}
                <div className="bg-white p-3 rounded text-sm max-h-24 overflow-hidden">
                  {renderAssinatura(assinatura)}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-500">
                    {new Date(assinatura.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-xs h-7"
                      onClick={() => {
                        setSelectedAssinatura(assinatura)
                        setIsPreviewOpen(true)
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-xs h-7"
                      onClick={() => copyAssinatura(assinatura)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredAssinaturas.length === 0 && !loading && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="text-center py-12">
            <PenTool className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {searchTerm || tipoFilter !== "todos" ? "Nenhuma assinatura encontrada" : "Nenhuma assinatura criada"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || tipoFilter !== "todos"
                ? "Tente ajustar os filtros de busca"
                : "Crie assinaturas personalizadas para suas propostas"}
            </p>
            {!searchTerm && tipoFilter === "todos" && (
              <div className="flex gap-2 justify-center">
                <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Assinatura
                </Button>
                <Button
                  variant="outline"
                  className="border-gray-600"
                  onClick={() => (window.location.href = "/assinaturas/desenhar")}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Desenhar Assinatura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedAssinatura?.nome}</DialogTitle>
          </DialogHeader>
          {selectedAssinatura && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-lg">{renderAssinatura(selectedAssinatura)}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Tipo:</span>
                  <Badge className={`ml-2 ${getTipoColor(getTipoFromAssinatura(selectedAssinatura))}`}>
                    {getTipoFromAssinatura(selectedAssinatura) === "canvas"
                      ? "Desenhada"
                      : getTipoFromAssinatura(selectedAssinatura).charAt(0).toUpperCase() +
                      getTipoFromAssinatura(selectedAssinatura).slice(1)}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-400">Criado em:</span>
                  <span className="text-white ml-2">
                    {new Date(selectedAssinatura.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyAssinatura(selectedAssinatura)}
                  variant="outline"
                  className="border-gray-600"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Conteúdo
                </Button>
                {getTipoFromAssinatura(selectedAssinatura) === "canvas" && (
                  <Button
                    onClick={() => downloadAssinatura(selectedAssinatura)}
                    variant="outline"
                    className="border-gray-600"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar PNG
                  </Button>
                )}
                {getTipoFromAssinatura(selectedAssinatura) !== "canvas" && (
                  <Button
                    onClick={() => openEditDialog(selectedAssinatura)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
