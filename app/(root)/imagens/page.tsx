"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Search, Trash2, Download, Upload, ImageIcon, Copy, Eye } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

interface Imagem {
  id: string
  nome: string
  url: string
  createdAt: string
}

export default function ImagensPage() {
  const [imagens, setImagens] = useState<Imagem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<Imagem | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [formData, setFormData] = useState({
    nome: "",
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()


  useEffect(() => {
    if (user) {
      loadImagens()
    }
  }, [user])

  const loadImagens = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase.from("imagens").select("*").eq("user_id", user.id)

      if (error) throw error

      // Mapear dados do Supabase para o formato esperado
      const imagensFormatadas = (data || []).map((img: any) => ({
        id: img.id,
        nome: img.nome,
        url: img.url || "",
        createdAt: img.created_at || new Date().toISOString(),
      }))

      setImagens(imagensFormatadas)
    } catch (error) {
      console.error("Erro ao carregar imagens:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar imagens",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Máximo 5MB",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const url = e.target?.result as string
      setImagePreview(url)
    }
    reader.readAsDataURL(file)
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const saveImagem = async () => {
    if (!formData.nome || !selectedFile) {
      toast({
        title: "Erro",
        description: "Nome e imagem são obrigatórios",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)
      const base64Image = await convertFileToBase64(selectedFile)

      const { error } = await supabase.from("imagens").insert([
        {
          user_id: user?.id,
          nome: formData.nome,
          url: base64Image,
        },
      ])

      if (error) throw error

      await loadImagens()
      setIsDialogOpen(false)
      resetForm()

      toast({
        title: "Sucesso!",
        description: "Imagem enviada com sucesso",
      })
    } catch (error) {
      console.error("Erro ao salvar imagem:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar imagem",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const deleteImagem = async (id: string) => {
    try {
      const { error } = await supabase.from("imagens").delete().eq("id", id).eq("user_id", user?.id)

      if (error) throw error

      await loadImagens()

      toast({
        title: "Imagem removida",
        description: "Imagem foi removida com sucesso",
      })
    } catch (error) {
      console.error("Erro ao deletar imagem:", error)
      toast({
        title: "Erro",
        description: "Erro ao remover imagem",
        variant: "destructive",
      })
    }
  }

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: "URL copiada",
      description: "URL da imagem copiada para a área de transferência",
    })
  }

  const downloadImage = (imagem: Imagem) => {
    const link = document.createElement("a")
    link.href = imagem.url
    link.download = imagem.nome
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetForm = () => {
    setFormData({
      nome: "",
    })
    setSelectedFile(null)
    setImagePreview(null)
  }

  const filteredImagens = imagens.filter((imagem) => {
    return imagem.nome.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Biblioteca de Imagens</h1>
            <p className="text-gray-400">Carregando suas imagens...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Biblioteca de Imagens</h1>
          <p className="text-gray-400">Gerencie logos, assinaturas e imagens para suas propostas</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Imagem
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Enviar Nova Imagem</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Imagem *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                  placeholder="Ex: Logo da Empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arquivo">Arquivo de Imagem *</Label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <p className="text-gray-400 text-sm">Imagem selecionada</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 mb-2">Clique para selecionar ou arraste uma imagem</p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF até 5MB</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="mt-2 w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveImagem} disabled={uploading} className="flex-1 bg-orange-600 hover:bg-orange-700">
                  {uploading ? "Salvando..." : "Salvar Imagem"}
                </Button>
                <Button onClick={() => setIsDialogOpen(false)} variant="outline" className="flex-1 border-gray-600">
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar imagens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600"
          />
        </div>

        <div className="text-sm text-gray-400 flex items-center">
          <ImageIcon className="w-4 h-4 mr-2" />
          {filteredImagens.length} imagem{filteredImagens.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Imagens Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredImagens.map((imagem) => (
          <Card
            key={imagem.id}
            className="bg-gray-900 border-gray-700 hover:border-orange-500/50 transition-all duration-300 group overflow-hidden"
          >
            <div className="relative">
              <img
                src={imagem.url || "/placeholder.svg"}
                alt={imagem.nome}
                className="w-full h-48 object-cover cursor-pointer"
                onClick={() => {
                  setSelectedImage(imagem)
                  setIsPreviewOpen(true)
                }}
              />
            </div>

            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-medium text-white truncate">{imagem.nome}</h3>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(imagem.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedImage(imagem)
                    setIsPreviewOpen(true)
                  }}
                  className="text-gray-400 hover:text-white flex-1"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyImageUrl(imagem.url)}
                  className="text-gray-400 hover:text-white flex-1"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadImage(imagem)}
                  className="text-gray-400 hover:text-white flex-1"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteImagem(imagem.id)}
                  className="text-red-400 hover:text-red-300 flex-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredImagens.length === 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {searchTerm ? "Nenhuma imagem encontrada" : "Nenhuma imagem enviada"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? "Tente ajustar os filtros de busca"
                : "Envie logos, assinaturas e outras imagens para usar em suas propostas"}
            </p>
            {!searchTerm && (
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Enviar Primeira Imagem
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedImage?.nome}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url || "/placeholder.svg"}
                  alt={selectedImage.nome}
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Criado em:</span>
                  <span className="text-white ml-2">
                    {new Date(selectedImage.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => copyImageUrl(selectedImage.url)} variant="outline" className="border-gray-600">
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar URL
                </Button>
                <Button onClick={() => downloadImage(selectedImage)} className="bg-orange-600 hover:bg-orange-700">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
