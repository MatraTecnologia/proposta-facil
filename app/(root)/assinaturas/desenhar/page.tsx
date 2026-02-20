"use client"

import type React from "react"
import { memo } from "react"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ArrowLeft, RotateCcw, Save, Wand2, Contrast, Filter, Eye, PenTool, Undo, Redo } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/contexts/AuthContext"

interface Assinatura {
  id: string
  nome: string
  data_assinatura: {
    canvasData: string
  }
  largura: number
  altura: number
}

// Componente de Controles de Desenho memoizado
const DrawingControls = memo(({
  onClear,
  onUndo,
  onRedo,
  onSave,
  onColorChange,
  onWidthChange,
  onContrastChange,
  onFilterChange,
  canUndo,
  canRedo,
  color,
  width,
  contrast,
  filter,
  saving
}: {
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  onSave: () => void
  onColorChange: (color: string) => void
  onWidthChange: (width: number) => void
  onContrastChange: (contrast: number) => void
  onFilterChange: (filter: string) => void
  canUndo: boolean
  canRedo: boolean
  color: string
  width: number
  contrast: number
  filter: string
  saving: boolean
}) => {
  return (
    <div className="flex flex-wrap gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="text-gray-400 hover:text-white border-gray-600"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="text-gray-400 hover:text-white border-gray-600 disabled:opacity-50"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="text-gray-400 hover:text-white border-gray-600 disabled:opacity-50"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-400">Cor</Label>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="w-8 h-8 p-0 border-gray-600"
              style={{ backgroundColor: color }}
              onClick={() => document.getElementById("color-picker")?.click()}
            />
            <div className="absolute top-full left-0 mt-2 z-50">
              <HexColorPicker
                color={color}
                onChange={onColorChange}
                className="hidden"
                id="color-picker"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-400">Espessura</Label>
          <Slider
            value={[width]}
            onValueChange={([value]) => onWidthChange(value)}
            min={1}
            max={20}
            step={1}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-400">Contraste</Label>
          <Slider
            value={[contrast]}
            onValueChange={([value]) => onContrastChange(value)}
            min={0}
            max={100}
            step={1}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-400">Filtro</Label>
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white rounded-md px-2 py-1 text-sm"
          >
            <option value="none">Nenhum</option>
            <option value="grayscale">Escala de Cinza</option>
            <option value="sepia">Sépia</option>
            <option value="invert">Inverter</option>
          </select>
        </div>
      </div>

      <Button
        onClick={onSave}
        disabled={saving}
        className="ml-auto bg-orange-600 hover:bg-orange-700"
      >
        {saving ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Salvar Assinatura
          </>
        )}
      </Button>
    </div>
  )
})

DrawingControls.displayName = "DrawingControls"

