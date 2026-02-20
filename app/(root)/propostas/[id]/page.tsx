"use client"

import { Label } from "@/components/ui/label"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { processarVariaveis, type DadosProposta } from "@/lib/processarVariaveis"
import { ArrowLeft, Download, Eye, Edit, Trash2, Send, FileText } from "lucide-react"
import Link from "next/link"
import { DollarSign } from "lucide-react" // Import DollarSign here
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function VisualizarPropostaPage() {
  const [proposta, setProposta] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [modelo, setModelo] = useState<any>(null)
  const [modelos, setModelos] = useState<any[]>([])
  const [configuracoes, setConfiguracoes] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [mostrandoInstrucao, setMostrandoInstrucao] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    titulo: proposta?.titulo || "",
    cliente_id: proposta?.cliente_id || "",
    modelo_id: proposta?.modelo_id || "",
    data_vencimento: proposta?.data_vencimento ? proposta.data_vencimento.split("T")[0] : "",
    observacoes: proposta?.observacoes || "",
    desconto: proposta?.desconto || 0,
    acrescimo: proposta?.acrescimo || 0,
  })
  const [excluindo, setExcluindo] = useState(false);

  const { user } = useAuth()
  const { id } = useParams()
  const router = useRouter()
  const { toast } = useToast()

  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  useEffect(() => {
    if (user && id) {
      // Verificar se o ID é um UUID válido
      if (!isValidUUID(id as string)) {
        console.error("ID inválido:", id)
        // toast({
        //   title: "Erro",
        //   description: "ID da proposta inválido",
        //   variant: "destructive",
        // })
        router.push("/propostas")
        return
      }
      loadProposta()
    }
  }, [user, id, router])

  useEffect(() => {
    if (proposta) {
      setEditFormData({
        titulo: proposta.titulo || "",
        cliente_id: proposta.cliente_id || "",
        modelo_id: proposta.modelo_id || "",
        data_vencimento: proposta.data_vencimento ? proposta.data_vencimento.split("T")[0] : "",
        observacoes: proposta.observacoes || "",
        desconto: proposta.desconto || 0,
        acrescimo: proposta.acrescimo || 0,
      })
    }
  }, [proposta, isEditDialogOpen])

  const loadProposta = async () => {
    try {
      setLoading(true)
      console.log("Carregando proposta com ID:", id)

      // Carregar proposta
      const { data: propostaData, error: propostaError } = await supabase
        .from("propostas")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single()

      if (propostaError) {
        console.error("Erro ao carregar proposta:", propostaError)
        if (propostaError.code === "PGRST116") {
          // Nenhum resultado encontrado
          toast({
            title: "Proposta não encontrada",
            description: "A proposta que você está procurando não existe ou foi removida.",
            variant: "destructive",
          })
          router.push("/propostas")
          return
        }
        throw propostaError
      }

      if (!propostaData) {
        toast({
          title: "Proposta não encontrada",
          description: "A proposta que você está procurando não existe.",
          variant: "destructive",
        })
        router.push("/propostas")
        return
      }

      console.log("Proposta carregada:", propostaData)

      // Carregar cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", propostaData.cliente_id)
        .single()

      if (clienteError) {
        console.error("Erro ao carregar cliente:", clienteError)
        throw clienteError
      }

      // Carregar modelo se existir
      let modeloData = null
      if (propostaData.modelo_id) {
        const { data, error } = await supabase.from("modelos").select("*").eq("id", propostaData.modelo_id).single()

        if (!error) modeloData = data
      }

      // Carregar todos os modelos para o dropdown de edição
      const { data: modelosData, error: modelosError } = await supabase
        .from("modelos")
        .select("*")
        .eq("user_id", user?.id)
        .order("nome")

      if (modelosError) {
        console.error("Erro ao carregar modelos:", modelosError)
      }

      // Carregar configurações da empresa
      const { data: configData } = await supabase.from("configuracoes").select("*").eq("user_id", user?.id).single()

      setProposta(propostaData)
      setCliente(clienteData)
      setModelo(modeloData)
      setModelos(modelosData || [])
      setConfiguracoes(configData)
    } catch (error) {
      console.error("Erro ao carregar proposta:", error)
      toast({
        title: "Erro",
        description: `Falha ao carregar proposta: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        variant: "destructive",
      })
      router.push("/propostas")
    } finally {
      setLoading(false)
    }
  }

  const exportarProposta = async () => {
    if (!proposta || !cliente) return

    try {
      setExportando(true)

      const dadosProposta: DadosProposta = {
        proposta,
        cliente,
        servicos: proposta.servicos_selecionados || [],
        empresa: configuracoes || {},
      }

      let htmlContent = ""

      if (modelo && modelo.conteudo?.template) {
        // Usar modelo personalizado
        const template = modelo.conteudo.template

        // Verificar se o modelo tem a nova estrutura de páginas ou a antiga
        const paginas = template.paginas && Array.isArray(template.paginas) ? template.paginas : null
        const elementosAntigos = template.elementos && Array.isArray(template.elementos) ? template.elementos : null

        // Se não tem páginas nem elementos antigos, usar configurações padrão
        const configuracoes = template.configuracoes || {
          largura: "800px",
          altura: "auto",
          corFundo: "#ffffff",
          padding: "40px",
          fontFamily: "Arial, sans-serif",
        }

        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${proposta.titulo}</title>
            <meta charset="utf-8">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: ${configuracoes.fontFamily || "Arial, sans-serif"}; 
                background: #f5f5f5;
                color: #333;
              }
              .page { 
                width: 794px; 
                height: 1123px;
                margin: 0 auto 20px; 
                background: ${configuracoes.corFundo || "#ffffff"}; 
                padding: ${configuracoes.padding || "40px"}; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
              }
              .elemento {
                position: absolute;
              }
              .elemento img {
                max-width: 100%;
                max-height: 100%;
                display: block;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              table { 
                border-collapse: collapse; 
                width: 100%;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              @media print {
                body { background: white; padding: 0; }
                .page { 
                  box-shadow: none; 
                  margin: 0; 
                  width: 794px !important;
                  height: 1123px !important;
                  page-break-after: always;
                }
                .elemento img {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
            </style>
          </head>
          <body>
        `

        // Função para renderizar elementos de uma página
        const renderizarElementos = (elementos: any[], configuracoesPagina?: any) => {
          let htmlPagina = `
            <div class="page" style="
              background: ${configuracoesPagina?.corFundo || configuracoes.corFundo || "#ffffff"}; 
              padding: ${configuracoesPagina?.padding || configuracoes.padding || "40px"};
              font-family: ${configuracoesPagina?.fontFamily || configuracoes.fontFamily || "Arial, sans-serif"};
            ">
          `

                    elementos?.forEach((elemento: any) => {
            let conteudoProcessado = elemento.conteudo

            // Processar variáveis
            conteudoProcessado = processarVariaveis(conteudoProcessado, dadosProposta)

            const estiloElemento = `
              left: ${elemento.posicao.x}px;
              top: ${elemento.posicao.y}px;
              font-size: ${elemento.estilo.fontSize};
              font-weight: ${elemento.estilo.fontWeight};
              color: ${elemento.estilo.color};
              background-color: ${elemento.estilo.backgroundColor};
              text-align: ${elemento.estilo.textAlign};
              padding: ${elemento.estilo.padding};
              margin: ${elemento.estilo.margin};
              border-radius: ${elemento.estilo.borderRadius};
              border: ${elemento.estilo.border};
              width: ${elemento.estilo.width === "auto" ? "auto" : elemento.estilo.width};
              height: ${elemento.estilo.height === "auto" ? "auto" : elemento.estilo.height};
            `

            if (elemento.tipo === "imagem") {
              // Renderizar imagem (apenas base64)
              const imagemSrc = typeof elemento.conteudo === "string" ? elemento.conteudo : ""
              if (imagemSrc && imagemSrc.startsWith("data:image/")) {
                htmlPagina += `
                  <div class="elemento" style="${estiloElemento}">
                    <img 
                      src="${imagemSrc}" 
                      alt="Imagem da proposta"
                      style="
                        width: 100%; 
                        height: 100%; 
                        object-fit: cover; 
                        border-radius: ${elemento.estilo.borderRadius};
                        border: ${elemento.estilo.border};
                        display: block;
                      "
                    />
                  </div>
                `
              } else {
                // Placeholder se não houver imagem válida
                htmlPagina += `
                  <div class="elemento" style="${estiloElemento}">
                    <div style="
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 100%;
                      height: 100%;
                      background: #f0f0f0;
                      color: #666;
                      font-size: 12px;
                      border: 1px dashed #ccc;
                    ">
                      Imagem não definida
                    </div>
                  </div>
                `
              }
            } else if (elemento.tipo === "tabela") {
              htmlPagina += `
                <div class="elemento" style="${estiloElemento}">
                  ${processarVariaveis("{{servicos_tabela}}", dadosProposta)}
                </div>
              `
            } else if (elemento.tipo === "linha") {
              htmlPagina += `
                <div class="elemento" style="${estiloElemento}">
                  <hr style="border-color: ${elemento.estilo.color}; width: 100%;" />
                </div>
              `
            } else if (elemento.tipo === "espacador") {
              htmlPagina += `
                <div class="elemento" style="${estiloElemento}"></div>
              `
            } else {
              htmlPagina += `
                <div class="elemento" style="${estiloElemento}">
                  ${conteudoProcessado.replace(/\n/g, "<br>")}
                </div>
              `
            }
          })

          htmlPagina += `</div>`
          return htmlPagina
        }

        // Renderizar páginas ou elementos antigos
        if (paginas && paginas.length > 0) {
          // Nova estrutura com páginas
          paginas.forEach((pagina: any) => {
            htmlContent += renderizarElementos(pagina.elementos || [], pagina.configuracoes)
          })
        } else if (elementosAntigos && elementosAntigos.length > 0) {
          // Estrutura antiga - renderizar como uma única página
          htmlContent += renderizarElementos(elementosAntigos, configuracoes)
        } else {
          // Nenhum elemento encontrado - página vazia
          htmlContent += `
            <div class="page" style="
              background: ${configuracoes.corFundo || "#ffffff"}; 
              padding: ${configuracoes.padding || "40px"};
              font-family: ${configuracoes.fontFamily || "Arial, sans-serif"};
            ">
              <div style="text-align: center; padding: 50px; color: #666;">
                <h2>Modelo sem elementos</h2>
                <p>Este modelo não possui elementos para exibir.</p>
              </div>
            </div>
          `
        }

        htmlContent += `
          </body>
          </html>
        `
      } else {
        // Modelo padrão simples
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${proposta.titulo}</title>
            <meta charset="utf-8">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                background: #f5f5f5;
                color: #333;
                line-height: 1.6;
              }
                             .page { 
                 width: 794px; 
                 height: 1123px;
                 margin: 0 auto; 
                 background: white; 
                 padding: 40px; 
                 box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                 position: relative;
                 overflow: hidden;
               }
              .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid #FF6F00;
                padding-bottom: 20px;
              }
              .section {
                margin-bottom: 30px;
              }
              .section h2 {
                color: #FF6F00;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
              }
              table { 
                border-collapse: collapse; 
                width: 100%;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
                font-weight: bold;
              }
              .total {
                font-size: 1.2em;
                font-weight: bold;
                color: #FF6F00;
              }
                             @media print {
                 body { background: white; padding: 0; }
                 .page { 
                   box-shadow: none; 
                   margin: 0; 
                   width: 794px !important;
                   height: 1123px !important;
                   page-break-after: always;
                 }
               }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="header">
                <h1>PROPOSTA COMERCIAL</h1>
                <p><strong>${proposta.numero}</strong></p>
              </div>

              <div class="section">
                <h2>Informações da Proposta</h2>
                <p><strong>Título:</strong> ${proposta.titulo}</p>
                <p><strong>Data:</strong> ${new Date(proposta.created_at).toLocaleDateString("pt-BR")}</p>
                <p><strong>Validade:</strong> ${new Date(proposta.data_vencimento).toLocaleDateString("pt-BR")}</p>
                <p><strong>Status:</strong> ${proposta.status}</p>
              </div>

              <div class="section">
                <h2>Cliente</h2>
                <p><strong>Nome:</strong> ${cliente.nome}</p>
                ${cliente.empresa ? `<p><strong>Empresa:</strong> ${cliente.empresa}</p>` : ""}
                <p><strong>Email:</strong> ${cliente.email}</p>
                ${cliente.telefone ? `<p><strong>Telefone:</strong> ${cliente.telefone}</p>` : ""}
              </div>

              <div class="section">
                <h2>Serviços</h2>
                ${processarVariaveis("{{servicos_tabela}}", dadosProposta)}
              </div>

              <div class="section">
                <h2>Resumo Financeiro</h2>
                <p><strong>Subtotal:</strong> ${processarVariaveis("{{valor_subtotal}}", dadosProposta)}</p>
                ${proposta.desconto > 0 ? `<p><strong>Desconto (${proposta.desconto}%):</strong> -${processarVariaveis("{{valor_desconto}}", dadosProposta)}</p>` : ""}
                ${proposta.acrescimo > 0 ? `<p><strong>Acréscimo (${proposta.acrescimo}%):</strong> +${processarVariaveis("{{valor_acrescimo}}", dadosProposta)}</p>` : ""}
                <p class="total"><strong>Total:</strong> ${processarVariaveis("{{valor_total}}", dadosProposta)}</p>
              </div>

              ${proposta.observacoes
            ? `
                <div class="section">
                  <h2>Observações</h2>
                  <p>${proposta.observacoes.replace(/\n/g, "<br>")}</p>
                </div>
              `
            : ""
          }

              <div class="section">
                <p><em>Proposta gerada em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</em></p>
              </div>
            </div>
          </body>
          </html>
        `
      }

      // Mostrar modal de instrução
      setMostrandoInstrucao(true)

      // Aguardar 3 segundos antes de abrir o preview
      setTimeout(() => {
        setMostrandoInstrucao(false)

        // Abrir em nova janela para visualização/impressão
        const previewWindow = window.open("", "_blank", "width=900,height=700")
        if (previewWindow) {
          previewWindow.document.write(htmlContent)
          previewWindow.document.close()
        }
      }, 3000)

      toast({
        title: "Sucesso!",
        description: "Proposta exportada com sucesso",
      })
    } catch (error) {
      console.error("Erro ao exportar proposta:", error)
      toast({
        title: "Erro",
        description: "Falha ao exportar proposta",
        variant: "destructive",
      })
      setMostrandoInstrucao(false)
    } finally {
      setExportando(false)
    }
  }

  // Função para editar proposta
  const handleEditarProposta = async () => {
    if (!editFormData.titulo || !editFormData.cliente_id || !editFormData.data_vencimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios (título, cliente, data de vencimento)",
        variant: "destructive",
      })
      return
    }
    try {
      // Recalcular subtotal e valor_total
      const subtotal = proposta.subtotal || 0;
      const desconto = (subtotal * editFormData.desconto) / 100;
      const acrescimo = (subtotal * editFormData.acrescimo) / 100;
      const valor_total = subtotal - desconto + acrescimo;

      const { error } = await supabase
        .from("propostas")
        .update({
          titulo: editFormData.titulo,
          cliente_id: editFormData.cliente_id,
          modelo_id: editFormData.modelo_id || null,
          data_vencimento: editFormData.data_vencimento,
          observacoes: editFormData.observacoes,
          desconto: editFormData.desconto,
          acrescimo: editFormData.acrescimo,
          subtotal,
          valor_total,
        })
        .eq("id", proposta.id)
        .eq("user_id", user?.id)

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Proposta atualizada com sucesso.",
      })
      setIsEditDialogOpen(false)
      await loadProposta()
    } catch (error) {
      console.error("Erro ao editar proposta:", error)
      toast({
        title: "Erro",
        description: `Falha ao editar proposta: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        variant: "destructive",
      })
    }
  }

  // Função para duplicar proposta
  const handleDuplicarProposta = async () => {
    if (!proposta) return;
    try {
      // Gerar novo número e data de vencimento padrão (30 dias à frente)
      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, "0");
      const dia = String(agora.getDate()).padStart(2, "0");
      const hora = String(agora.getHours()).padStart(2, "0");
      const minuto = String(agora.getMinutes()).padStart(2, "0");
      const segundo = String(agora.getSeconds()).padStart(2, "0");
      const numero = `PROP-${ano}${mes}${dia}-${hora}${minuto}${segundo}`;
      const novaDataVencimento = new Date();
      novaDataVencimento.setDate(novaDataVencimento.getDate() + 30);
      const data_vencimento = novaDataVencimento.toISOString().split("T")[0];

      const novaProposta = {
        user_id: user?.id,
        numero,
        titulo: proposta.titulo,
        cliente_id: proposta.cliente_id,
        modelo_id: proposta.modelo_id || null,
        servicos_selecionados: proposta.servicos_selecionados,
        valor_total: proposta.valor_total,
        subtotal: proposta.subtotal,
        desconto: proposta.desconto,
        acrescimo: proposta.acrescimo,
        status: "rascunho",
        data_vencimento,
        observacoes: proposta.observacoes || null,
      };
      const { data, error } = await supabase.from("propostas").insert([novaProposta]).select("id").single();
      if (error) throw error;
      toast({
        title: "Proposta duplicada!",
        description: "A proposta foi duplicada com sucesso.",
      });
      if (data && data.id) {
        router.push(`/propostas/${data.id}`);
      }
    } catch (error) {
      console.error("Erro ao duplicar proposta:", error);
      toast({
        title: "Erro",
        description: `Falha ao duplicar proposta: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        variant: "destructive",
      });
    }
  };

  const handleExcluirProposta = async () => {
    if (!proposta) return;
    if (!window.confirm("Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.")) return;
    setExcluindo(true);
    try {
      const { error } = await supabase.from("propostas").delete().eq("id", proposta.id).eq("user_id", user?.id);
      if (error) throw error;
      toast({
        title: "Sucesso!",
        description: "Proposta excluída com sucesso.",
      });
      router.push("/propostas");
    } catch (error) {
      console.error("Erro ao excluir proposta:", error);
      toast({
        title: "Erro",
        description: `Falha ao excluir proposta: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        variant: "destructive",
      });
    } finally {
      setExcluindo(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "rascunho":
        return "bg-gray-500"
      case "enviada":
        return "bg-blue-500"
      case "aceita":
        return "bg-green-500"
      case "rejeitada":
        return "bg-red-500"
      case "expirada":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!proposta) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Proposta não encontrada</h2>
        <p className="text-gray-400 mb-4">A proposta que você está procurando não existe ou foi removida.</p>
        <Link href="/propostas">
          <Button variant="outline">Voltar para Propostas</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/propostas">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{proposta.titulo}</h1>
            <p className="text-gray-400">Proposta #{proposta.numero}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={exportarProposta} disabled={exportando} variant="outline" className="border-gray-600">
            <Download className="w-4 h-4 mr-2" />
            {exportando ? "Exportando..." : "Exportar"}
          </Button>
          {/* <Button className="bg-orange-600 hover:bg-orange-700">
            <Send className="w-4 h-4 mr-2" />
            Enviar por Email
          </Button> */}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status e Informações Básicas */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Informações da Proposta
                <Badge className={`${getStatusColor(proposta.status)} text-white`}>
                  {proposta.status.charAt(0).toUpperCase() + proposta.status.slice(1)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-400">Número</Label>
                  <p className="text-white font-medium">{proposta.numero}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Data de Criação</Label>
                  <p className="text-white">{new Date(proposta.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Data de Vencimento</Label>
                  <p className="text-white">{new Date(proposta.data_vencimento).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-400">Modelo Usado</Label>
                  <p className="text-white">{modelo ? modelo.nome : "Modelo Padrão"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm text-gray-400">Nome</Label>
                <p className="text-white font-medium">{cliente.nome}</p>
              </div>
              {cliente.empresa && (
                <div>
                  <Label className="text-sm text-gray-400">Empresa</Label>
                  <p className="text-white">{cliente.empresa}</p>
                </div>
              )}
              <div>
                <Label className="text-sm text-gray-400">Email</Label>
                <p className="text-white">{cliente.email}</p>
              </div>
              {cliente.telefone && (
                <div>
                  <Label className="text-sm text-gray-400">Telefone</Label>
                  <p className="text-white">{cliente.telefone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Serviços */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposta.servicos_selecionados?.map((servico: any, index: number) => (
                  <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-white">{servico.nome}</h4>
                      <span className="text-orange-400 font-medium">
                        R${" "}
                        {((servico.valor_personalizado || servico.valor_base) * servico.quantidade).toLocaleString(
                          "pt-BR",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                    {servico.descricao && <p className="text-sm text-gray-400 mb-2">{servico.descricao}</p>}
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Quantidade: {servico.quantidade}</span>
                      <span>
                        Valor unitário: R${" "}
                        {(servico.valor_personalizado || servico.valor_base).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {servico.observacoes && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <Label className="text-xs text-gray-400">Observações:</Label>
                        <p className="text-sm text-gray-300">{servico.observacoes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          {proposta.observacoes && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 whitespace-pre-wrap">{proposta.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Resumo Financeiro */}
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">
                    R$ {proposta.subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {proposta.desconto > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-400">Desconto ({proposta.desconto}%):</span>
                    <span className="text-red-400">
                      -R${" "}
                      {((proposta.subtotal * proposta.desconto) / 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {proposta.acrescimo > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-400">Acréscimo ({proposta.acrescimo}%):</span>
                    <span className="text-green-400">
                      +R${" "}
                      {((proposta.subtotal * proposta.acrescimo) / 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-white">Total:</span>
                    <span className="font-bold text-xl text-orange-400">
                      R$ {proposta.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={exportarProposta}
                disabled={exportando}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                {exportando ? "Exportando..." : "Visualizar/Imprimir"}
              </Button>

              <Button variant="outline" className="w-full border-gray-600" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar Proposta
              </Button>

              <Button variant="outline" className="w-full border-gray-600" onClick={handleDuplicarProposta}>
                <Eye className="w-4 h-4 mr-2" />
                Duplicar Proposta
              </Button>

              <Button onClick={handleExcluirProposta} variant="outline" className="w-full border-red-600 text-red-400 hover:bg-red-600/10" disabled={excluindo}>
                <Trash2 className="w-4 h-4 mr-2" />
                {excluindo ? "Excluindo..." : "Excluir Proposta"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Modal de Instrução */}
      {mostrandoInstrucao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Abrindo Preview</h3>
              <p className="text-gray-300 mb-4">Uma nova janela será aberta com o preview da proposta.</p>
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                <p className="text-orange-400 font-medium mb-2">💡 Dica de Impressão:</p>
                <p className="text-gray-300 text-sm">
                  Na página que abrir, pressione{" "}
                  <kbd className="bg-gray-700 px-2 py-1 rounded text-orange-400 font-mono">Ctrl + P</kbd> para imprimir
                  ou salvar como PDF
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              <span className="ml-2 text-gray-400">Preparando...</span>
            </div>
          </div>
        </div>
      )}
      {/* Dialog de Edição de Proposta */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Editar Proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="titulo">Título da Proposta *</Label>
              <Input
                id="titulo"
                value={editFormData.titulo}
                onChange={e => setEditFormData({ ...editFormData, titulo: e.target.value })}
                className="bg-gray-800 border-gray-600"
                placeholder="Ex: Desenvolvimento de Site Institucional"
              />
            </div>
            <div>
              <Label htmlFor="cliente">Cliente *</Label>
              <Select
                value={editFormData.cliente_id}
                onValueChange={value => setEditFormData({ ...editFormData, cliente_id: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {cliente && (
                    <SelectItem value={cliente.id} className="text-gray-300">
                      {cliente.nome} {cliente.empresa && `- ${cliente.empresa}`}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="modelo">Modelo de Proposta</Label>
              <Select
                value={editFormData.modelo_id}
                onValueChange={value => setEditFormData({ ...editFormData, modelo_id: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Selecione um modelo (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {modelos.map((modelo) => (
                    <SelectItem key={modelo.id} value={modelo.id} className="text-gray-300">
                      {modelo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {modelos.length === 0 && (
                <p className="text-sm text-gray-500">
                  Nenhum modelo encontrado.
                  <Link href="/modelos" className="text-orange-400 hover:underline ml-1">
                    Crie um modelo primeiro
                  </Link>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="data_vencimento">Data de Vencimento</Label>
              <Input
                id="data_vencimento"
                type="date"
                value={editFormData.data_vencimento}
                onChange={e => setEditFormData({ ...editFormData, data_vencimento: e.target.value })}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={editFormData.observacoes}
                onChange={e => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                className="bg-gray-800 border-gray-600"
                rows={3}
                placeholder="Observações gerais da proposta, condições de pagamento, prazos especiais, etc..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="desconto">Desconto (%)</Label>
                <Input
                  id="desconto"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editFormData.desconto}
                  onChange={e => setEditFormData({ ...editFormData, desconto: Number.parseFloat(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div>
                <Label htmlFor="acrescimo">Acréscimo (%)</Label>
                <Input
                  id="acrescimo"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editFormData.acrescimo}
                  onChange={e => setEditFormData({ ...editFormData, acrescimo: Number.parseFloat(e.target.value) || 0 })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className="border-gray-600" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleEditarProposta}>
              Editar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
