"use client"

import { useEffect, useState, useCallback, useMemo, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone, User, Calendar, Users, Save, X, Eye } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Cliente {
  id: string
  nome: string
  empresa?: string
  email: string
  telefone?: string
  created_at: string
  updated_at: string
}

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

// Componente de Card do Cliente memoizado
const ClienteCard = memo(({
  cliente,
  onEdit,
  onDelete
}: {
  cliente: Cliente
  onEdit: (cliente: Cliente) => void
  onDelete: (cliente: Cliente) => void
}) => {
  return (
    <Card
      className="bg-gray-900 border-gray-700 hover:border-orange-500/50 transition-all duration-300 group cursor-pointer card-hover"
      onClick={() => window.location.href = `/clientes/${cliente.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div
            className="flex-1 cursor-pointer"
            onClick={() => window.location.href = `/clientes/${cliente.id}`}
          >
            <CardTitle className="text-white text-lg group-hover:text-orange-400 transition-colors">
              {cliente.nome}
            </CardTitle>
            {cliente.empresa && (
              <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Building2 className="w-3 h-3 mr-1" />
                {cliente.empresa}
              </Badge>
            )}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.location.href = `/clientes/${cliente.id}`
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver detalhes do cliente</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent
        className="space-y-3 cursor-pointer"

      >
        <div className="flex items-center text-gray-300 text-sm">
          <Mail className="w-4 h-4 mr-2 text-gray-500" />
          {cliente.email}
        </div>
        {cliente.telefone && (
          <div className="flex items-center text-gray-300 text-sm">
            <Phone className="w-4 h-4 mr-2 text-gray-500" />
            {cliente.telefone}
          </div>
        )}
        <div className="flex items-center justify-center pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-500 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date(cliente.created_at).toLocaleDateString("pt-BR")}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ClienteCard.displayName = "ClienteCard"

// Componente de Formulário memoizado
const ClienteForm = memo(({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  saving,
  editingCliente
}: {
  formData: FormData
  setFormData: (data: FormData) => void
  onSubmit: () => void
  onCancel: () => void
  saving: boolean
  editingCliente: Cliente | null
}) => {
  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      onSubmit()
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
          autoFocus
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, telefone: e.target.value })}
          className="bg-gray-800 border-gray-600 focus:border-orange-500"
          placeholder="(11) 99999-9999"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          className="flex-1 bg-orange-600 hover:bg-orange-700"
          disabled={saving}
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {editingCliente ? "Atualizar" : "Criar"}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          className="border-gray-600"
          disabled={saving}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
})

ClienteForm.displayName = "ClienteForm"

// Componente principal memoizado
const ClientesPage = memo(function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const [formData, setFormData] = useState<FormData>(initialFormData)

  const loadClientes = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id, toast])

  useEffect(() => {
    loadClientes()
  }, [loadClientes])

  const handleEdit = useCallback((cliente: Cliente) => {
    setEditingCliente(cliente)
    setFormData({
      nome: cliente.nome,
      empresa: cliente.empresa || "",
      email: cliente.email,
      telefone: cliente.telefone || "",
    })
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback((cliente: Cliente) => {
    setClienteToDelete(cliente)
    setIsDeleteDialogOpen(true)
  }, [])

  const deleteCliente = useCallback(async (cliente: Cliente) => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", cliente.id)
        .eq("user_id", user.id)

      if (error) throw error

      await loadClientes()
      toast({
        title: "Cliente removido",
        description: "Cliente foi removido com sucesso",
      })
    } catch (error) {
      console.error("Erro ao deletar cliente:", error)
      toast({
        title: "Erro",
        description: "Não foi possível remover o cliente. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setClienteToDelete(null)
    }
  }, [user?.id, loadClientes, toast])

  const handleSave = useCallback(async () => {
    if (!user?.id) return

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
      const clienteData = {
        nome: formData.nome.trim(),
        empresa: formData.empresa.trim() || null,
        email: formData.email.trim(),
        telefone: formData.telefone.replace(/\D/g, "") || null,
        updated_at: new Date().toISOString(),
      }

      if (editingCliente) {
        const { error } = await supabase
          .from("clientes")
          .update(clienteData)
          .eq("id", editingCliente.id)
          .eq("user_id", user.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("clientes").insert({
          ...clienteData,
          user_id: user.id,
        })

        if (error) throw error
      }

      await loadClientes()
      setIsDialogOpen(false)
      setEditingCliente(null)
      resetForm()

      toast({
        title: "Sucesso!",
        description: editingCliente ? "Cliente atualizado com sucesso" : "Cliente criado com sucesso",
      })
    } catch (error) {
      console.error("Erro ao salvar cliente:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cliente. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [user?.id, formData, editingCliente, loadClientes, toast])

  const resetForm = () => {
    setFormData(initialFormData)
  }

  const filteredClientes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return clientes.filter(
      (cliente) =>
        cliente.nome.toLowerCase().includes(term) ||
        cliente.email.toLowerCase().includes(term) ||
        (cliente.empresa && cliente.empresa.toLowerCase().includes(term))
    )
  }, [clientes, searchTerm])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Clientes</h1>
          <p className="text-gray-400">Gerencie seus clientes e contatos</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingCliente(null)
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                setEditingCliente(null)
                resetForm()
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center">
                <User className="w-6 h-6 mr-2 text-orange-500" />
                {editingCliente ? "Editar Cliente" : "Novo Cliente"}
              </DialogTitle>
            </DialogHeader>

            <ClienteForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSave}
              onCancel={() => setIsDialogOpen(false)}
              saving={saving}
              editingCliente={editingCliente}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600"
          />
        </div>

        <div className="text-sm text-gray-400 flex items-center">
          <Users className="w-4 h-4 mr-2" />
          {filteredClientes.length} cliente{filteredClientes.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClientes.map((cliente) => (
          <ClienteCard
            key={cliente.id}
            cliente={cliente}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredClientes.length === 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? "Tente ajustar os termos de busca" : "Comece adicionando seus primeiros clientes"}
            </p>
            {!searchTerm && (
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir o cliente {clienteToDelete?.nome}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (clienteToDelete && user?.id) {
                  deleteCliente(clienteToDelete)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})

ClientesPage.displayName = "ClientesPage"

export default ClientesPage

