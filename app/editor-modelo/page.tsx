"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { HexColorPicker } from "react-colorful"
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
  Edit3,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Search,
  Layers,
  Variable,
  MousePointer,
  Monitor,
  Pipette,
  Maximize2,
  Library,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { variaveisDisponiveis, categoriasVariaveis } from "@/lib/variaveis"
import { processarVariaveis, type DadosProposta } from "@/lib/processarVariaveis"

interface CelulaTabela {
  id: string
  conteudo: string
  estilo: {
    backgroundColor: string
    color: string
    fontWeight: string
    textAlign: string
  }
}

interface LinhaTabela {
  id: string
  celulas: CelulaTabela[]
}

interface TabelaData {
  linhas: LinhaTabela[]
  estilo: {
    borderColor: string
    borderWidth: string
  }
}

interface ElementoModelo {
  id: string
  tipo: "texto" | "variavel" | "imagem" | "tabela" | "linha" | "espacador"
  conteudo: string | TabelaData
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
  bloqueado?: boolean
}

interface PaginaModelo {
  id: string
  nome: string
  elementos: ElementoModelo[]
  configuracoes: {
    largura: string
    altura: string
    corFundo: string
    imagemFundo?: string
    padding: string
    fontFamily: string
  }
}

interface ModeloTemplate {
  nome: string
  descricao: string
  categoria: string
  paginas: PaginaModelo[]
  configuracoes: {
    largura: string
    altura: string
    corFundo: string
    imagemFundo?: string
    padding: string
    fontFamily: string
  }
}

