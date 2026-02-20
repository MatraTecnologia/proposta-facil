"use client"

import React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Save,
  Type,
  ImageIcon,
  Table,
  Trash2,
  Copy,
  Settings,
  Plus,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Palette,
  Move,
  Maximize2,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { variaveisDisponiveis, categoriasVariaveis } from "@/lib/variaveis"

interface ElementoModelo {
  id: string
  tipo: "texto" | "variavel" | "imagem" | "tabela" | "linha" | "espacador"
  conteudo: string
  estilo: {
    fontSize: string
    fontWeight: string
    color: string
    backgroundColor: string
    textAlign: string
    padding: string
    margin: string
    borderRadius: string
    border: string
    width: string
    height: string
  }
  posicao: {
    x: number
    y: number
  }
}

interface ModeloTemplate {
  nome: string
  descricao: string
  categoria: string
  elementos: ElementoModelo[]
  configuracoes: {
    largura: string
    altura: string
    corFundo: string
    padding: string
    fontFamily: string
  }
}

const categorias = [
  "Desenvolvimento Web",
  "Design Gráfico",
  "Marketing Digital",
  "Consultoria",
  "E-commerce",
  "Mobile",
  "Geral",
]

const fontSizes = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"]
const fontWeights = ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]

export default function EditorModeloPage() {
  const [modelo, setModelo] = useState<ModeloTemplate>({
    nome: "",
    descricao: "",
    categoria: "",
    elementos: [],
    configuracoes: {
      largura: "800px",
      altura: "auto",
      corFundo: "#ffffff",
      padding: "40px",
      fontFamily: "Arial, sans-serif",
    },
  })

  const [elementoSelecionado, setElementoSelecionado] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [showToolbar, setShowToolbar] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [loading, setLoading] = useState(false)
  const [modeloId, setModeloId] = useState<string | null>(null)
  const [showPropriedades, setShowPropriedades] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    const editId = searchParams.get("id")
    if (editId) {
      setModeloId(editId)
      loadModelo(editId)
    }
  }, [searchParams])

  const loadModelo = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("modelos").select("*").eq("id", id).eq("user_id", user?.id).single()

      if (error) throw error

      if (data) {
        setModelo({
          nome: data.nome,
          descricao: data.descricao || "",
          categoria: data.conteudo?.categoria || "",
          elementos: data.conteudo?.template?.elementos || [],
          configuracoes: data.conteudo?.template?.configuracoes || {
            largura: "800px",
            altura: "auto",
            corFundo: "#ffffff",
            padding: "40px",
            fontFamily: "Arial, sans-serif",
          },
        })
      }
    } catch (error) {
      console.error("Erro ao carregar modelo:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar modelo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const adicionarElemento = (tipo: ElementoModelo["tipo"], conteudo = "") => {
    const novoElemento: ElementoModelo = {
      id: Date.now().toString(),
      tipo,
      conteudo: conteudo || (tipo === "texto" ? "Texto de exemplo" : tipo === "variavel" ? "{{variavel}}" : ""),
      estilo: {
        fontSize: "16px",
        fontWeight: "normal",
        color: "#333333",
        backgroundColor: "transparent",
        textAlign: "left",
        padding: "8px",
        margin: "4px",
        borderRadius: "0px",
        border: "none",
        width: "auto",
        height: "auto",
      },
      posicao: {
        x: 50,
        y: 50 + modelo.elementos.length * 60,
      },
    }

    setModelo((prev) => ({
      ...prev,
      elementos: [...prev.elementos, novoElemento],
    }))
    setElementoSelecionado(novoElemento.id)
    setShowPropriedades(true)
  }

  const atualizarElemento = (id: string, updates: Partial<ElementoModelo>) => {
    setModelo((prev) => ({
      ...prev,
      elementos: prev.elementos.map((el) => (el.id === id ? { ...el, ...updates } : el)),
    }))
  }

  const removerElemento = (id: string) => {
    setModelo((prev) => ({
      ...prev,
      elementos: prev.elementos.filter((el) => el.id !== id),
    }))
    if (elementoSelecionado === id) {
      setElementoSelecionado(null)
      setShowPropriedades(false)
    }
  }

  const duplicarElemento = (id: string) => {
    const elemento = modelo.elementos.find((el) => el.id === id)
    if (elemento) {
      const novoElemento = {
        ...elemento,
        id: Date.now().toString(),
        posicao: {
          x: elemento.posicao.x + 20,
          y: elemento.posicao.y + 20,
        },
      }
      setModelo((prev) => ({
        ...prev,
        elementos: [...prev.elementos, novoElemento],
      }))
    }
  }

  const handleMouseDown = (e: React.MouseEvent, elementoId: string) => {
    e.preventDefault()
    setElementoSelecionado(elementoId)
    setIsDragging(true)
    setShowPropriedades(true)

    const elemento = modelo.elementos.find((el) => el.id === elementoId)
    if (elemento) {
      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !elementoSelecionado || !canvasRef.current) return

      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - canvasRect.left - dragOffset.x
      const y = e.clientY - canvasRect.top - dragOffset.y

      atualizarElemento(elementoSelecionado, {
        posicao: { x: Math.max(0, x), y: Math.max(0, y) },
      })
    },
    [isDragging, elementoSelecionado, dragOffset],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const salvarModelo = async () => {
    if (!modelo.nome || !modelo.categoria) {
      toast({
        title: "Erro",
        description: "Nome e categoria são obrigatórios",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      const modeloData = {
        user_id: user?.id,
        nome: modelo.nome,
        descricao: modelo.descricao,
        conteudo: {
          cabecalho: "PROPOSTA COMERCIAL",
          introducao: "Modelo criado com editor visual",
          observacoes: "Observações padrão",
          rodape: "Agradecemos a oportunidade",
          categoria: modelo.categoria,
          cores: {
            primaria: "#FF6F00",
            secundaria: "#1E1E1E",
            texto: "#333333",
          },
          template: modelo,
        },
        is_default: false,
      }

      if (modeloId) {
        const { error } = await supabase.from("modelos").update(modeloData).eq("id", modeloId).eq("user_id", user?.id)
        if (error) throw error
        toast({
          title: "Sucesso!",
          description: "Modelo atualizado com sucesso",
        })
      } else {
        const { error } = await supabase.from("modelos").insert([modeloData])
        if (error) throw error
        toast({
          title: "Sucesso!",
          description: "Modelo criado com sucesso",
        })
      }

      router.push("/modelos")
    } catch (error) {
      console.error("Erro ao salvar modelo:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar modelo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const renderElemento = (elemento: ElementoModelo) => {
    const isSelected = elementoSelecionado === elemento.id

    let conteudoRenderizado = elemento.conteudo
    variaveisDisponiveis.forEach((variavel) => {
      conteudoRenderizado = conteudoRenderizado.replace(variavel.valor, `[${variavel.label}]`)
    })

    const estiloElemento = {
      position: "absolute" as const,
      left: elemento.posicao.x,
      top: elemento.posicao.y,
      fontSize: elemento.estilo.fontSize,
      fontWeight: elemento.estilo.fontWeight,
      color: elemento.estilo.color,
      backgroundColor: elemento.estilo.backgroundColor,
      textAlign: elemento.estilo.textAlign as any,
      padding: elemento.estilo.padding,
      margin: elemento.estilo.margin,
      borderRadius: elemento.estilo.borderRadius,
      border: isSelected ? "2px solid #FF6F00" : elemento.estilo.border,
      width: elemento.estilo.width === "auto" ? "auto" : elemento.estilo.width,
      height: elemento.estilo.height === "auto" ? "auto" : elemento.estilo.height,
      cursor: "move",
      userSelect: "none" as const,
      minWidth: "50px",
      minHeight: "20px",
    }

    return (
      <div
        key={elemento.id}
        style={estiloElemento}
        onMouseDown={(e) => handleMouseDown(e, elemento.id)}
        className={`${isSelected ? "ring-2 ring-orange-500" : ""} hover:ring-1 hover:ring-orange-300 transition-all`}
      >
        {elemento.tipo === "tabela" ? (
          <table className="border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Serviço</th>
                <th className="border border-gray-300 p-2">Quantidade</th>
                <th className="border border-gray-300 p-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2">[Serviço 1]</td>
                <td className="border border-gray-300 p-2">1</td>
                <td className="border border-gray-300 p-2">R$ 1.000,00</td>
              </tr>
            </tbody>
          </table>
        ) : elemento.tipo === "linha" ? (
          <hr style={{ width: "200px", borderColor: elemento.estilo.color }} />
        ) : elemento.tipo === "espacador" ? (
          <div
            style={{
              height: elemento.estilo.height || "20px",
              width: "100px",
              backgroundColor: "#f0f0f0",
              border: "1px dashed #ccc",
            }}
          />
        ) : elemento.tipo === "imagem" ? (
          <div
            className="bg-gray-200 border-2 border-dashed border-gray-400 p-4 text-center"
            style={{ 
              width: elemento.estilo.width === "auto" ? "150px" : elemento.estilo.width,
              height: elemento.estilo.height === "auto" ? "100px" : elemento.estilo.height,
              minWidth: "50px",
              minHeight: "50px"
            }}
          >
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-500" />
            <span className="text-gray-500 text-sm">Imagem</span>
          </div>
        ) : (
          <div>{conteudoRenderizado}</div>
        )}

        {isSelected && (
          <div className="absolute -top-8 -right-8 flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 bg-white border-orange-500"
              onClick={(e) => {
                e.stopPropagation()
                duplicarElemento(elemento.id)
              }}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 bg-white border-red-500 text-red-500"
              onClick={(e) => {
                e.stopPropagation()
                removerElemento(elemento.id)
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const elementoAtual = modelo.elementos.find((el) => el.id === elementoSelecionado)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/modelos">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-white">{modeloId ? "Editar Modelo" : "Novo Modelo Visual"}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowToolbar(!showToolbar)}
              variant="outline"
              size="sm"
              className="border-gray-600"
            >
              {showToolbar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button onClick={salvarModelo} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Salvando..." : modeloId ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {showToolbar && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Informações básicas */}
            <div className="flex items-center gap-2">
              <Input
                value={modelo.nome}
                onChange={(e) => setModelo((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome do modelo"
                className="bg-gray-700 border-gray-600 w-48"
              />
              <Select
                value={modelo.categoria}
                onValueChange={(value) => setModelo((prev) => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-gray-300">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-gray-600" />

            {/* Elementos */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => adicionarElemento("texto")}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                <Type className="w-4 h-4 mr-1" />
                Texto
              </Button>
              <Button
                onClick={() => adicionarElemento("imagem")}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Imagem
              </Button>
              <Button
                onClick={() => adicionarElemento("tabela")}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                <Table className="w-4 h-4 mr-1" />
                Tabela
              </Button>
              <Button
                onClick={() => adicionarElemento("linha")}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                <hr className="w-4 border-gray-400" />
                Linha
              </Button>
            </div>

            <div className="h-6 w-px bg-gray-600" />

            {/* Variáveis */}
            <div className="flex items-center gap-2">
              <Select onValueChange={(value) => adicionarElemento("variavel", value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 w-48">
                  <SelectValue placeholder="Adicionar variável" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600 max-h-60">
                  {categoriasVariaveis.map((categoria) => (
                    <div key={categoria.id}>
                      <div className="px-2 py-1 text-xs font-medium text-gray-400 bg-gray-700">{categoria.label}</div>
                      {variaveisDisponiveis
                        .filter((v) => v.categoria === categoria.id)
                        .map((variavel) => (
                          <SelectItem key={variavel.id} value={variavel.valor} className="text-gray-300">
                            {variavel.label}
                          </SelectItem>
                        ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-6 w-px bg-gray-600" />

            {/* Controles */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowGrid(!showGrid)}
                variant={showGrid ? "default" : "outline"}
                size="sm"
                className="border-gray-600"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setZoom(Math.max(50, zoom - 25))}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-gray-400 text-sm w-12 text-center">{zoom}%</span>
              <Button
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                variant="outline"
                size="sm"
                className="border-gray-600"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              {elementoSelecionado && (
                <Button
                  onClick={() => setShowPropriedades(!showPropriedades)}
                  variant={showPropriedades ? "default" : "outline"}
                  size="sm"
                  className="border-gray-600"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex">
        {/* Canvas */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="flex justify-center">
            <div
              ref={canvasRef}
              className="relative bg-white shadow-2xl"
              style={{
                width: modelo.configuracoes.largura,
                minHeight: "600px",
                backgroundColor: modelo.configuracoes.corFundo,
                padding: modelo.configuracoes.padding,
                fontFamily: modelo.configuracoes.fontFamily,
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                backgroundImage: showGrid ? "radial-gradient(circle, #e5e5e5 1px, transparent 1px)" : "none",
                backgroundSize: showGrid ? "20px 20px" : "auto",
              }}
              onClick={() => {
                setElementoSelecionado(null)
                setShowPropriedades(false)
              }}
            >
              {modelo.elementos.map(renderElemento)}

              {modelo.elementos.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Clique nos botões da barra de ferramentas para adicionar elementos</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Painel de Propriedades */}
        {showPropriedades && elementoAtual && (
          <div className="w-80 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  {elementoAtual.tipo.charAt(0).toUpperCase() + elementoAtual.tipo.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Conteúdo */}
                {(elementoAtual.tipo === "texto" || elementoAtual.tipo === "variavel") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Conteúdo</Label>
                    <Textarea
                      value={elementoAtual.conteudo}
                      onChange={(e) => atualizarElemento(elementoAtual.id, { conteudo: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-sm"
                      rows={3}
                    />
                  </div>
                )}

                {/* Formatação */}
                <div className="space-y-3">
                  <Label className="text-xs">Formatação</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={elementoAtual.estilo.fontSize}
                      onValueChange={(value) =>
                        atualizarElemento(elementoAtual.id, {
                          estilo: { ...elementoAtual.estilo, fontSize: value },
                        })
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {fontSizes.map((size) => (
                          <SelectItem key={size} value={size} className="text-gray-300">
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={elementoAtual.estilo.fontWeight}
                      onValueChange={(value) =>
                        atualizarElemento(elementoAtual.id, {
                          estilo: { ...elementoAtual.estilo, fontWeight: value },
                        })
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        {fontWeights.map((weight) => (
                          <SelectItem key={weight} value={weight} className="text-gray-300">
                            {weight}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={elementoAtual.estilo.textAlign === "left" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() =>
                        atualizarElemento(elementoAtual.id, {
                          estilo: { ...elementoAtual.estilo, textAlign: "left" },
                        })
                      }
                    >
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={elementoAtual.estilo.textAlign === "center" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() =>
                        atualizarElemento(elementoAtual.id, {
                          estilo: { ...elementoAtual.estilo, textAlign: "center" },
                        })
                      }
                    >
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={elementoAtual.estilo.textAlign === "right" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() =>
                        atualizarElemento(elementoAtual.id, {
                          estilo: { ...elementoAtual.estilo, textAlign: "right" },
                        })
                      }
                    >
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Cores */}
                <div className="space-y-3">
                  <Label className="text-xs">Cores</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Texto</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={elementoAtual.estilo.color}
                          onChange={(e) =>
                            atualizarElemento(elementoAtual.id, {
                              estilo: { ...elementoAtual.estilo, color: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded border border-gray-600"
                        />
                        <Input
                          value={elementoAtual.estilo.color}
                          onChange={(e) =>
                            atualizarElemento(elementoAtual.id, {
                              estilo: { ...elementoAtual.estilo, color: e.target.value },
                            })
                          }
                          className="bg-gray-700 border-gray-600 h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fundo</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={
                            elementoAtual.estilo.backgroundColor === "transparent"
                              ? "#ffffff"
                              : elementoAtual.estilo.backgroundColor
                          }
                          onChange={(e) =>
                            atualizarElemento(elementoAtual.id, {
                              estilo: { ...elementoAtual.estilo, backgroundColor: e.target.value },
                            })
                          }
                          className="w-8 h-8 rounded border border-gray-600"
                        />
                        <Input
                          value={elementoAtual.estilo.backgroundColor}
                          onChange={(e) =>
                            atualizarElemento(elementoAtual.id, {
                              estilo: { ...elementoAtual.estilo, backgroundColor: e.target.value },
                            })
                          }
                          className="bg-gray-700 border-gray-600 h-8 text-xs"
                          placeholder="transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Posição */}
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    Posição
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">X</Label>
                      <Input
                        type="number"
                        value={elementoAtual.posicao.x}
                        onChange={(e) =>
                          atualizarElemento(elementoAtual.id, {
                            posicao: { ...elementoAtual.posicao, x: Number(e.target.value) },
                          })
                        }
                        className="bg-gray-700 border-gray-600 h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Y</Label>
                      <Input
                        type="number"
                        value={elementoAtual.posicao.y}
                        onChange={(e) =>
                          atualizarElemento(elementoAtual.id, {
                            posicao: { ...elementoAtual.posicao, y: Number(e.target.value) },
                          })
                        }
                        className="bg-gray-700 border-gray-600 h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Dimensões */}
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-1">
                    <Maximize2 className="w-3 h-3" />
                    Dimensões
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Largura</Label>
                      <Input
                        value={elementoAtual.estilo.width}
                        onChange={(e) =>
                          atualizarElemento(elementoAtual.id, {
                            estilo: { ...elementoAtual.estilo, width: e.target.value },
                          })
                        }
                        className="bg-gray-700 border-gray-600 h-8 text-xs"
                        placeholder="auto"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Altura</Label>
                      <Input
                        value={elementoAtual.estilo.height}
                        onChange={(e) =>
                          atualizarElemento(elementoAtual.id, {
                            estilo: { ...elementoAtual.estilo, height: e.target.value },
                          })
                        }
                        className="bg-gray-700 border-gray-600 h-8 text-xs"
                        placeholder="auto"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
