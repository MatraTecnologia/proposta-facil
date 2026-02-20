"use client"

import { useEffect, useState, useCallback, useMemo, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Briefcase, FileText, Plus, TrendingUp, DollarSign, BarChart3, PieChart } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useAuth } from "@/contexts/AuthContext"
import { ImageIcon } from "lucide-react"

interface DashboardStats {
  clientes: number
  servicos: number
  propostas: number
  modelos: number
  assinaturas: number
  imagens: number
  propostasAceitas: number
  valorTotal: number
  mediaValor: number
  taxaConversao: number
  propostasPorMes: { mes: string; count: number }[]
  statusDistribution: { status: string; count: number }[]
  servicosMaisUsados: { nome: string; count: number }[]
}

// Componente de Card de Estatística memoizado
const StatCard = memo(({ stat, index }: { stat: any, index: number }) => {
  return (
    <Card
      className="card-hover glass-dark border-white/10 relative overflow-hidden group"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-300">
          {stat.title}
        </CardTitle>
        <div
          className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} group-hover:scale-110 transition-transform duration-300`}
        >
          <stat.icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold text-white group-hover:text-glow transition-all duration-300">
          {stat.value}
        </div>
      </CardContent>
    </Card>
  )
})

StatCard.displayName = "StatCard"

// Componente de Ação Rápida memoizado
const QuickActionCard = memo(({ action, index }: { action: any, index: number }) => {
  return (
    <Link href={action.href}>
      <Card className="card-hover glass-dark border-white/10 h-full group cursor-pointer relative overflow-hidden">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-1 transition-opacity duration-500`}
        />
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div
              className={`p-3 rounded-xl bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform duration-300`}
            >
              <action.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-glow transition-all duration-300">
                {action.title}
              </h3>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                {action.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
})

QuickActionCard.displayName = "QuickActionCard"