const AssinaturaPage = memo(function DesenharAssinaturaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const { user } = useAuth() // Use the AuthContext instead

  const [isDrawing, setIsDrawing] = useState(false)
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null)

  // Canvas history for undo/redo
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  // Canvas settings
  const [canvasSettings, setCanvasSettings] = useState({
    cor: "#000000",
    espessura: 2,
    filtro: "normal" as "normal" | "traçado" | "negativo" | "blur",
    backgroundColor: "#ffffff",
    transparente: true
  })

  const [formData, setFormData] = useState({
    nome: "",
    destaque: false,
  })

  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setTimeout(() => {
      initializeCanvas()
      // Save initial state to history
      const canvas = canvasRef.current
      if (canvas) {
        const dataURL = canvas.toDataURL("image/png")
        setHistory([dataURL])
        setHistoryIndex(0)
      }
    }, 100)
  }, [canvasSettings.backgroundColor])

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

  const applyFilter = useCallback((ctx: CanvasRenderingContext2D) => {
    switch (canvasSettings.filtro) {
      case "traçado":
        ctx.filter = "contrast(200%) brightness(150%)"
        break
      case "negativo":
        ctx.filter = "invert(100%)"
        break
      case "blur":
        ctx.filter = "blur(1px)"
        break
      default:
        ctx.filter = "none"
    }
  }, [canvasSettings.filtro])

  const initializeCanvas = () => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current

    if (canvas) {
      const ctx = canvas.getContext("2d", { alpha: canvasSettings.transparente })
      if (ctx) {
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()

        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        ctx.scale(dpr, dpr)
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`

        if (!canvasSettings.transparente) {
          ctx.fillStyle = canvasSettings.backgroundColor
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }

        ctx.strokeStyle = canvasSettings.cor
        ctx.lineWidth = canvasSettings.espessura
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        applyFilter(ctx)
      }
    }

    if (previewCanvas) {
      const previewCtx = previewCanvas.getContext("2d", { alpha: canvasSettings.transparente })
      if (previewCtx) {
        const dpr = window.devicePixelRatio || 1
        const rect = previewCanvas.getBoundingClientRect()

        previewCanvas.width = rect.width * dpr
        previewCanvas.height = rect.height * dpr

        previewCtx.scale(dpr, dpr)
        previewCanvas.style.width = `${rect.width}px`
        previewCanvas.style.height = `${rect.height}px`

        if (!canvasSettings.transparente) {
          previewCtx.fillStyle = canvasSettings.backgroundColor
          previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height)
        } else {
          previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
        }

        previewCtx.imageSmoothingEnabled = true
        previewCtx.imageSmoothingQuality = "high"
        applyFilter(previewCtx)
      }
    }
  }

  const getCanvasCoordinates = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const getEventCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      return {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY
      }
    }
    return {
      clientX: e.clientX,
      clientY: e.clientY
    }
  }

  const updatePreview = useCallback(() => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return

    const ctx = canvas.getContext("2d")
    const previewCtx = previewCanvas.getContext("2d")
    if (!ctx || !previewCtx) return

    // Limpar preview
    if (!canvasSettings.transparente) {
      previewCtx.fillStyle = canvasSettings.backgroundColor
      previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height)
    } else {
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
    }

    // Aplicar filtro no preview
    applyFilter(previewCtx)

    // Copiar conteúdo do canvas principal para o preview
    previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height)
  }, [canvasSettings.backgroundColor, canvasSettings.filtro, canvasSettings.transparente, applyFilter])

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)
    const { clientX, clientY } = getEventCoordinates(e)
    const coords = getCanvasCoordinates(canvas, clientX, clientY)

    // Configurar estilo do traço
    ctx.strokeStyle = canvasSettings.cor
    ctx.lineWidth = canvasSettings.espessura
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    applyFilter(ctx)

    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()

    lastPoint.current = coords
  }, [canvasSettings.cor, canvasSettings.espessura, canvasSettings.filtro, applyFilter])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx || !lastPoint.current) return

    const { clientX, clientY } = getEventCoordinates(e)
    const coords = getCanvasCoordinates(canvas, clientX, clientY)

    // Configurar estilo do traço
    ctx.strokeStyle = canvasSettings.cor
    ctx.lineWidth = canvasSettings.espessura
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    applyFilter(ctx)

    // Usar curva de Bezier para traços mais suaves
    const cp1x = lastPoint.current.x + (coords.x - lastPoint.current.x) / 3
    const cp1y = lastPoint.current.y + (coords.y - lastPoint.current.y) / 3
    const cp2x = lastPoint.current.x + 2 * (coords.x - lastPoint.current.x) / 3
    const cp2y = lastPoint.current.y + 2 * (coords.y - lastPoint.current.y) / 3

    ctx.beginPath()
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, coords.x, coords.y)
    ctx.stroke()

    lastPoint.current = coords
    updatePreview()
  }, [isDrawing, canvasSettings.cor, canvasSettings.espessura, canvasSettings.filtro, applyFilter, updatePreview])

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)

      // Save current state to history
      const canvas = canvasRef.current
      if (canvas) {
        const dataURL = canvas.toDataURL("image/png")

        // Remove any forward history if we're not at the end
        const newHistory = history.slice(0, historyIndex + 1)
        setHistory([...newHistory, dataURL])
        setHistoryIndex(newHistory.length)
      }
    }
  }, [isDrawing, history, historyIndex])

  const handleClearCanvas = () => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    if (!canvas || !previewCanvas) return

    const ctx = canvas.getContext("2d")
    const previewCtx = previewCanvas.getContext("2d")
    if (!ctx || !previewCtx) return

    ctx.fillStyle = canvasSettings.backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    previewCtx.fillStyle = canvasSettings.backgroundColor
    previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height)
    setHistory([])
    setHistoryIndex(-1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        ctx.fillStyle = canvasSettings.backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        updatePreview()
      }
      img.src = history[historyIndex - 1]
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        ctx.fillStyle = canvasSettings.backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        updatePreview()
      }
      img.src = history[historyIndex + 1]
    }
  }

  const saveCanvasAssinatura = async () => {
    if (!formData.nome) {
      toast({
        title: "Erro",
        description: "Nome da assinatura é obrigatório",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Por favor, faça login novamente.",
        variant: "destructive",
      })
      return
    }

    const previewCanvas = previewCanvasRef.current
    if (!previewCanvas) return

    const dataURL = previewCanvas.toDataURL("image/png")

    try {
      const { error } = await supabase.from("assinaturas").insert({
        user_id: user.id,
        nome: formData.nome,
        data_assinatura: {
          canvasData: dataURL,
        },
        largura: previewCanvas.width,
        altura: previewCanvas.height,
      })

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Assinatura criada com sucesso",
      })

      router.push("/assinaturas")
    } catch (error: any) {
      console.error("Erro ao salvar assinatura:", error)
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar assinatura",
        variant: "destructive",
      })
    }
  }

  // Componente para seletor de cor
  const ColorPicker = ({
    color,
    onChange,
    pickerId,
    label,
  }: {
    color: string
    onChange: (color: string) => void
    pickerId: string
    label: string
  }) => (
    <div className="relative color-picker-container">
      <Label className="text-sm text-gray-300 mb-3 block">{label}</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveColorPicker(activeColorPicker === pickerId ? null : pickerId)}
          className="w-10 h-10 rounded-lg border-2 border-gray-600 shadow-lg transition-all hover:scale-105 relative"
          style={{
            backgroundColor: color === "transparent" ? "#ffffff" : color,
            backgroundImage:
              color === "transparent"
                ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                : "none",
            backgroundSize: color === "transparent" ? "8px 8px" : "auto",
            backgroundPosition: color === "transparent" ? "0 0, 0 4px, 4px -4px, -4px 0px" : "auto",
          }}
        >
          {color === "transparent" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-red-500 rotate-45"></div>
            </div>
          )}
        </button>
        <Input
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-800 border-gray-600 text-center font-mono flex-1"
          placeholder={color === "transparent" ? "transparent" : "#000000"}
        />
      </div>
      {activeColorPicker === pickerId && (
        <div className="absolute top-16 left-0 z-[9999] p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl">
          <HexColorPicker
            color={color === "transparent" ? "#ffffff" : color}
            onChange={onChange}
            style={{ width: "200px", height: "150px" }}
          />
          <div className="mt-3 flex gap-2">
            {pickerId.includes("background") && (
              <button
                onClick={() => {
                  onChange("transparent")
                  setActiveColorPicker(null)
                }}
                className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 flex-1"
              >
                Transparente
              </button>
            )}
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
  )

  const canUndo = useMemo(() => historyIndex > 0, [historyIndex])
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length])

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400 transition-colors"
                onClick={() => router.push("/assinaturas")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-2xl font-bold text-white">Desenhar Assinatura</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400 transition-colors"
                onClick={handleClearCanvas}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpar
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                onClick={saveCanvasAssinatura}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Assinatura
              </Button>
            </div>
          </div>

          {/* Nome da Assinatura */}
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <Label className="text-sm font-medium text-gray-300 mb-2 block">
              Nome da Assinatura
            </Label>
            <Input
              type="text"
              placeholder="Digite um nome para sua assinatura"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Canvas Principal */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Área de Desenho</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 hover:border-orange-500 hover:text-orange-500 transition-colors"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-700 hover:border-orange-500 hover:text-orange-500 transition-colors"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="border-2 border-gray-700 cursor-crosshair rounded-lg shadow-lg w-full touch-none bg-black"
                  style={{
                    backgroundColor: canvasSettings.transparente ? "#ffffff" : canvasSettings.backgroundColor,
                    height: "400px",
                    width: "100%",
                    backgroundImage: canvasSettings.transparente ? "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)" : "none",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
                  {canvasSettings.filtro === "normal" ? "Modo Normal" : `Filtro: ${canvasSettings.filtro}`}
                  {canvasSettings.transparente && " (Transparente)"}
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <h2 className="text-lg font-medium text-white mb-4">Preview</h2>
              <div className="relative">
                <canvas
                  ref={previewCanvasRef}
                  className="border-2 border-gray-700 rounded-lg shadow-lg w-full touch-none bg-black"
                  style={{
                    backgroundColor: canvasSettings.transparente ? "#ffffff" : canvasSettings.backgroundColor,
                    height: "200px",
                    width: "100%",
                    backgroundImage: canvasSettings.transparente ? "linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)" : "none",
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
                  Visualização
                  {canvasSettings.transparente && " (Transparente)"}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-6">
            {/* Cores e Estilo */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <h2 className="text-lg font-medium text-white mb-4">Cores e Estilo</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">
                    Cor do Traço
                  </Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-700 cursor-pointer"
                      style={{ backgroundColor: canvasSettings.cor }}
                      onClick={() => setActiveColorPicker("canvas-stroke")}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 hover:border-orange-500 hover:text-orange-500 transition-colors"
                      onClick={() => {
                        setCanvasSettings(prev => ({
                          ...prev,
                          cor: prev.cor === "#ffffff" ? "#000000" : "#ffffff"
                        }))
                      }}
                    >
                      <Contrast className="w-4 h-4 mr-2" />
                      Inverter Cor
                    </Button>
                  </div>
                  {activeColorPicker === "canvas-stroke" && (
                    <div className="absolute z-50 mt-2 p-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
                      <HexColorPicker
                        color={canvasSettings.cor}
                        onChange={(color) => setCanvasSettings(prev => ({ ...prev, cor: color }))}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">
                    Espessura do Traço
                  </Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[canvasSettings.espessura]}
                      onValueChange={([value]) => setCanvasSettings(prev => ({ ...prev, espessura: value }))}
                      max={10}
                      min={1}
                      step={0.5}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-8 text-center">
                      {canvasSettings.espessura}px
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-300 mb-2 block">
                    Fundo
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={canvasSettings.transparente ? "default" : "outline"}
                      className={canvasSettings.transparente
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "border-gray-700 hover:border-orange-500 hover:text-orange-500"}
                      onClick={() => setCanvasSettings(prev => ({
                        ...prev,
                        transparente: true
                      }))}
                    >
                      Transparente
                    </Button>
                    <Button
                      variant={!canvasSettings.transparente && canvasSettings.backgroundColor === "#ffffff" ? "default" : "outline"}
                      className={!canvasSettings.transparente && canvasSettings.backgroundColor === "#ffffff"
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "border-gray-700 hover:border-orange-500 hover:text-orange-500"}
                      onClick={() => setCanvasSettings(prev => ({
                        ...prev,
                        backgroundColor: "#ffffff",
                        transparente: false
                      }))}
                    >
                      Branco
                    </Button>
                    <Button
                      variant={!canvasSettings.transparente && canvasSettings.backgroundColor === "#000000" ? "default" : "outline"}
                      className={!canvasSettings.transparente && canvasSettings.backgroundColor === "#000000"
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "border-gray-700 hover:border-orange-500 hover:text-orange-500"}
                      onClick={() => setCanvasSettings(prev => ({
                        ...prev,
                        backgroundColor: "#000000",
                        transparente: false
                      }))}
                    >
                      Preto
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <h2 className="text-lg font-medium text-white mb-4">Filtros</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={canvasSettings.filtro === "normal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCanvasSettings(prev => ({ ...prev, filtro: "normal" }))}
                >
                  Normal
                </Button>
                <Button
                  variant={canvasSettings.filtro === "traçado" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCanvasSettings(prev => ({ ...prev, filtro: "traçado" }))}
                >
                  Traçado
                </Button>
                <Button
                  variant={canvasSettings.filtro === "negativo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCanvasSettings(prev => ({ ...prev, filtro: "negativo" }))}
                >
                  Negativo
                </Button>
                <Button
                  variant={canvasSettings.filtro === "blur" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCanvasSettings(prev => ({ ...prev, filtro: "blur" }))}
                >
                  Blur
                </Button>
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 hover:border-orange-500 hover:text-orange-500 transition-colors"
                onClick={handleClearCanvas}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpar
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                onClick={saveCanvasAssinatura}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Assinatura
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default AssinaturaPage
