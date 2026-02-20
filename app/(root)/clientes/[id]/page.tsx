"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Mail, Phone, Building, Calendar, FileText, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import type { Cliente, Proposta } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface FormData {
  nome: string
  empresa: string
  email: string
  telefone: string
}

const initialFormData: FormData = {
  nome: "",
  empresa: "",
  email: "",
  telefone: "",
}

export default function ClienteDetalhes() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [saving, setSaving] = useState(false)



  useEffect(() => {
    if (user && params.id) {
      fetchClienteData()
    }
  }, [user, params.id])

  const fetchClienteData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar dados do cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user?.id)
        .single()

      if (clienteError) {
        throw new Error("Cliente não encontrado")
      }

      setCliente(clienteData)

      // Buscar propostas do cliente
      const { data: propostasData, error: propostasError } = await supabase
        .from("propostas")
        .select("*")
        .eq("cliente_id", params.id)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (propostasError) {
        console.error("Erro ao buscar propostas:", propostasError)
      } else {
        setPropostas(propostasData || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aceita":
        return "bg-green-500"
      case "rejeitada":
        return "bg-red-500"
      case "enviada":
        return "bg-blue-500"
      case "expirada":
        return "bg-gray-500"
      default:
        return "bg-yellow-500"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "aceita":
        return "Aceita"
      case "rejeitada":
        return "Rejeitada"
      case "enviada":
        return "Enviada"
      case "expirada":
        return "Expirada"
      default:
        return "Rascunho"
    }
  }

  const propostasAceitas = propostas.filter((p) => p.status === "aceita")
  const valorTotalFechado = propostasAceitas.reduce((total, proposta) => total + proposta.valor_total, 0)

  const handleEdit = useCallback(() => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        empresa: cliente.empresa || "",
        email: cliente.email,
        telefone: cliente.telefone || "",
      })
      setIsEditDialogOpen(true)
    }
  }, [cliente])

  const handleSave = useCallback(async () => {
    if (!user?.id || !cliente) return

    if (!formData.nome.trim() || !formData.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from("clientes")
        .update({
          nome: formData.nome.trim(),
          empresa: formData.empresa.trim() || null,
          email: formData.email.trim(),
          telefone: formData.telefone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cliente.id)
        .eq("user_id", user.id)

      if (error) throw error

      await fetchClienteData()
      setIsEditDialogOpen(false)
      toast({
        title: "Cliente atualizado",
        description: "As informações do cliente foram atualizadas com sucesso",
      })
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o cliente. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [user?.id, cliente, formData, fetchClienteData, toast])

  const handleDelete = useCallback(async () => {
    if (!user?.id || !cliente) return

    try {
      // Primeiro verifica se existem propostas vinculadas
      const { data: propostasVinculadas } = await supabase
        .from("propostas")
        .select("id")
        .eq("cliente_id", cliente.id)
        .eq("user_id", user.id)

      if (propostasVinculadas && propostasVinculadas.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Existem propostas vinculadas a este cliente. Remova as propostas primeiro.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", cliente.id)
        .eq("user_id", user.id)

      if (error) throw error

      toast({
        title: "Cliente removido",
        description: "O cliente foi removido com sucesso",
      })
      router.push("/clientes")
    } catch (error) {
      console.error("Erro ao deletar cliente:", error)
      toast({
        title: "Erro",
        description: "Não foi possível remover o cliente. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }, [user?.id, cliente, router, toast])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-red-400 mb-4">{error || "Cliente não encontrado"}</h2>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="border-gray-700 hover:border-orange-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Detalhes do Cliente</h1>
              <p className="text-gray-400">Informações completas e histórico de propostas</p>
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
                Editar Cliente
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informações do Cliente */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-orange-500" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{cliente.nome}</h3>
                  {cliente.empresa && <p className="text-gray-400 text-sm">{cliente.empresa}</p>}
                </div>

                <Separator className="bg-gray-700" />

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white">{cliente.email}</p>
                    </div>
                  </div>

                  {cliente.telefone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-sm text-gray-400">Telefone</p>
                        <p className="text-white">{cliente.telefone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-sm text-gray-400">Cliente desde</p>
                      <p className="text-white">{formatDate(cliente.created_at)}</p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* Estatísticas do Cliente */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-white">Estatísticas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-orange-500">{propostas.length}</p>
                      <p className="text-xs text-gray-400">Propostas</p>
                    </div>
                    <div className="text-center p-3 bg-gray-800 rounded-lg">
                      <p className="text-2xl font-bold text-green-500">{propostasAceitas.length}</p>
                      <p className="text-xs text-gray-400">Fechadas</p>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-gray-800 rounded-lg">
                    <p className="text-xl font-bold text-blue-500">{formatCurrency(valorTotalFechado)}</p>
                    <p className="text-xs text-gray-400">Valor Total Fechado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Propostas */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Histórico de Propostas ({propostas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {propostas.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Nenhuma proposta encontrada para este cliente</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {propostas.map((proposta) => (
                      <Card
                        key={proposta.id}
                        className="bg-gray-800 border-gray-700 hover:border-orange-500/50 transition-all duration-300"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-white">{proposta.titulo}</h4>
                              <Badge className={`${getStatusColor(proposta.status)} text-white`}>
                                {getStatusText(proposta.status)}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/propostas/${proposta.id}`)}
                              className="border-gray-600 hover:border-orange-500"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Número</p>
                              <p className="text-white font-medium">{proposta.numero}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Valor Total</p>
                              <p className="text-white font-medium">{formatCurrency(proposta.valor_total)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Data de Criação</p>
                              <p className="text-white font-medium">{formatDate(proposta.created_at)}</p>
                            </div>
                          </div>

                          {proposta.observacoes && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <p className="text-gray-400 text-sm">Observações:</p>
                              <p className="text-gray-300 text-sm">{proposta.observacoes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Editar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }} className="space-y-4">
              <div>
                <Label htmlFor="nome" className="text-sm text-gray-300 mb-2 block">
                  Nome Completo *
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="bg-gray-800 border-gray-600 focus:border-orange-500"
                  placeholder="João Silva"
                  required
                />
              </div>

              <div>
                <Label htmlFor="empresa" className="text-sm text-gray-300 mb-2 block">
                  Empresa
                </Label>
                <Input
                  id="empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  className="bg-gray-800 border-gray-600 focus:border-orange-500"
                  placeholder="Empresa ABC Ltda"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm text-gray-300 mb-2 block">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-gray-800 border-gray-600 focus:border-orange-500"
                  placeholder="joao@exemplo.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefone" className="text-sm text-gray-300 mb-2 block">
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="bg-gray-800 border-gray-600 focus:border-orange-500"
                  placeholder="(11) 99999-9999"
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
                Tem certeza que deseja excluir o cliente {cliente?.nome}? Esta ação não pode ser desfeita.
                {propostas.length > 0 && (
                  <p className="mt-2 text-red-400">
                    Atenção: Este cliente possui {propostas.length} proposta{propostas.length !== 1 ? "s" : ""} vinculada{propostas.length !== 1 ? "s" : ""}.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-600">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={propostas.length > 0}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
