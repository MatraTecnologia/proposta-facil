"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { processarVariaveis, type DadosProposta } from "@/lib/processarVariaveis"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Printer } from "lucide-react"

const renderizarModeloVisual = (modeloData: any, dadosProposta: any) => {
    try {
        const { template } = modeloData
        let html = `<div class="page" style="position:relative;width:${template?.configuracoes?.largura || "800px"};margin:0 auto;background:${template?.configuracoes?.corFundo || "#fff"};padding:${template?.configuracoes?.padding || "40px"};box-shadow:0 4px 6px rgba(0,0,0,0.1);min-height:600px;">`
        template.elementos?.forEach((elemento: any) => {
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
                position: absolute;`
            if (elemento.tipo === "imagem") {
                const imagemSrc = typeof elemento.conteudo === "string" ? elemento.conteudo : ""
                if (imagemSrc && imagemSrc.startsWith("data:image/")) {
                    html += `<div class="elemento" style="${estiloElemento}"><img src="${imagemSrc}" alt="Imagem da proposta" style="width:100%;height:100%;object-fit:cover;border-radius:${elemento.estilo.borderRadius};border:${elemento.estilo.border};display:block;" /></div>`
                } else {
                    html += `<div class="elemento" style="${estiloElemento}"><div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#f0f0f0;color:#666;font-size:12px;border:1px dashed #ccc;">Imagem não definida</div></div>`
                }
            } else if (elemento.tipo === "tabela") {
                html += `<div class="elemento" style="${estiloElemento}">${processarVariaveis("{{servicos_tabela}}", dadosProposta)}</div>`
            } else if (elemento.tipo === "linha") {
                html += `<div class="elemento" style="${estiloElemento}"><hr style="border-color:${elemento.estilo.color};width:100%;" /></div>`
            } else if (elemento.tipo === "espacador") {
                html += `<div class="elemento" style="${estiloElemento}"></div>`
            } else if (typeof elemento.conteudo === "string") {
                const conteudoProcessado = processarVariaveis(elemento.conteudo, dadosProposta)
                html += `<div class="elemento" style="${estiloElemento}">${conteudoProcessado.replace(/\n/g, "<br>")}</div>`
            } else {
                html += `<div class="elemento" style="${estiloElemento}">Conteúdo não suportado</div>`
            }
        })
        html += `</div>`
        return html
    } catch (error) {
        return `<div style='padding:40px;text-align:center;color:#e74c3c;'>Erro ao renderizar modelo</div>`
    }
}

const PreviewModeloPage = () => {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [modelo, setModelo] = useState<any>(null)
    const [cliente, setCliente] = useState<any>(null)
    const [servico, setServico] = useState<any>(null)
    const [erro, setErro] = useState("")

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            setErro("")
            try {
                const id = params.id
                const clienteId = searchParams.get("cliente")
                const servicoId = searchParams.get("servico")
                // Buscar modelo
                const { data: modeloData, error: modeloError } = await supabase.from("modelos").select("*").eq("id", id).single()
                if (modeloError || !modeloData) throw new Error("Modelo não encontrado")
                setModelo(modeloData)
                // Buscar cliente
                let clienteObj = null
                if (clienteId) {
                    const { data: c, error: e } = await supabase.from("clientes").select("*").eq("id", clienteId).single()
                    if (!e) clienteObj = c
                }
                setCliente(clienteObj)
                // Buscar serviço
                let servicoObj = null
                if (servicoId) {
                    const { data: s, error: e } = await supabase.from("servicos").select("*").eq("id", servicoId).single()
                    if (!e) servicoObj = s
                }
                setServico(servicoObj)
            } catch (err: any) {
                setErro(err.message || "Erro ao carregar dados")
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [params.id, searchParams])

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>
    }
    if (erro) {
        return <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">{erro}<Button className="mt-4" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button></div>
    }
    if (!modelo) return null

    // Preencher variáveis
    let conteudoProcessado = ""
    if (modelo.tipo === "visual") {
        try {
            const modeloData = typeof modelo.conteudo === "string" ? JSON.parse(modelo.conteudo) : modelo.conteudo
            const dadosProposta: DadosProposta = {
                proposta: {},
                cliente: cliente || {},
                servicos: servico ? [{ ...servico, quantidade: 1 }] : [],
                empresa: {},
            }
            conteudoProcessado = renderizarModeloVisual(modeloData, dadosProposta)
        } catch {
            conteudoProcessado = `<div style='padding:40px;text-align:center;color:#e74c3c;'>Erro ao processar modelo visual</div>`
        }
    } else {
        conteudoProcessado = modelo.conteudo
    }

    return (
        <div className="min-h-screen bg-[#e5e7eb] flex flex-col items-center py-8">
            <div className="flex w-full max-w-4xl mb-6 justify-between items-center">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                <h1 className="text-2xl font-bold text-gray-800">Pré-visualização do Modelo</h1>
                <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
            </div>
            <Card className="w-full max-w-4xl bg-white shadow-2xl rounded-xl border border-gray-300 p-0 overflow-x-auto">
                <div
                    className="proposta-preview-content"
                    dangerouslySetInnerHTML={{ __html: conteudoProcessado }}
                />
            </Card>
        </div>
    )
}

export default PreviewModeloPage 