const Dashboard = memo(function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    clientes: 0,
    servicos: 0,
    propostas: 0,
    modelos: 0,
    assinaturas: 0,
    imagens: 0,
    propostasAceitas: 0,
    valorTotal: 0,
    mediaValor: 0,
    taxaConversao: 0,
    propostasPorMes: [],
    statusDistribution: [],
    servicosMaisUsados: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const fetchStats = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Buscar dados de todas as tabelas
      const [clientesResult, servicosResult, propostasResult, modelosResult, assinaturasResult, imagensResult] =
        await Promise.all([
          supabase.from("clientes").select("*").eq("user_id", user.id),
          supabase.from("servicos").select("*").eq("user_id", user.id),
          supabase.from("propostas").select("*").eq("user_id", user.id),
          supabase.from("modelos").select("*").eq("user_id", user.id),
          supabase.from("assinaturas").select("*").eq("user_id", user.id),
          supabase.from("imagens").select("*").eq("user_id", user.id),
        ])

      // Verificar erros
      if (clientesResult.error) throw clientesResult.error
      if (servicosResult.error) throw servicosResult.error
      if (propostasResult.error) throw propostasResult.error
      if (modelosResult.error) throw modelosResult.error
      if (assinaturasResult.error) throw assinaturasResult.error
      if (imagensResult.error) throw imagensResult.error

      const clientes = clientesResult.data || []
      const servicos = servicosResult.data || []
      const propostas = propostasResult.data || []
      const modelos = modelosResult.data || []
      const assinaturas = assinaturasResult.data || []
      const imagens = imagensResult.data || []

      // Cálculos básicos
      const propostasAceitas = propostas.filter((p: any) => p.status === "aceita").length

      // Cálculo de valores financeiros
      let valorTotal = 0
      let valorTotalAceitas = 0
      const servicosUsados: { [key: string]: number } = {}

      propostas.forEach((proposta: any) => {
        let valorProposta = 0

        // Verifica se a proposta tem itens e se é um array
        if (proposta.itens && Array.isArray(proposta.itens)) {
          // Calcula o valor total da proposta
          proposta.itens.forEach((item: any) => {
            const quantidade = parseFloat(item.quantidade) || 0
            const valorUnitario = parseFloat(item.valorUnitario) || 0
            const valorItem = quantidade * valorUnitario
            valorProposta += valorItem

            // Contar serviços mais usados
            if (item.nome) {
              servicosUsados[item.nome] = (servicosUsados[item.nome] || 0) + quantidade
            }
          })

          // Adiciona ao valor total geral
          valorTotal += valorProposta

          // Se a proposta foi aceita, adiciona ao valor total aceito
          if (proposta.status === "aceita") {
            valorTotalAceitas += valorProposta
          }
        }

        // Se a proposta tem valor_total direto (caso antigo)
        if (proposta.valor_total) {
          const valorTotalProposta = parseFloat(proposta.valor_total) || 0
          valorTotal += valorTotalProposta

          if (proposta.status === "aceita") {
            valorTotalAceitas += valorTotalProposta
          }
        }
      })

      console.log("Valor Total Aceitas:", valorTotalAceitas) // Debug
      console.log("Propostas Aceitas:", propostasAceitas) // Debug

      // Média por proposta aceita
      const mediaValor = propostasAceitas > 0 ? valorTotalAceitas / propostasAceitas : 0

      // Taxa de conversão
      const taxaConversao = propostas.length > 0 ? (propostasAceitas / propostas.length) * 100 : 0

      // Propostas por mês (últimos 6 meses)
      const hoje = new Date()
      const ultimosMeses: { [key: string]: number } = {}

      // Inicializar os últimos 6 meses
      for (let i = 0; i < 6; i++) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
        const mesAno = `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`
        ultimosMeses[mesAno] = 0
      }

      // Contar propostas por mês
      propostas.forEach((proposta: any) => {
        if (proposta.created_at) {
          const data = new Date(proposta.created_at)
          const mesAno = `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`
          if (ultimosMeses[mesAno] !== undefined) {
            ultimosMeses[mesAno]++
          }
        }
      })

      // Converter para array para o gráfico
      const propostasPorMes = Object.entries(ultimosMeses)
        .map(([mes, count]) => ({ mes, count }))
        .reverse()

      // Distribuição por status
      const statusCount: { [key: string]: number } = {
        pendente: 0,
        aceita: 0,
        recusada: 0,
        "em análise": 0,
      }

      propostas.forEach((proposta: any) => {
        const status = proposta.status || "pendente"
        statusCount[status] = (statusCount[status] || 0) + 1
      })

      const statusDistribution = Object.entries(statusCount)
        .map(([status, count]) => ({ status, count }))
        .filter((item) => item.count > 0)

      // Serviços mais usados (top 5)
      const servicosMaisUsados = Object.entries(servicosUsados)
        .map(([nome, count]) => ({ nome, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setStats({
        clientes: clientes.length,
        servicos: servicos.length,
        propostas: propostas.length,
        modelos: modelos.length,
        assinaturas: assinaturas.length,
        imagens: imagens.length,
        propostasAceitas,
        valorTotal: valorTotalAceitas,
        mediaValor,
        taxaConversao,
        propostasPorMes,
        statusDistribution,
        servicosMaisUsados,
      })
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err)
      setError("Erro ao carregar dados do dashboard")
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  const statsCards = useMemo(() => [
    {
      title: "Total de Clientes",
      value: stats.clientes,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Serviços Cadastrados",
      value: stats.servicos,
      icon: Briefcase,
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-500/20 to-emerald-500/20",
    },
    {
      title: "Propostas Criadas",
      value: stats.propostas,
      icon: FileText,
      color: "from-purple-500 to-violet-500",
      bgColor: "from-purple-500/20 to-violet-500/20",
    },
    {
      title: "Taxa de Conversão",
      value: `${stats.taxaConversao.toFixed(1)}%`,
      icon: TrendingUp,
      color: "from-orange-500 to-amber-500",
      bgColor: "from-orange-500/20 to-amber-500/20",
    },
    {
      title: "Modelos Criados",
      value: stats.modelos,
      icon: FileText,
      color: "from-indigo-500 to-purple-500",
      bgColor: "from-indigo-500/20 to-purple-500/20",
    },
    {
      title: "Assinaturas",
      value: stats.assinaturas,
      icon: ImageIcon,
      color: "from-pink-500 to-rose-500",
      bgColor: "from-pink-500/20 to-rose-500/20",
    },
    {
      title: "Imagens",
      value: stats.imagens,
      icon: ImageIcon,
      color: "from-teal-500 to-cyan-500",
      bgColor: "from-teal-500/20 to-cyan-500/20",
    },
    {
      title: "Propostas Aceitas",
      value: stats.propostasAceitas,
      icon: TrendingUp,
      color: "from-emerald-500 to-green-500",
      bgColor: "from-emerald-500/20 to-green-500/20",
    },
  ], [stats])

  const quickActions = useMemo(() => [
    {
      title: "Nova Proposta",
      description: "Criar proposta comercial",
      icon: Plus,
      href: "/propostas/novo",
      color: "from-orange-500 to-amber-500",
    },
    {
      title: "Gerenciar Clientes",
      description: "Visualizar e editar clientes",
      icon: Users,
      href: "/clientes",
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Catálogo de Serviços",
      description: "Gerenciar serviços oferecidos",
      icon: Briefcase,
      href: "/servicos",
      color: "from-green-500 to-emerald-500",
    },
    {
      title: "Relatórios",
      description: "Análises e métricas",
      icon: BarChart3,
      href: "/propostas",
      color: "from-purple-500 to-violet-500",
    },
  ], [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-white">
          <ImageIcon className="w-6 h-6 animate-spin" />
          <span>Carregando dados do dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-400 mb-2">❌ {error}</div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  // Função para renderizar o gráfico de barras
  const renderBarChart = () => {
    const maxValue = Math.max(...stats.propostasPorMes.map((item) => item.count))
    const chartHeight = 200

    return (
      <div className="flex items-end justify-between h-[200px] gap-2 mt-4">
        {stats.propostasPorMes.map((item, index) => {
          const height = maxValue > 0 ? (item.count / maxValue) * chartHeight : 0
          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className="w-12 rounded-t-md bg-gradient-to-t from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 transition-all duration-300 relative group"
                style={{ height: `${height}px` }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                  {item.count} propostas
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">{item.mes}</div>
            </div>
          )
        })}
      </div>
    )
  }

  // Função para renderizar o gráfico de pizza
  const renderPieChart = () => {
    const total = stats.statusDistribution.reduce((sum, item) => sum + item.count, 0)
    if (total === 0) {
      return <div className="flex items-center justify-center h-[200px] text-gray-400">Nenhuma proposta encontrada</div>
    }

    let currentAngle = 0

    const statusColors: { [key: string]: string } = {
      pendente: "#f59e0b",
      aceita: "#10b981",
      recusada: "#ef4444",
      "em análise": "#3b82f6",
    }

    return (
      <div className="relative w-[200px] h-[200px] mx-auto mt-4">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {stats.statusDistribution.map((item, index) => {
            const percentage = (item.count / total) * 100
            const angle = (percentage / 100) * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle

            // Calcular pontos do arco
            const x1 = 50 + 50 * Math.cos((startAngle - 90) * (Math.PI / 180))
            const y1 = 50 + 50 * Math.sin((startAngle - 90) * (Math.PI / 180))
            const x2 = 50 + 50 * Math.cos((endAngle - 90) * (Math.PI / 180))
            const y2 = 50 + 50 * Math.sin((endAngle - 90) * (Math.PI / 180))

            const largeArcFlag = angle > 180 ? 1 : 0

            const pathData = `
              M 50 50
              L ${x1} ${y1}
              A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2}
              Z
            `

            currentAngle += angle

            return (
              <path
                key={index}
                d={pathData}
                fill={statusColors[item.status] || `hsl(${index * 60}, 70%, 60%)`}
                stroke="#1e293b"
                strokeWidth="0.5"
                className="hover:opacity-90 transition-opacity duration-300 cursor-pointer"
              />
            )
          })}
          <circle cx="50" cy="50" r="25" fill="#1e293b" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{total}</div>
            <div className="text-xs text-gray-400">Propostas</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center animate-slide-in-up">
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Dashboard</h1>
          <p className="text-gray-400 text-lg">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-3">
          <Link href="/proposta-novo">
            <Button className="btn-gradient hover-lift group">
              <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Nova Proposta
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <StatCard key={stat.title} stat={stat} index={index} />
        ))}
      </div>

      {/* Quick Actions */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in-up"
        style={{ animationDelay: "0.3s" }}
      >
        {quickActions.map((action, index) => (
          <QuickActionCard key={action.title} action={action} index={index} />
        ))}
      </div>

      {/* Gráficos e Métricas Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-in-up" style={{ animationDelay: "0.5s" }}>
        {/* Gráfico de Propostas por Mês */}
        <Card className="lg:col-span-2 glass-dark border-white/10 card-hover overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Propostas por Mês
            </CardTitle>
            <p className="text-gray-400 text-sm">Últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {stats.propostasPorMes.length > 0 ? (
                <div className="flex items-end justify-between h-[240px] gap-3 mt-4 px-2">
                  {stats.propostasPorMes.map((item, index) => {
                    const maxValue = Math.max(...stats.propostasPorMes.map((item) => item.count))
                    const height = maxValue > 0 ? Math.max((item.count / maxValue) * 200, 8) : 8
                    const percentage = maxValue > 0 ? (item.count / maxValue) * 100 : 0

                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div className="relative w-full max-w-[60px]">
                          {/* Valor no topo */}
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10 shadow-lg">
                            {item.count} {item.count === 1 ? "proposta" : "propostas"}
                          </div>

                          {/* Barra */}
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-purple-600 via-purple-500 to-violet-400 hover:from-purple-500 hover:via-purple-400 hover:to-violet-300 transition-all duration-500 ease-out transform hover:scale-105 shadow-lg relative overflow-hidden"
                            style={{
                              height: `${height}px`,
                              minHeight: "8px",
                              animation: `slideUp 0.8s ease-out ${index * 0.1}s both`,
                            }}
                          >
                            {/* Brilho interno */}
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            {/* Indicador de porcentagem */}
                            {item.count > 0 && (
                              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {percentage.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Label do mês */}
                        <div className="text-xs text-gray-400 mt-3 font-medium group-hover:text-gray-300 transition-colors duration-300 text-center">
                          {item.mes}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[240px] text-gray-400">
                  <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma proposta encontrada</p>
                  <p className="text-sm">Crie sua primeira proposta para ver os dados aqui</p>
                </div>
              )}

              {/* Linha de base */}
              {stats.propostasPorMes.length > 0 && (
                <div className="absolute bottom-[52px] left-2 right-2 h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
              )}
            </div>

            {/* Estatísticas resumidas */}
            {stats.propostasPorMes.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-white">
                      {stats.propostasPorMes.reduce((sum, item) => sum + item.count, 0)}
                    </div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-white">
                      {Math.max(...stats.propostasPorMes.map((item) => item.count))}
                    </div>
                    <div className="text-xs text-gray-400">Máximo</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-white">
                      {(
                        stats.propostasPorMes.reduce((sum, item) => sum + item.count, 0) / stats.propostasPorMes.length
                      ).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">Média</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Métricas Financeiras */}
        <Card className="glass-dark border-white/10 card-hover">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <div className="text-2xl font-bold text-white">
                  R$ {stats.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-green-400 text-sm">Valor total das propostas aceitas</div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Média por proposta aceita</span>
                  <span className="text-white font-medium">
                    R$ {stats.mediaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Propostas aceitas</span>
                  <span className="text-white font-medium">{stats.propostasAceitas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Taxa de conversão</span>
                  <span className="text-white font-medium">{stats.taxaConversao.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Gráfico de Pizza - Status das Propostas */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                Status das Propostas
              </h4>
              {renderPieChart()}

              {/* Legenda */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {stats.statusDistribution.map((item, index) => {
                  const statusColors: { [key: string]: string } = {
                    pendente: "bg-amber-500",
                    aceita: "bg-emerald-500",
                    recusada: "bg-red-500",
                    "em análise": "bg-blue-500",
                  }

                  return (
                    <div key={index} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${statusColors[item.status] || `bg-gray-500`}`}></div>
                      <span className="text-xs text-gray-400 capitalize">
                        {item.status} ({item.count})
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Serviços Mais Usados */}
      {stats.servicosMaisUsados.length > 0 && (
        <Card className="glass-dark border-white/10 card-hover animate-slide-in-up" style={{ animationDelay: "0.7s" }}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-green-400" />
              Serviços Mais Utilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {stats.servicosMaisUsados.map((servico, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30"
                >
                  <div className="text-lg font-bold text-white">{servico.count}</div>
                  <div className="text-green-400 text-sm truncate" title={servico.nome}>
                    {servico.nome}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
})

export default Dashboard