interface ContextMenuPosition {
  x: number
  y: number
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

// Definir tamanho padrão A4 em px (96dpi): 794 x 1123
const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123

// Componente personalizado para seletor de cor
const ColorPicker = ({
  color,
  onChange,
  disabled = false,
}: {
  color: string
  onChange: (color: string) => void
  disabled?: boolean
}) => {
  return (
    <div className="space-y-3">
      <div className="w-full">
        <HexColorPicker color={color} onChange={onChange} style={{ width: "100%", height: "200px" }} />
      </div>
      <div className="space-y-2">
        <Input
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-700 border-gray-600 text-center font-mono"
          placeholder="#000000"
          disabled={disabled}
        />
        <div className="grid grid-cols-6 gap-1">
          {/* Cores predefinidas */}
          {[
            "#000000",
            "#ffffff",
            "#ff0000",
            "#00ff00",
            "#0000ff",
            "#ffff00",
            "#ff00ff",
            "#00ffff",
            "#808080",
            "#800000",
            "#008000",
            "#000080",
          ].map((presetColor) => (
            <button
              key={presetColor}
              className="w-8 h-8 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors"
              style={{ backgroundColor: presetColor }}
              onClick={() => onChange(presetColor)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Função para validar se é base64
const isBase64Image = (str: string): boolean => {
  return str.startsWith("data:image/")
}

// Função para otimizar imagem base64 (reduzir qualidade se necessário)
const optimizeBase64Image = (base64: string, maxWidth = 800, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    if (!isBase64Image(base64)) {
      resolve(base64)
      return
    }

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      // Calcular novas dimensões mantendo proporção
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      // Desenhar imagem otimizada
      ctx?.drawImage(img, 0, 0, width, height)

      // Converter para base64 com qualidade reduzida
      const optimizedBase64 = canvas.toDataURL("image/jpeg", quality)
      resolve(optimizedBase64)
    }

    img.onerror = () => resolve(base64) // Fallback para original
    img.src = base64
  })
}

export default function EditorModeloPage() {
  const [modelo, setModelo] = useState<ModeloTemplate>({
    nome: "",
    descricao: "",
    categoria: "",
    paginas: [{
      id: "pagina_1",
      nome: "Página 1",
      elementos: [],
      configuracoes: {
        largura: "800px",
        altura: "auto",
        corFundo: "#ffffff",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      },
    }],
    configuracoes: {
      largura: "800px",
      altura: "auto",
      corFundo: "#ffffff",
      padding: "40px",
      fontFamily: "Arial, sans-serif",
    },
  })

  const [paginaAtual, setPaginaAtual] = useState<string>("pagina_1")
  const [elementoSelecionado, setElementoSelecionado] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [showToolbar, setShowToolbar] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [loading, setLoading] = useState(false)
  const [modeloId, setModeloId] = useState<string | null>(null)
  const [modeloCarregado, setModeloCarregado] = useState(false)

  const [elementoHover, setElementoHover] = useState<string | null>(null)
  const [editandoTexto, setEditandoTexto] = useState<string | null>(null)
  const [textoTemp, setTextoTemp] = useState("")

  // Edição de tabela
  const [editandoTabela, setEditandoTabela] = useState<{ elementoId: string; celulaId: string } | null>(null)

  // Modal de variáveis
  const [showVariaveisModal, setShowVariaveisModal] = useState(false)
  const [searchVariaveis, setSearchVariaveis] = useState("")

  // Menu de contexto
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 })
  const [contextMenuElementId, setContextMenuElementId] = useState<string | null>(null)

  // Sidebar
  const [sidebarTab, setSidebarTab] = useState<"propriedades" | "camadas" | "paginas">("camadas")

  // Modal de imagens
  const [showImageModal, setShowImageModal] = useState(false)
  const [imagens, setImagens] = useState<any[]>([])
  const [loadingImagens, setLoadingImagens] = useState(false)

  // Modal de atalhos
  const [showAtalhosModal, setShowAtalhosModal] = useState(false)
  const [atalhosJaVistos, setAtalhosJaVistos] = useState(false)

  // Modal de renomear página
  const [showRenomearPaginaModal, setShowRenomearPaginaModal] = useState(false)
  const [paginaParaRenomear, setPaginaParaRenomear] = useState<string>("")
  const [novoNomePagina, setNovoNomePagina] = useState("")

  // Estado para clientes de teste e cliente selecionado
  const [clientesTeste, setClientesTeste] = useState<any[]>([])
  const [clienteTesteId, setClienteTesteId] = useState<string>("")
  const [loadingClientesTeste, setLoadingClientesTeste] = useState(false)

  // Estado para serviços de teste e serviço selecionado
  const [servicosTeste, setServicosTeste] = useState<any[]>([])
  const [servicoTesteId, setServicoTesteId] = useState<string>("")
  const [loadingServicosTeste, setLoadingServicosTeste] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()

  const salvarModelo = useCallback(async () => {
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

      // Otimizar imagens base64 antes de salvar
      const elementosOtimizados = await Promise.all(
        modelo.paginas.flatMap((pagina) => pagina.elementos).map(async (elemento) => {
          if (elemento.tipo === "imagem" && typeof elemento.conteudo === "string" && isBase64Image(elemento.conteudo)) {
            const imagemOtimizada = await optimizeBase64Image(elemento.conteudo)
            return { ...elemento, conteudo: imagemOtimizada }
          }
          return elemento
        }),
      )

      // Reconstruir as páginas com os elementos otimizados
      const paginasOtimizadas = modelo.paginas.map((pagina) => ({
        ...pagina,
        elementos: elementosOtimizados.filter((elemento) => 
          pagina.elementos.some((el) => el.id === elemento.id)
        ),
      }))

      const modeloOtimizado = { ...modelo, paginas: paginasOtimizadas }

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
          template: modeloOtimizado,
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
  }, [modelo, modeloId, user, toast, router])

  const adicionarPagina = useCallback(() => {
    const novaPaginaId = `pagina_${Date.now()}`
    const novaPagina: PaginaModelo = {
      id: novaPaginaId,
      nome: `Página ${modelo.paginas.length + 1}`,
      elementos: [],
      configuracoes: {
        largura: "800px",
        altura: "auto",
        corFundo: "#ffffff",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      },
    }

    setModelo((prev) => ({
      ...prev,
      paginas: [...prev.paginas, novaPagina],
    }))
    setPaginaAtual(novaPaginaId)
    setElementoSelecionado(null)
  }, [modelo.paginas.length])

  const removerPagina = useCallback((paginaId: string) => {
    if (modelo.paginas.length <= 1) {
      toast({
        title: "Erro",
        description: "Não é possível remover a última página",
        variant: "destructive",
      })
      return
    }

    setModelo((prev) => ({
      ...prev,
      paginas: prev.paginas.filter((pagina) => pagina.id !== paginaId),
    }))

    // Se a página removida era a atual, selecionar a primeira página disponível
    if (paginaAtual === paginaId) {
      const proximaPagina = modelo.paginas.find((pagina) => pagina.id !== paginaId)
      if (proximaPagina) {
        setPaginaAtual(proximaPagina.id)
      }
    }
    setElementoSelecionado(null)
  }, [modelo.paginas, paginaAtual, toast])

  const renomearPagina = useCallback((paginaId: string, novoNome: string) => {
    setModelo((prev) => ({
      ...prev,
      paginas: prev.paginas.map((pagina) =>
        pagina.id === paginaId ? { ...pagina, nome: novoNome } : pagina
      ),
    }))
  }, [])

  const paginaAtualData = useMemo(() => {
    return modelo.paginas.find((pagina) => pagina.id === paginaAtual)
  }, [modelo.paginas, paginaAtual])

  const removerElemento = useCallback(
    (id: string) => {
      setModelo((prev) => ({
        ...prev,
        paginas: prev.paginas.map((pagina) => ({
          ...pagina,
          elementos: pagina.elementos.filter((el) => el.id !== id),
        })),
      }))
      if (elementoSelecionado === id) {
        setElementoSelecionado(null)
      }
    },
    [elementoSelecionado],
  )

  const duplicarElemento = useCallback(
    (id: string) => {
      const elemento = paginaAtualData?.elementos.find((el) => el.id === id)
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
          paginas: prev.paginas.map((pagina) =>
            pagina.id === paginaAtual
              ? { ...pagina, elementos: [...pagina.elementos, novoElemento] }
              : pagina
          ),
        }))
        setElementoSelecionado(novoElemento.id)
      }
    },
    [paginaAtualData, paginaAtual],
  )

  const atualizarElemento = useCallback((id: string, updates: Partial<ElementoModelo>) => {
    setModelo((prev) => ({
      ...prev,
      paginas: prev.paginas.map((pagina) =>
        pagina.id === paginaAtual
          ? {
              ...pagina,
              elementos: pagina.elementos.map((el) => (el.id === id ? { ...el, ...updates } : el)),
            }
          : pagina
      ),
    }))
  }, [paginaAtual])

  // Carregar modelo quando user estiver disponível e editid estiver presente
  useEffect(() => {
    const editId = searchParams.get("editid")

    if (editId && user && !modeloCarregado) {
      setModeloId(editId)
      loadModelo(editId)
    } else if (!editId) {
      setModeloCarregado(true)
    }
  }, [searchParams, user, modeloCarregado])

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node) && showContextMenu) {
        setShowContextMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showContextMenu])

  // Mudar para aba de propriedades quando selecionar elemento
  useEffect(() => {
    if (elementoSelecionado) {
      setSidebarTab("propriedades")
    }
  }, [elementoSelecionado])

  // Mostrar atalhos na primeira vez
  useEffect(() => {
    const jaViu = localStorage.getItem('atalhos-editor-vistos')
    if (!jaViu && modeloCarregado) {
      setShowAtalhosModal(true)
      setAtalhosJaVistos(false)
    } else {
      setAtalhosJaVistos(true)
    }
  }, [modeloCarregado])

  const fecharAtalhosModal = () => {
    setShowAtalhosModal(false)
    if (!atalhosJaVistos) {
      localStorage.setItem('atalhos-editor-vistos', 'true')
      setAtalhosJaVistos(true)
    }
  }

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S: Salvar
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        salvarModelo()
        return
      }

      // Escape: Deselecionar
      if (e.key === 'Escape') {
        setElementoSelecionado(null)
        setEditandoTexto(null)
        setEditandoTabela(null)
        setShowContextMenu(false)
        return
      }

      // Delete: Remover elemento selecionado
      if (e.key === 'Delete' && elementoSelecionado && !editandoTexto && !editandoTabela) {
        removerElemento(elementoSelecionado)
        return
      }

      // Ctrl+D: Duplicar elemento selecionado
      if (e.ctrlKey && e.key === 'd' && elementoSelecionado) {
        e.preventDefault()
        duplicarElemento(elementoSelecionado)
        return
      }

      // Ctrl+G: Toggle grid
      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault()
        setShowGrid(!showGrid)
        return
      }

      // Ctrl+1,2,3: Zoom
      if (e.ctrlKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault()
        const zooms = { '1': 75, '2': 100, '3': 125 }
        setZoom(zooms[e.key as keyof typeof zooms])
        return
      }

      // F1: Mostrar atalhos
      if (e.key === 'F1') {
        e.preventDefault()
        setShowAtalhosModal(true)
        return
      }

      // Setas: Mover elemento selecionado
      if (elementoSelecionado && !editandoTexto && !editandoTabela && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const elemento = modelo.paginas.flatMap((pagina) => pagina.elementos).find(el => el.id === elementoSelecionado)
        if (elemento && !elemento.bloqueado) {
          const step = e.shiftKey ? 10 : 1
          let newX = elemento.posicao.x
          let newY = elemento.posicao.y

          switch (e.key) {
            case 'ArrowLeft': newX -= step; break
            case 'ArrowRight': newX += step; break
            case 'ArrowUp': newY -= step; break
            case 'ArrowDown': newY += step; break
          }

          atualizarElemento(elementoSelecionado, {
            posicao: { x: Math.max(0, newX), y: Math.max(0, newY) }
          })
        }
        return
      }

      // Tab: Navegar entre elementos
      if (e.key === 'Tab' && !editandoTexto && !editandoTabela) {
        e.preventDefault()
        const currentIndex = elementoSelecionado ? modelo.paginas.flatMap((pagina) => pagina.elementos).findIndex(el => el.id === elementoSelecionado) : -1
        const nextIndex = e.shiftKey
          ? (currentIndex <= 0 ? modelo.paginas.length - 1 : currentIndex - 1)
          : (currentIndex >= modelo.paginas.length - 1 ? 0 : currentIndex + 1)

        if (modelo.paginas[nextIndex]) {
          setElementoSelecionado(modelo.paginas[nextIndex].elementos[0].id)
        }
        return
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [elementoSelecionado, editandoTexto, editandoTabela, showGrid, modelo.paginas, salvarModelo, removerElemento, duplicarElemento, atualizarElemento])

  const loadModelo = async (id: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("modelos").select("*").eq("id", id).eq("user_id", user?.id).single()

      if (error) throw error

      if (data) {
        const templateData = data.conteudo?.template || {}
        
        // Verificar se o modelo tem a nova estrutura de páginas ou a antiga
        if (templateData.paginas && Array.isArray(templateData.paginas)) {
          // Nova estrutura com páginas
          setModelo({
            nome: data.nome || "",
            descricao: data.descricao || "",
            categoria: data.conteudo?.categoria || templateData.categoria || "",
            paginas: templateData.paginas || [{
              id: "pagina_1",
              nome: "Página 1",
              elementos: [],
              configuracoes: {
                largura: "800px",
                altura: "auto",
                corFundo: "#ffffff",
                padding: "40px",
                fontFamily: "Arial, sans-serif",
              },
            }],
            configuracoes: templateData.configuracoes || {
              largura: "800px",
              altura: "auto",
              corFundo: "#ffffff",
              padding: "40px",
              fontFamily: "Arial, sans-serif",
            },
          })
          setPaginaAtual(templateData.paginas[0]?.id || "pagina_1")
        } else {
          // Estrutura antiga - migrar para nova estrutura
          const elementosAntigos = templateData.elementos || []
          const novaPagina: PaginaModelo = {
            id: "pagina_1",
            nome: "Página 1",
            elementos: elementosAntigos,
            configuracoes: templateData.configuracoes || {
              largura: "800px",
              altura: "auto",
              corFundo: "#ffffff",
              padding: "40px",
              fontFamily: "Arial, sans-serif",
            },
          }
          
          setModelo({
            nome: data.nome || "",
            descricao: data.descricao || "",
            categoria: data.conteudo?.categoria || templateData.categoria || "",
            paginas: [novaPagina],
            configuracoes: templateData.configuracoes || {
              largura: "800px",
              altura: "auto",
              corFundo: "#ffffff",
              padding: "40px",
              fontFamily: "Arial, sans-serif",
            },
          })
          setPaginaAtual("pagina_1")
        }
        
        setModeloId(id)
        setModeloCarregado(true)
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

  const criarTabelaPadrao = (): TabelaData => ({
    linhas: [
      {
        id: "header",
        celulas: [
          {
            id: "h1",
            conteudo: "Serviço",
            estilo: { backgroundColor: "#f3f4f6", color: "#1f2937", fontWeight: "bold", textAlign: "center" },
          },
          {
            id: "h2",
            conteudo: "Quantidade",
            estilo: { backgroundColor: "#f3f4f6", color: "#1f2937", fontWeight: "bold", textAlign: "center" },
          },
          {
            id: "h3",
            conteudo: "Valor",
            estilo: { backgroundColor: "#f3f4f6", color: "#1f2937", fontWeight: "bold", textAlign: "center" },
          },
        ],
      },
      {
        id: "row1",
        celulas: [
          {
            id: "r1c1",
            conteudo: "Desenvolvimento Web",
            estilo: { backgroundColor: "#ffffff", color: "#374151", fontWeight: "normal", textAlign: "left" },
          },
          {
            id: "r1c2",
            conteudo: "1",
            estilo: { backgroundColor: "#ffffff", color: "#374151", fontWeight: "normal", textAlign: "center" },
          },
          {
            id: "r1c3",
            conteudo: "R$ 2.500,00",
            estilo: { backgroundColor: "#ffffff", color: "#374151", fontWeight: "normal", textAlign: "right" },
          },
        ],
      },
    ],
    estilo: {
      borderColor: "#d1d5db",
      borderWidth: "1px",
    },
  })

  const adicionarElemento = useCallback(
    (tipo: ElementoModelo["tipo"], conteudo = "") => {
      const novoElemento: ElementoModelo = {
        id: Date.now().toString(),
        tipo,
        conteudo:
          tipo === "tabela"
            ? criarTabelaPadrao()
            : conteudo || (tipo === "texto" ? "Texto de exemplo" : tipo === "variavel" ? "{{variavel}}" : ""),
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
          y: 50 + (paginaAtualData?.elementos.length || 0) * 60,
        },
        bloqueado: false,
      }

      setModelo((prev) => ({
        ...prev,
        paginas: prev.paginas.map((pagina) =>
          pagina.id === paginaAtual
            ? { ...pagina, elementos: [...pagina.elementos, novoElemento] }
            : pagina
        ),
      }))
      setElementoSelecionado(novoElemento.id)
    },
    [paginaAtual, paginaAtualData?.elementos.length],
  )

  const adicionarVariavel = useCallback(
    (variavel: string) => {
      adicionarElemento("variavel", variavel)
      setShowVariaveisModal(false)
    },
    [adicionarElemento],
  )

  const atualizarConfiguracoes = useCallback((updates: Partial<ModeloTemplate["configuracoes"]>) => {
    setModelo((prev) => ({
      ...prev,
      configuracoes: { ...prev.configuracoes, ...updates },
    }))
  }, [])

  const atualizarCelulaTabela = useCallback((elementoId: string, celulaId: string, updates: Partial<CelulaTabela>) => {
    setModelo((prev) => ({
      ...prev,
      paginas: prev.paginas.map((pagina) =>
        pagina.id === paginaAtual
          ? {
              ...pagina,
              elementos: pagina.elementos.map((el) => {
                if (el.id === elementoId && el.tipo === "tabela" && typeof el.conteudo === "object") {
                  const tabelaData = el.conteudo as TabelaData
                  return {
                    ...el,
                    conteudo: {
                      ...tabelaData,
                      linhas: tabelaData.linhas.map((linha) => ({
                        ...linha,
                        celulas: linha.celulas.map((celula) => (celula.id === celulaId ? { ...celula, ...updates } : celula)),
                      })),
                    },
                  }
                }
                return el
              }),
            }
          : pagina
      ),
    }))
  }, [paginaAtual])

  const adicionarLinhaTabela = useCallback(
    (elementoId: string) => {
      const elemento = paginaAtualData?.elementos.find((el) => el.id === elementoId)
      if (elemento && elemento.tipo === "tabela" && typeof elemento.conteudo === "object") {
        const tabelaData = elemento.conteudo as TabelaData
        const numColunas = tabelaData.linhas[0]?.celulas.length || 3

        const novaLinha: LinhaTabela = {
          id: `row_${Date.now()}`,
          celulas: Array.from({ length: numColunas }, (_, i) => ({
            id: `cell_${Date.now()}_${i}`,
            conteudo: "",
            estilo: { backgroundColor: "#ffffff", color: "#374151", fontWeight: "normal", textAlign: "left" },
          })),
        }

        atualizarElemento(elementoId, {
          conteudo: {
            ...tabelaData,
            linhas: [...tabelaData.linhas, novaLinha],
          },
        })
      }
    },
    [paginaAtualData, atualizarElemento],
  )

  const removerLinhaTabela = useCallback(
    (elementoId: string, linhaId: string) => {
      const elemento = paginaAtualData?.elementos.find((el) => el.id === elementoId)
      if (elemento && elemento.tipo === "tabela" && typeof elemento.conteudo === "object") {
        const tabelaData = elemento.conteudo as TabelaData
        if (tabelaData.linhas.length > 1) {
          atualizarElemento(elementoId, {
            conteudo: {
              ...tabelaData,
              linhas: tabelaData.linhas.filter((linha) => linha.id !== linhaId),
            },
          })
        }
      }
    },
    [paginaAtualData, atualizarElemento],
  )

  const adicionarColunaTabela = useCallback(
    (elementoId: string) => {
      const elemento = paginaAtualData?.elementos.find((el) => el.id === elementoId)
      if (elemento && elemento.tipo === "tabela" && typeof elemento.conteudo === "object") {
        const tabelaData = elemento.conteudo as TabelaData
        const novaColunaIndex = tabelaData.linhas[0]?.celulas.length || 0

        atualizarElemento(elementoId, {
          conteudo: {
            ...tabelaData,
            linhas: tabelaData.linhas.map((linha) => ({
              ...linha,
              celulas: [
                ...linha.celulas,
                {
                  id: `cell_${Date.now()}_${novaColunaIndex}`,
                  conteudo: "",
                  estilo: { backgroundColor: "#ffffff", color: "#374151", fontWeight: "normal", textAlign: "left" },
                },
              ],
            })),
          },
        })
      }
    },
    [paginaAtualData, atualizarElemento],
  )

  const removerColunaTabela = useCallback(
    (elementoId: string, colunaIndex: number) => {
      const elemento = paginaAtualData?.elementos.find((el) => el.id === elementoId)
      if (elemento && elemento.tipo === "tabela" && typeof elemento.conteudo === "object") {
        const tabelaData = elemento.conteudo as TabelaData
        if (tabelaData.linhas[0]?.celulas.length > 1) {
          atualizarElemento(elementoId, {
            conteudo: {
              ...tabelaData,
              linhas: tabelaData.linhas.map((linha) => ({
                ...linha,
                celulas: linha.celulas.filter((_, index) => index !== colunaIndex),
              })),
            },
          })
        }
      }
    },
    [paginaAtualData, atualizarElemento],
  )

  const alternarBloqueioElemento = useCallback(
    (id: string) => {
      const elemento = paginaAtualData?.elementos.find((el) => el.id === id)
      if (elemento) {
        atualizarElemento(id, { bloqueado: !elemento.bloqueado })
      }
    },
    [paginaAtualData, atualizarElemento],
  )

  const moverElementoParaCima = useCallback((id: string) => {
    setModelo((prev) => {
      const pagina = prev.paginas.find((p) => p.id === paginaAtual)
      if (!pagina) return prev

      const elementos = [...pagina.elementos]
      const index = elementos.findIndex((el) => el.id === id)
      if (index < elementos.length - 1) {
        const temp = elementos[index]
        elementos[index] = elementos[index + 1]
        elementos[index + 1] = temp
      }

      return {
        ...prev,
        paginas: prev.paginas.map((p) =>
          p.id === paginaAtual ? { ...p, elementos } : p
        ),
      }
    })
  }, [paginaAtual])

  const moverElementoParaBaixo = useCallback((id: string) => {
    setModelo((prev) => {
      const pagina = prev.paginas.find((p) => p.id === paginaAtual)
      if (!pagina) return prev

      const elementos = [...pagina.elementos]
      const index = elementos.findIndex((el) => el.id === id)
      if (index > 0) {
        const temp = elementos[index]
        elementos[index] = elementos[index - 1]
        elementos[index - 1] = temp
      }

      return {
        ...prev,
        paginas: prev.paginas.map((p) =>
          p.id === paginaAtual ? { ...p, elementos } : p
        ),
      }
    })
  }, [paginaAtual])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, elementoId: string) => {
      e.preventDefault()

      const elemento = paginaAtualData?.elementos.find((el) => el.id === elementoId)
      if (elemento?.bloqueado) return

      setElementoSelecionado(elementoId)
      setIsDragging(true)

      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect && elemento) {
        const scale = zoom / 100
        setDragOffset({
          x: e.clientX - rect.left - elemento.posicao.x * scale,
          y: e.clientY - rect.top - elemento.posicao.y * scale,
        })
      }
    },
    [paginaAtualData, zoom],
  )

  const handleContextMenu = useCallback((e: React.MouseEvent, elementoId: string) => {
    e.preventDefault()
    setContextMenuElementId(elementoId)
    setElementoSelecionado(elementoId)

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (canvasRect) {
      const x = e.clientX - canvasRect.left
      const y = e.clientY - canvasRect.top
      setContextMenuPosition({ x, y })
      setShowContextMenu(true)
    }
  }, [])

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
    [isDragging, elementoSelecionado, dragOffset, atualizarElemento],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const renderTabela = useCallback(
    (elemento: ElementoModelo) => {
      if (typeof elemento.conteudo !== "object") return null

      const tabelaData = elemento.conteudo as TabelaData
      const isSelected = elementoSelecionado === elemento.id

      return (
        <div className="relative">
          <table className="border-collapse" style={{ borderColor: tabelaData.estilo.borderColor }}>
            <tbody>
              {tabelaData.linhas.map((linha, linhaIndex) => (
                <tr key={linha.id}>
                  {linha.celulas.map((celula, celulaIndex) => {
                    const isEditing =
                      editandoTabela?.elementoId === elemento.id && editandoTabela?.celulaId === celula.id

                    return (
                      <td
                        key={celula.id}
                        className="border p-2 relative group"
                        style={{
                          borderColor: tabelaData.estilo.borderColor,
                          borderWidth: tabelaData.estilo.borderWidth,
                          backgroundColor: celula.estilo.backgroundColor,
                          color: celula.estilo.color,
                          fontWeight: celula.estilo.fontWeight,
                          textAlign: celula.estilo.textAlign as any,
                          minWidth: "80px",
                          minHeight: "32px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!elemento.bloqueado) {
                            setEditandoTabela({ elementoId: elemento.id, celulaId: celula.id })
                            setTextoTemp(celula.conteudo)
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={textoTemp}
                            onChange={(e) => setTextoTemp(e.target.value)}
                            onBlur={() => {
                              atualizarCelulaTabela(elemento.id, celula.id, { conteudo: textoTemp })
                              setEditandoTabela(null)
                              setTextoTemp("")
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                atualizarCelulaTabela(elemento.id, celula.id, { conteudo: textoTemp })
                                setEditandoTabela(null)
                                setTextoTemp("")
                              } else if (e.key === "Escape") {
                                setEditandoTabela(null)
                                setTextoTemp("")
                              }
                            }}
                            className="bg-transparent border-none outline-none w-full"
                            style={{
                              color: celula.estilo.color,
                              fontWeight: celula.estilo.fontWeight,
                              textAlign: celula.estilo.textAlign as any,
                            }}
                            autoFocus
                          />
                        ) : (
                          <div className="cursor-text">{celula.conteudo}</div>
                        )}
                      </td>
                    )
                  })}
                  {isSelected && !elemento.bloqueado && (
                    <td className="border-none p-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-white border-red-500 text-red-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (tabelaData.linhas.length > 1) {
                            removerLinhaTabela(elemento.id, linha.id)
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {isSelected && !elemento.bloqueado && (
            <div className="absolute -bottom-8 left-0">
              <Button
                size="sm"
                variant="outline"
                className="h-6 bg-white border-green-500 text-green-500"
                onClick={(e) => {
                  e.stopPropagation()
                  adicionarLinhaTabela(elemento.id)
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                Linha
              </Button>
            </div>
          )}
        </div>
      )
    },
    [elementoSelecionado, editandoTabela, textoTemp, atualizarCelulaTabela, removerLinhaTabela, adicionarLinhaTabela],
  )

  const getPreviewElementContent = (elemento: ElementoModelo) => {
    if (typeof elemento.conteudo !== "string") return ""
    
    const clienteTeste = clientesTeste.find((c) => c.id === clienteTesteId) || null
    const servicoTeste = servicosTeste.find((s) => s.id === servicoTesteId) || null
    
    // Montar dados completos para processar variáveis
    const dadosProposta: DadosProposta = {
      proposta: {
        numero: "PROP-001",
        titulo: "Proposta Comercial",
        created_at: new Date().toISOString(),
        data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
        status: "Em análise",
        subtotal: servicoTeste ? (servicoTeste.valor_base || 0) : 0,
        desconto: 0,
        acrescimo: 0,
        valor_total: servicoTeste ? (servicoTeste.valor_base || 0) : 0,
        observacoes: "Observações da proposta",
        condicoes_pagamento: "À vista ou parcelado",
        prazo_entrega: "15 dias úteis"
      },
      cliente: clienteTeste || {},
      servicos: servicoTeste ? [{
        ...servicoTeste,
        quantidade: 1,
        valor_personalizado: servicoTeste.valor_base
      }] : [],
      empresa: {
        nome: "Sua Empresa",
        cnpj: "00.000.000/0001-00",
        endereco: "Rua da Empresa, 123",
        cidade: "São Paulo",
        estado: "SP",
        telefone: "(11) 99999-9999",
        email: "contato@empresa.com"
      },
    }
    return processarVariaveis(elemento.conteudo, dadosProposta)
  }

  const renderElemento = useCallback(
    (elemento: ElementoModelo) => {
      const isSelected = elementoSelecionado === elemento.id
      const isHovered = elementoHover === elemento.id
      const isEditing = editandoTexto === elemento.id

      let conteudoRenderizado = typeof elemento.conteudo === "string" ? elemento.conteudo : ""
      
      // Se temos cliente e serviço selecionados, processar as variáveis com dados reais
      const clienteTeste = clientesTeste.find((c) => c.id === clienteTesteId) || null
      const servicoTeste = servicosTeste.find((s) => s.id === servicoTesteId) || null
      
      if (clienteTeste && servicoTeste) {
        // Montar dados completos para processar variáveis
        const dadosProposta: DadosProposta = {
          proposta: {
            numero: "PROP-001",
            titulo: "Proposta Comercial",
            created_at: new Date().toISOString(),
            data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
            status: "Em análise",
            subtotal: servicoTeste ? (servicoTeste.valor_base || 0) : 0,
            desconto: 0,
            acrescimo: 0,
            valor_total: servicoTeste ? (servicoTeste.valor_base || 0) : 0,
            observacoes: "Observações da proposta",
            condicoes_pagamento: "À vista ou parcelado",
            prazo_entrega: "15 dias úteis"
          },
          cliente: clienteTeste || {},
          servicos: servicoTeste ? [{
            ...servicoTeste,
            quantidade: 1,
            valor_personalizado: servicoTeste.valor_base
          }] : [],
          empresa: {
            nome: "Sua Empresa",
            cnpj: "00.000.000/0001-00",
            endereco: "Rua da Empresa, 123",
            cidade: "São Paulo",
            estado: "SP",
            telefone: "(11) 99999-9999",
            email: "contato@empresa.com"
          },
        }
        if (typeof elemento.conteudo === "string") {
          conteudoRenderizado = processarVariaveis(elemento.conteudo, dadosProposta)
        }
      } else {
        // Caso contrário, mostrar apenas os labels das variáveis
        variaveisDisponiveis.forEach((variavel) => {
          conteudoRenderizado = conteudoRenderizado.replace(variavel.valor, `[${variavel.label}]`)
        })
      }

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
        border: isSelected ? "2px solid #FF6F00" : isHovered ? "1px solid #FF6F00" : elemento.estilo.border,
        width: elemento.estilo.width === "auto" ? "auto" : elemento.estilo.width,
        height: elemento.estilo.height === "auto" ? "auto" : elemento.estilo.height,
        cursor: elemento.bloqueado ? "not-allowed" : isEditing ? "text" : "move",
        userSelect: isEditing ? "text" : ("none" as const),
        minWidth: "50px",
        minHeight: "20px",
        transition: "all 0.2s ease",
        opacity: elemento.bloqueado ? 0.7 : 1,
      }

      const iniciarEdicaoTexto = (e: React.MouseEvent) => {
        e.stopPropagation()
        if ((elemento.tipo === "texto" || elemento.tipo === "variavel") && !elemento.bloqueado) {
          setEditandoTexto(elemento.id)
          setTextoTemp(typeof elemento.conteudo === "string" ? elemento.conteudo : "")
        }
      }

      const finalizarEdicaoTexto = () => {
        if (editandoTexto && textoTemp !== elemento.conteudo) {
          atualizarElemento(elemento.id, { conteudo: textoTemp })
        }
        setEditandoTexto(null)
        setTextoTemp("")
      }

      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          finalizarEdicaoTexto()
        } else if (e.key === "Escape") {
          setEditandoTexto(null)
          setTextoTemp("")
        }
      }

      return (
        <div
          key={elemento.id}
          style={estiloElemento as React.CSSProperties}
          onMouseDown={(e) => !isEditing && handleMouseDown(e, elemento.id)}
          onMouseEnter={() => setElementoHover(elemento.id)}
          onMouseLeave={() => setElementoHover(null)}
          onContextMenu={(e) => handleContextMenu(e, elemento.id)}
          className={`${isSelected ? "ring-2 ring-orange-500" : ""} ${isHovered ? "ring-1 ring-orange-300" : ""
            } transition-all relative group`}
        >
          {/* Ícone de bloqueio */}
          {elemento.bloqueado && (
            <div className="absolute -top-6 -left-2 bg-gray-800 text-white rounded-full p-1">
              <Lock className="w-3 h-3" />
            </div>
          )}

          {/* Ícone de edição no hover */}
          {isHovered &&
            !isSelected &&
            !isEditing &&
            !elemento.bloqueado &&
            (elemento.tipo === "texto" || elemento.tipo === "variavel") && (
              <Button
                size="sm"
                variant="outline"
                className="absolute -top-8 -right-8 h-6 w-6 p-0 bg-white border-orange-500 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={iniciarEdicaoTexto}
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            )}

          {/* Conteúdo do elemento */}
          {elemento.tipo === "tabela" ? (
            renderTabela(elemento)
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
              className="bg-gray-200 border-2 border-dashed border-gray-400 relative overflow-hidden"
              style={{
                width: elemento.estilo.width === "auto" ? "150px" : elemento.estilo.width,
                height: elemento.estilo.height === "auto" ? "100px" : elemento.estilo.height,
                minWidth: "50px",
                minHeight: "50px",
              }}
            >
              {typeof elemento.conteudo === "string" && elemento.conteudo && isBase64Image(elemento.conteudo) ? (
                <img
                  src={elemento.conteudo || "/placeholder.svg"}
                  alt="Imagem do modelo"
                  className="w-full h-full object-cover"
                  style={{
                    imageRendering: "auto",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
                    willChange: "auto",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      const errorDiv = document.createElement("div")
                      errorDiv.className =
                        "w-full h-full flex flex-col items-center justify-center text-gray-500 text-xs p-2"
                      errorDiv.innerHTML = `
                        <svg class="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <span>Erro ao carregar</span>
                      `
                      parent.appendChild(errorDiv)
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm text-center px-2">Clique para selecionar imagem</span>
                </div>
              )}

              {/* Botão de biblioteca sempre visível */}
              <Button
                size="sm"
                variant="outline"
                className="absolute bottom-1 right-1 h-6 bg-white/90 text-gray-700 opacity-80 hover:opacity-100 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowImageModal(true)
                  setElementoSelecionado(elemento.id)
                }}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                Biblioteca
              </Button>
            </div>
          ) : isEditing ? (
            <input
              type="text"
              value={textoTemp}
              onChange={(e) => setTextoTemp(e.target.value)}
              onBlur={finalizarEdicaoTexto}
              onKeyDown={handleKeyDown}
              className="bg-transparent border-none outline-none w-full"
              style={{
                fontSize: elemento.estilo.fontSize,
                fontWeight: elemento.estilo.fontWeight,
                color: elemento.estilo.color,
                textAlign: elemento.estilo.textAlign as any,
              }}
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={!elemento.bloqueado ? iniciarEdicaoTexto : undefined}
              className={elemento.tipo === "texto" || elemento.tipo === "variavel" ? "cursor-text" : ""}
            >
              {conteudoRenderizado}
            </div>
          )}

          {/* Controles do elemento selecionado */}
          {isSelected && !isEditing && !elemento.bloqueado && elemento.tipo !== "tabela" && (
            <div className="absolute -top-8 -right-8 flex gap-1">
              {(elemento.tipo === "texto" || elemento.tipo === "variavel") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0 bg-white border-blue-500 text-blue-500"
                  onClick={iniciarEdicaoTexto}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              )}
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
    },
    [
      elementoSelecionado,
      elementoHover,
      editandoTexto,
      textoTemp,
      handleMouseDown,
      handleContextMenu,
      atualizarElemento,
      duplicarElemento,
      removerElemento,
      renderTabela,
      clientesTeste,
      clienteTesteId,
      servicosTeste,
      servicoTesteId,
      getPreviewElementContent,
    ],
  )

  const carregarImagens = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoadingImagens(true)
      const { data, error } = await supabase.from("imagens").select("*").eq("user_id", user.id)

      if (error) throw error

      // Filtrar apenas imagens base64 válidas
      const imagensBase64 = (data || []).filter((img) => img.url && isBase64Image(img.url))
      setImagens(imagensBase64)
    } catch (error) {
      console.error("Erro ao carregar imagens:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas imagens.",
        variant: "destructive",
      })
    } finally {
      setLoadingImagens(false)
    }
  }, [user?.id, toast])

  useEffect(() => {
    if (showImageModal) {
      carregarImagens()
    }
  }, [showImageModal, carregarImagens])

  const selecionarImagem = useCallback(
    async (url: string) => {
      if (elementoSelecionado && isBase64Image(url)) {
        // Otimizar imagem antes de usar
        const imagemOtimizada = await optimizeBase64Image(url, 600, 0.85)
        atualizarElemento(elementoSelecionado, { conteudo: imagemOtimizada })
        setShowImageModal(false)
      }
    },
    [elementoSelecionado, atualizarElemento],
  )

  const elementoAtual = useMemo(
    () => paginaAtualData?.elementos.find((el) => el.id === elementoSelecionado),
    [paginaAtualData, elementoSelecionado],
  )
  const elementoContextMenu = useMemo(
    () => paginaAtualData?.elementos.find((el) => el.id === contextMenuElementId),
    [paginaAtualData, contextMenuElementId],
  )

  // Filtrar variáveis para busca
  const variaveisFiltradas = useMemo(
    () =>
      variaveisDisponiveis.filter(
        (variavel) =>
          variavel.label.toLowerCase().includes(searchVariaveis.toLowerCase()) ||
          variavel.valor.toLowerCase().includes(searchVariaveis.toLowerCase()),
      ),
    [searchVariaveis],
  )

  // Buscar clientes e serviços do supabase ao abrir o editor
  useEffect(() => {
    const fetchClientesEServicos = async () => {
      if (!user?.id) return
      setLoadingClientesTeste(true)
      setLoadingServicosTeste(true)
      const [{ data: clientes, error: errorClientes }, { data: servicos, error: errorServicos }] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", user.id).order("nome"),
        supabase.from("servicos").select("*").eq("user_id", user.id).order("nome"),
      ])
      if (!errorClientes) setClientesTeste(clientes || [])
      if (!errorServicos) setServicosTeste(servicos || [])
      setLoadingClientesTeste(false)
      setLoadingServicosTeste(false)
    }
    fetchClientesEServicos()
  }, [user?.id])

  // Mostrar loading apenas quando está carregando E ainda não carregou o modelo
  if (loading || (!modeloCarregado && searchParams.get("editid"))) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando editor...</p>
        </div>
      </div>
    )
  }

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: "URL copiada",
      description: "Dados da imagem copiados para a área de transferência",
    })
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
              <Dialog open={showVariaveisModal} onOpenChange={setShowVariaveisModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-gray-600">
                    <Variable className="w-4 h-4 mr-1" />
                    Variáveis
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle className="text-white">Adicionar Variável</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Busca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Buscar variáveis..."
                        value={searchVariaveis}
                        onChange={(e) => setSearchVariaveis(e.target.value)}
                        className="bg-gray-800 border-gray-600 pl-10"
                      />
                    </div>

                    {/* Lista de variáveis */}
                    <div className="max-h-96 overflow-y-auto space-y-4">
                      {categoriasVariaveis.map((categoria) => {
                        const variaveisCategoria = variaveisFiltradas.filter((v) => v.categoria === categoria.id)
                        if (variaveisCategoria.length === 0) return null

                        return (
                          <div key={categoria.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoria.cor }} />
                              <h3 className="text-sm font-medium text-gray-300">{categoria.label}</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2 ml-5">
                              {variaveisCategoria.map((variavel) => (
                                <button
                                  key={variavel.id}
                                  onClick={() => adicionarVariavel(variavel.valor)}
                                  className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors text-left"
                                >
                                  <div>
                                    <div className="text-sm font-medium text-white">{variavel.label}</div>
                                    <div className="text-xs text-gray-400">{variavel.valor}</div>
                                  </div>
                                  <Plus className="w-4 h-4 text-gray-400" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="h-6 w-px bg-gray-600" />

            {/* Controles de Páginas */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-300">Páginas</Label>
              <Select value={paginaAtual} onValueChange={setPaginaAtual}>
                <SelectTrigger className="bg-gray-700 border-gray-600 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {modelo.paginas.map((pagina) => (
                    <SelectItem key={pagina.id} value={pagina.id} className="text-gray-300">
                      <div className="flex items-center justify-between w-full">
                        <span>{pagina.nome}</span>
                        <Badge variant="outline" className="text-xs ml-2">
                          {pagina.elementos.length}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={adicionarPagina}
                variant="outline"
                size="sm"
                className="border-gray-600"
                title="Adicionar nova página"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {
                  const pagina = modelo.paginas.find(p => p.id === paginaAtual)
                  if (pagina) {
                    setPaginaParaRenomear(paginaAtual)
                    setNovoNomePagina(pagina.nome)
                    setShowRenomearPaginaModal(true)
                  }
                }}
                variant="outline"
                size="sm"
                className="border-gray-600"
                title="Renomear página"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              {modelo.paginas.length > 1 && (
                <Button
                  onClick={() => removerPagina(paginaAtual)}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-red-400 hover:text-red-300"
                  title="Remover página atual"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
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
              <Button
                onClick={() => setShowAtalhosModal(true)}
                variant="outline"
                size="sm"
                className="border-gray-600"
                title="Atalhos (F1)"
              >
                <kbd className="text-xs">?</kbd>
              </Button>
            </div>

            {/* Cliente de teste */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-300">Cliente de Teste</Label>
              <Select
                value={clienteTesteId}
                onValueChange={setClienteTesteId}
                disabled={loadingClientesTeste || clientesTeste.length === 0}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 w-48">
                  <SelectValue placeholder={loadingClientesTeste ? "Carregando..." : "Selecione um cliente"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {clientesTeste.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-gray-300">
                      {c.nome} {c.empresa && `- ${c.empresa}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serviço de teste */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-300">Serviço de Teste</Label>
              <Select
                value={servicoTesteId}
                onValueChange={setServicoTesteId}
                disabled={loadingServicosTeste || servicosTeste.length === 0}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 w-48">
                  <SelectValue placeholder={loadingServicosTeste ? "Carregando..." : "Selecione um serviço"} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {servicosTeste.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-gray-300">
                      {s.nome} - R$ {(s.valor_base || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex">
        {/* Canvas */}
        <div className="flex-1 p-6 overflow-auto bg-[#e5e7eb] flex flex-col items-center min-h-[100vh]">
          <div className="flex justify-center w-full">
            {/* Indicador da página atual */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{paginaAtualData?.nome || "Página"}</span>
                  <Badge variant="outline" className="text-xs">
                    {paginaAtualData?.elementos.length || 0} elementos
                  </Badge>
                </div>
              </div>
            </div>
            
            <div
              ref={canvasRef}
              className="relative bg-white shadow-2xl rounded-xl border border-gray-300"
              style={{
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                backgroundColor: paginaAtualData?.configuracoes.corFundo || modelo.configuracoes.corFundo,
                backgroundImage: showGrid ? "radial-gradient(circle, #e5e5e5 1px, transparent 1px)" : "none",
                backgroundSize: showGrid ? "20px 20px" : "auto",
                backgroundPosition: "auto",
                backgroundRepeat: "repeat",
                padding: paginaAtualData?.configuracoes.padding || modelo.configuracoes.padding,
                fontFamily: paginaAtualData?.configuracoes.fontFamily || modelo.configuracoes.fontFamily,
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                willChange: zoom !== 100 ? "transform" : "auto",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
                margin: "40px 0",
                overflow: "hidden",
              }}
              onClick={() => {
                if (!editandoTexto && !editandoTabela) {
                  setElementoSelecionado(null)
                  setShowContextMenu(false)
                }
              }}
            >
              {paginaAtualData?.elementos.map(renderElemento)}
              {(!paginaAtualData || paginaAtualData.elementos.length === 0) && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Clique nos botões da barra de ferramentas para adicionar elementos</p>
                  </div>
                </div>
              )}

              {/* Menu de contexto */}
              {showContextMenu && elementoContextMenu && (
                <div
                  ref={contextMenuRef}
                  className="absolute bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50"
                  style={{
                    left: `${contextMenuPosition.x}px`,
                    top: `${contextMenuPosition.y}px`,
                    minWidth: "180px",
                  }}
                >
                  <div className="px-3 py-2 text-xs font-medium text-gray-400 border-b border-gray-700">
                    {elementoContextMenu.tipo.charAt(0).toUpperCase() + elementoContextMenu.tipo.slice(1)}
                  </div>

                  {(elementoContextMenu.tipo === "texto" || elementoContextMenu.tipo === "variavel") &&
                    !elementoContextMenu.bloqueado && (
                      <button
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                        onClick={() => {
                          setEditandoTexto(elementoContextMenu.id)
                          setTextoTemp(
                            typeof elementoContextMenu.conteudo === "string" ? elementoContextMenu.conteudo : "",
                          )
                          setShowContextMenu(false)
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Editar texto
                      </button>
                    )}

                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                    onClick={() => {
                      alternarBloqueioElemento(elementoContextMenu.id)
                      setShowContextMenu(false)
                    }}
                  >
                    {elementoContextMenu.bloqueado ? (
                      <>
                        <Unlock className="w-4 h-4 mr-2" />
                        Desbloquear
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Bloquear
                      </>
                    )}
                  </button>

                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                    onClick={() => {
                      duplicarElemento(elementoContextMenu.id)
                      setShowContextMenu(false)
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                  </button>

                  <div className="border-t border-gray-700 my-1"></div>

                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                    onClick={() => {
                      moverElementoParaCima(elementoContextMenu.id)
                      setShowContextMenu(false)
                    }}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Trazer para frente
                  </button>

                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 flex items-center"
                    onClick={() => {
                      moverElementoParaBaixo(elementoContextMenu.id)
                      setShowContextMenu(false)
                    }}
                  >
                    <ArrowDown className="w-4 h-4 mr-2" />
                    Enviar para trás
                  </button>

                  <div className="border-t border-gray-700 my-1"></div>

                  <button
                    className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 flex items-center"
                    onClick={() => {
                      removerElemento(elementoContextMenu.id)
                      setShowContextMenu(false)
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Prévia do modelo preenchido */}
          <div className="mt-10 bg-gray-100 rounded-lg p-6 border border-gray-300">
            <h2 className="text-lg font-bold mb-4 text-gray-800">Prévia do Modelo Preenchido</h2>
            {clientesTeste.find((c) => c.id === clienteTesteId) && servicosTeste.find((s) => s.id === servicoTesteId) ? (
              <div className="space-y-4">
                {paginaAtualData?.elementos.map((el) => (
                  <div key={el.id} className="p-2 border-b border-gray-300 last:border-b-0">
                    <span className="font-semibold text-gray-700 capitalize">{el.tipo}:</span>
                    <div className="text-gray-900 whitespace-pre-line">{getPreviewElementContent(el)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">Selecione um cliente e serviço de teste para visualizar a prévia.</div>
            )}
          </div>
        </div>

        {/* Sidebar sempre visível */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-hidden">
          <Tabs value={sidebarTab} onValueChange={(value) => setSidebarTab(value as "propriedades" | "camadas" | "paginas")}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-800 border-gray-700">
              <TabsTrigger value="camadas" className="data-[state=active]:bg-gray-700">
                <Layers className="w-4 h-4 mr-2" />
                Camadas
              </TabsTrigger>
              <TabsTrigger value="paginas" className="data-[state=active]:bg-gray-700">
                <Grid className="w-4 h-4 mr-2" />
                Páginas
              </TabsTrigger>
              <TabsTrigger value="propriedades" className="data-[state=active]:bg-gray-700">
                <Settings className="w-4 h-4 mr-2" />
                Propriedades
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camadas" className="p-4 h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-300">Elementos ({paginaAtualData?.elementos.length || 0})</h3>
                  <Button
                    onClick={() => setElementoSelecionado(null)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    <MousePointer className="w-4 h-4" />
                  </Button>
                </div>

                {(!paginaAtualData || paginaAtualData.elementos.length === 0) ? (
                  <div className="text-center py-8 text-gray-500">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum elemento adicionado</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {paginaAtualData.elementos.map((elemento, index) => {
                      const isSelected = elementoSelecionado === elemento.id
                      let preview = typeof elemento.conteudo === "string" ? elemento.conteudo : "Tabela"
                      if (elemento.tipo === "variavel") {
                        const variavel = variaveisDisponiveis.find((v) => v.valor === preview)
                        preview = variavel ? `[${variavel.label}]` : preview
                      }
                      preview = preview.length > 30 ? preview.substring(0, 30) + "..." : preview

                      return (
                        <div
                          key={elemento.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected
                            ? "bg-orange-500/20 border-orange-500/50"
                            : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                            }`}
                          onClick={() => setElementoSelecionado(elemento.id)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {elemento.tipo === "texto" && <Type className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                            {elemento.tipo === "variavel" && (
                              <Variable className="w-4 h-4 text-green-400 flex-shrink-0" />
                            )}
                            {elemento.tipo === "imagem" && (
                              <ImageIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            )}
                            {elemento.tipo === "tabela" && <Table className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                            {elemento.tipo === "linha" && <hr className="w-4 border-gray-400 flex-shrink-0" />}

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-300 capitalize">{elemento.tipo}</div>
                              <div className="text-xs text-gray-500 truncate">{preview || "Sem conteúdo"}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {elemento.bloqueado && <Lock className="w-3 h-3 text-gray-500" />}
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {index + 1}
                            </Badge>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                removerElemento(elemento.id)
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="paginas" className="p-4 h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-300">Páginas ({modelo.paginas.length})</h3>
                  <Button
                    onClick={adicionarPagina}
                    variant="outline"
                    size="sm"
                    className="border-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {modelo.paginas.map((pagina) => {
                    const isCurrentPage = pagina.id === paginaAtual
                    return (
                      <div
                        key={pagina.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isCurrentPage
                            ? "bg-orange-500/20 border-orange-500/50"
                            : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                        }`}
                        onClick={() => setPaginaAtual(pagina.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-300">{pagina.nome}</span>
                            {isCurrentPage && (
                              <Badge variant="outline" className="text-xs">
                                Atual
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {pagina.elementos.length} elementos
                            </Badge>
                            {modelo.paginas.length > 1 && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removerPagina(pagina.id)
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Mini preview dos elementos */}
                        <div className="space-y-1">
                          {pagina.elementos.slice(0, 3).map((elemento) => (
                            <div key={elemento.id} className="flex items-center gap-2 text-xs text-gray-500">
                              {elemento.tipo === "texto" && <Type className="w-3 h-3 text-blue-400" />}
                              {elemento.tipo === "variavel" && <Variable className="w-3 h-3 text-green-400" />}
                              {elemento.tipo === "imagem" && <ImageIcon className="w-3 h-3 text-purple-400" />}
                              {elemento.tipo === "tabela" && <Table className="w-3 h-3 text-yellow-400" />}
                              {elemento.tipo === "linha" && <hr className="w-3 border-gray-400" />}
                              <span className="capitalize">{elemento.tipo}</span>
                            </div>
                          ))}
                          {pagina.elementos.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{pagina.elementos.length - 3} mais elementos
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="propriedades" className="p-4 min-h-full overflow-y-auto">
              {elementoAtual ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      {elementoAtual.tipo.charAt(0).toUpperCase() + elementoAtual.tipo.slice(1)}
                      {elementoAtual.bloqueado && (
                        <span className="ml-auto flex items-center text-xs text-gray-400">
                          <Lock className="w-3 h-3 mr-1" /> Bloqueado
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Conteúdo */}
                    {(elementoAtual.tipo === "texto" || elementoAtual.tipo === "variavel") && (
                      <div className="space-y-2">
                        <Label className="text-xs">Conteúdo</Label>
                        <Textarea
                          value={typeof elementoAtual.conteudo === "string" ? elementoAtual.conteudo : ""}
                          onChange={(e) => atualizarElemento(elementoAtual.id, { conteudo: e.target.value })}
                          className="bg-gray-700 border-gray-600 text-sm"
                          rows={3}
                          disabled={elementoAtual.bloqueado}
                        />
                      </div>
                    )}

                    {/* Propriedades específicas da tabela */}
                    {elementoAtual.tipo === "tabela" && typeof elementoAtual.conteudo === "object" && (
                      <div className="space-y-3">
                        <Label className="text-xs">Estrutura da Tabela</Label>

                        {/* Informações da estrutura */}
                        <div className="bg-gray-700 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">Linhas:</span>
                            <span className="text-white">{(elementoAtual.conteudo as TabelaData).linhas.length}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">Colunas:</span>
                            <span className="text-white">
                              {(elementoAtual.conteudo as TabelaData).linhas[0]?.celulas.length || 0}
                            </span>
                          </div>
                        </div>

                        {/* Controles de linhas */}
                        <div className="space-y-2">
                          <Label className="text-xs">Linhas</Label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-600"
                              onClick={() => adicionarLinhaTabela(elementoAtual.id)}
                              disabled={elementoAtual.bloqueado}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Adicionar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-600"
                              onClick={() => {
                                const tabelaData = elementoAtual.conteudo as TabelaData
                                if (tabelaData.linhas.length > 1) {
                                  const ultimaLinha = tabelaData.linhas[tabelaData.linhas.length - 1]
                                  removerLinhaTabela(elementoAtual.id, ultimaLinha.id)
                                }
                              }}
                              disabled={
                                elementoAtual.bloqueado || (elementoAtual.conteudo as TabelaData).linhas.length <= 1
                              }
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>

                        {/* Controles de colunas */}
                        <div className="space-y-2">
                          <Label className="text-xs">Colunas</Label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-600"
                              onClick={() => adicionarColunaTabela(elementoAtual.id)}
                              disabled={elementoAtual.bloqueado}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Adicionar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-gray-600"
                              onClick={() => {
                                const tabelaData = elementoAtual.conteudo as TabelaData
                                const numColunas = tabelaData.linhas[0]?.celulas.length || 0
                                if (numColunas > 1) {
                                  removerColunaTabela(elementoAtual.id, numColunas - 1)
                                }
                              }}
                              disabled={
                                elementoAtual.bloqueado ||
                                ((elementoAtual.conteudo as TabelaData).linhas[0]?.celulas.length || 0) <= 1
                              }
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </div>

                        {/* Configurações visuais */}
                        <div className="space-y-2">
                          <Label className="text-xs">Aparência</Label>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Cor da Borda</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-8 h-8 p-0 border-gray-600"
                                  style={{ backgroundColor: (elementoAtual.conteudo as TabelaData).estilo.borderColor }}
                                >
                                  <Pipette className="w-3 h-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3 bg-gray-800 border-gray-700">
                                <ColorPicker
                                  color={(elementoAtual.conteudo as TabelaData).estilo.borderColor}
                                  onChange={(color) => {
                                    const tabelaData = elementoAtual.conteudo as TabelaData
                                    atualizarElemento(elementoAtual.id, {
                                      conteudo: {
                                        ...tabelaData,
                                        estilo: { ...tabelaData.estilo, borderColor: color },
                                      },
                                    })
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Seleção de imagem */}
                    {elementoAtual.tipo === "imagem" && (
                      <div className="space-y-3">
                        <Label className="text-xs flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          Imagem (Base64)
                        </Label>
                        <div className="space-y-2">
                          <Button
                            onClick={() => {
                              setShowImageModal(true)
                              setElementoSelecionado(elementoAtual.id)
                            }}
                            variant="outline"
                            className="w-full border-gray-600"
                            disabled={elementoAtual.bloqueado}
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Selecionar da Biblioteca
                          </Button>

                          {typeof elementoAtual.conteudo === "string" &&
                            elementoAtual.conteudo &&
                            isBase64Image(elementoAtual.conteudo) && (
                              <div className="space-y-2">
                                <div className="relative">
                                  <img
                                    src={elementoAtual.conteudo || "/placeholder.svg"}
                                    alt="Preview"
                                    className="w-full h-24 object-cover rounded border border-gray-600"
                                    onError={(e) => {
                                      e.currentTarget.src = "/placeholder.svg?height=96&width=200&text=Erro+ao+carregar"
                                    }}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => copyImageUrl(elementoAtual.conteudo as string)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 border-gray-600"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copiar
                                  </Button>
                                  <Button
                                    onClick={() => atualizarElemento(elementoAtual.id, { conteudo: "" })}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 border-gray-600 text-red-400 hover:text-red-300"
                                    disabled={elementoAtual.bloqueado}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Remover
                                  </Button>
                                </div>
                              </div>
                            )}
                        </div>
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
                          disabled={elementoAtual.bloqueado}
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
                          disabled={elementoAtual.bloqueado}
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
                          disabled={elementoAtual.bloqueado}
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
                          disabled={elementoAtual.bloqueado}
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
                          disabled={elementoAtual.bloqueado}
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full h-8 justify-start border-gray-600"
                                disabled={elementoAtual.bloqueado}
                              >
                                <div
                                  className="w-4 h-4 rounded mr-2"
                                  style={{ backgroundColor: elementoAtual.estilo.color }}
                                />
                                <Pipette className="w-3 h-3 mr-1" />
                                {elementoAtual.estilo.color}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3 bg-gray-800 border-gray-700">
                              <ColorPicker
                                color={elementoAtual.estilo.color}
                                onChange={(color) =>
                                  atualizarElemento(elementoAtual.id, {
                                    estilo: { ...elementoAtual.estilo, color },
                                  })
                                }
                                disabled={elementoAtual.bloqueado}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fundo</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full h-8 justify-start border-gray-600"
                                disabled={elementoAtual.bloqueado}
                              >
                                <div
                                  className="w-4 h-4 rounded mr-2 border"
                                  style={{
                                    backgroundColor:
                                      elementoAtual.estilo.backgroundColor === "transparent"
                                        ? "#ffffff"
                                        : elementoAtual.estilo.backgroundColor,
                                    borderColor: "#666",
                                  }}
                                />
                                <Pipette className="w-3 h-3 mr-1" />
                                {elementoAtual.estilo.backgroundColor === "transparent"
                                  ? "Transparente"
                                  : elementoAtual.estilo.backgroundColor}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3 bg-gray-800 border-gray-700">
                              <div className="space-y-2">
                                <ColorPicker
                                  color={
                                    elementoAtual.estilo.backgroundColor === "transparent"
                                      ? "#ffffff"
                                      : elementoAtual.estilo.backgroundColor
                                  }
                                  onChange={(color) =>
                                    atualizarElemento(elementoAtual.id, {
                                      estilo: { ...elementoAtual.estilo, backgroundColor: color },
                                    })
                                  }
                                  disabled={elementoAtual.bloqueado}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() =>
                                    atualizarElemento(elementoAtual.id, {
                                      estilo: { ...elementoAtual.estilo, backgroundColor: "transparent" },
                                    })
                                  }
                                  disabled={elementoAtual.bloqueado}
                                >
                                  Transparente
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
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
                            disabled={elementoAtual.bloqueado}
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
                            disabled={elementoAtual.bloqueado}
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
                            disabled={elementoAtual.bloqueado}
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
                            disabled={elementoAtual.bloqueado}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Controles adicionais */}
                    <div className="pt-2 border-t border-gray-700">
                      <Button
                        onClick={() => alternarBloqueioElemento(elementoAtual.id)}
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-600"
                      >
                        {elementoAtual.bloqueado ? (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Desbloquear elemento
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Bloquear elemento
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Propriedades da Página */
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      Propriedades da Página
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Configurações da página */}
                    <div className="space-y-3">
                      <Label className="text-xs">Dimensões</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Largura</Label>
                          <Input
                            value={modelo.configuracoes.largura}
                            onChange={(e) => atualizarConfiguracoes({ largura: e.target.value })}
                            className="bg-gray-700 border-gray-600 h-8 text-xs"
                            placeholder="800px"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Padding</Label>
                          <Input
                            value={modelo.configuracoes.padding}
                            onChange={(e) => atualizarConfiguracoes({ padding: e.target.value })}
                            className="bg-gray-700 border-gray-600 h-8 text-xs"
                            placeholder="40px"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cor de fundo */}
                    <div className="space-y-2">
                      <Label className="text-xs">Cor de Fundo</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-8 justify-start border-gray-600">
                            <div
                              className="w-4 h-4 rounded mr-2"
                              style={{ backgroundColor: modelo.configuracoes.corFundo }}
                            />
                            <Pipette className="w-3 h-3 mr-1" />
                            {modelo.configuracoes.corFundo}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 bg-gray-800 border-gray-700">
                          <ColorPicker
                            color={modelo.configuracoes.corFundo}
                            onChange={(color) => atualizarConfiguracoes({ corFundo: color })}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Fonte */}
                    <div className="space-y-2">
                      <Label className="text-xs">Fonte Padrão</Label>
                      <Select
                        value={modelo.configuracoes.fontFamily}
                        onValueChange={(value) => atualizarConfiguracoes({ fontFamily: value })}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="Arial, sans-serif" className="text-gray-300">
                            Arial
                          </SelectItem>
                          <SelectItem value="Georgia, serif" className="text-gray-300">
                            Georgia
                          </SelectItem>
                          <SelectItem value="'Times New Roman', serif" className="text-gray-300">
                            Times New Roman
                          </SelectItem>
                          <SelectItem value="'Courier New', monospace" className="text-gray-300">
                            Courier New
                          </SelectItem>
                          <SelectItem value="Helvetica, sans-serif" className="text-gray-300">
                            Helvetica
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Informações */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>• Clique em um elemento para editá-lo</p>
                        <p>• Use a aba Camadas para navegar</p>
                        <p>• Arraste elementos para reposicionar</p>
                        <p>• Apenas imagens Base64 são suportadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de seleção de imagens */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">Selecionar Imagem (Base64)</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                className="text-orange-500 border-orange-500 hover:bg-orange-500 hover:text-white"
                onClick={() => {
                  setShowImageModal(false)
                  router.push("/imagens")
                }}
              >
                <Library className="w-4 h-4 mr-2" />
                Ir para a Biblioteca
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {loadingImagens ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : imagens.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                <p className="text-gray-400">Nenhuma imagem Base64 encontrada. Adicione imagens na seção Imagens.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setShowImageModal(false)
                    router.push("/imagens")
                  }}
                >
                  Ir para Imagens
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                {imagens.map((imagem) => (
                  <div
                    key={imagem.id}
                    className="relative aspect-square border border-gray-700 rounded-md overflow-hidden cursor-pointer hover:border-orange-500 transition-all group"
                    onClick={() => selecionarImagem(imagem.url)}
                  >
                    <img
                      src={imagem.url || "/placeholder.svg"}
                      alt={imagem.nome}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        imageRendering: "auto",
                        backfaceVisibility: "hidden",
                        transform: "translateZ(0)",
                      }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=150&width=150&text=Erro"
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 bg-orange-500/80 hover:bg-orange-500 text-white"
                      >
                        Selecionar
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                      {imagem.nome}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de atalhos */}
      <Dialog open={showAtalhosModal} onOpenChange={setShowAtalhosModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <kbd className="text-lg">⌨️</kbd>
              Atalhos do Editor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            {/* Atalhos Gerais */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Atalhos Gerais
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Salvar modelo</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl + S</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Mostrar/ocultar grade</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl + G</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Mostrar atalhos</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">F1</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Deselecionar elemento</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Esc</kbd>
                </div>
              </div>
            </div>

            {/* Atalhos de Zoom */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                Zoom
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Zoom 75%</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl + 1</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Zoom 100%</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl + 2</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Zoom 125%</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl + 3</kbd>
                </div>
              </div>
            </div>

            {/* Atalhos de Elementos */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Elementos
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Remover elemento selecionado</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Delete</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Duplicar elemento selecionado</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Ctrl + D</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <span className="text-sm text-gray-300">Navegar entre elementos</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Tab / Shift + Tab</kbd>
                </div>
              </div>

              {/* Atalhos de Movimento */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  Movimento
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-sm text-gray-300">Mover elemento (1px)</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">↑ ↓ ← →</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-sm text-gray-300">Mover elemento (10px)</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Shift + ↑ ↓ ← →</kbd>
                  </div>
                </div>
              </div>

              {/* Dicas */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">💡 Dicas</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Clique duplo em texto para editar rapidamente</li>
                  <li>• Arraste elementos para reposicionar</li>
                  <li>• Use o botão direito para menu de contexto</li>
                  <li>• Mantenha Shift pressionado para movimento preciso</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <input
                  type="checkbox"
                  id="nao-mostrar-novamente"
                  onChange={(e) => {
                    if (e.target.checked) {
                      localStorage.setItem('atalhos-editor-vistos', 'true')
                    } else {
                      localStorage.removeItem('atalhos-editor-vistos')
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="nao-mostrar-novamente">Não mostrar novamente</label>
              </div>
              <Button onClick={fecharAtalhosModal} className="bg-orange-600 hover:bg-orange-700">
                Entendi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de renomear página */}
      <Dialog open={showRenomearPaginaModal} onOpenChange={setShowRenomearPaginaModal}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Renomear Página</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novo-nome" className="text-sm text-gray-300">
                Novo nome da página
              </Label>
              <Input
                id="novo-nome"
                value={novoNomePagina}
                onChange={(e) => setNovoNomePagina(e.target.value)}
                placeholder="Digite o novo nome"
                className="bg-gray-800 border-gray-600"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && novoNomePagina.trim()) {
                    renomearPagina(paginaParaRenomear, novoNomePagina.trim())
                    setShowRenomearPaginaModal(false)
                  }
                }}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowRenomearPaginaModal(false)}
                className="border-gray-600"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (novoNomePagina.trim()) {
                    renomearPagina(paginaParaRenomear, novoNomePagina.trim())
                    setShowRenomearPaginaModal(false)
                  }
                }}
                disabled={!novoNomePagina.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Renomear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
