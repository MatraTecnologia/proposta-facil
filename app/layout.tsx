import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/components/theme-provider"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Proposta Fácil | Gerador de Propostas Comerciais Online",
  description: "Crie propostas comerciais profissionais de forma rápida e fácil. Gere orçamentos, contratos e mais com o Proposta Fácil.",
  keywords: ["gerador de proposta", "proposta comercial", "orçamento online", "criador de contrato", "ferramenta de vendas", "gestão de propostas"],
  openGraph: {
    title: "Proposta Fácil | Gerador de Propostas Comerciais Online",
    description: "Crie propostas comerciais profissionais de forma rápida e fácil. Gere orçamentos, contratos e mais com o Proposta Fácil.",
    url: "URL_DA_SUA_APLICACAO",
    siteName: "Proposta Fácil",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning >
      <body className={inter.className}>
        <AuthProvider>

          <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
            <NextTopLoader color="orange" />
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
