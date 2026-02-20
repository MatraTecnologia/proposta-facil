# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PropostaFacil is a commercial proposal generator SaaS built for the Brazilian market. Users manage clients, services, and proposal templates, then generate professional proposals with variable substitution. The app is in Portuguese (pt-BR).

## Commands

```bash
pnpm dev          # Start dev server on localhost:3000
pnpm build        # Production build (standalone output)
pnpm lint         # ESLint (next/core-web-vitals + next/typescript)
pnpm typecheck    # TypeScript check (tsc --noEmit)
```

Package manager is **pnpm** (v10.30.0, enforced via `packageManager` field). No test framework is configured.

## Tech Stack

- **Next.js 15** (App Router, React 19, standalone output)
- **Supabase** for auth (OTP + password) and database
- **shadcn/ui** (Radix + Tailwind + CVA) — components in `components/ui/`
- **Tailwind CSS 3** with CSS variables for theming (dark-only, orange primary)
- **React Hook Form + Zod** for form validation
- **Kiwify** webhook integration for subscription billing

## Architecture

### Route Groups

- `app/page.tsx` — Login page (OTP or password auth, not behind ProtectedRoute)
- `app/(root)/` — Authenticated dashboard shell (Sidebar + Navbar + ProtectedRoute)
  - `dashboard/` — Main dashboard
  - `clientes/` + `clientes/[id]/` — Client CRUD
  - `servicos/` + `servicos/[id]/` — Service CRUD
  - `propostas/` + `propostas/[id]/` — Proposal management
  - `proposta-novo/` — New proposal creation
  - `modelos/` + `modelos/editor/` + `modelos/preview/[id]/` — Template editor
  - `imagens/` — Image management
  - `assinaturas/` + `assinaturas/desenhar/` — Signature drawing/management
- `app/editor-modelo/` — Standalone template editor (outside dashboard layout)
- `app/api/auth/` — Auth endpoints: `send-otp`, `verify-otp`, `magic-link`, `direct-login`, `reset-password`
- `app/api/webhook/kiwify/` — Kiwify subscription webhook

### Auth Flow

`AuthContext` (`contexts/AuthContext.tsx`) wraps the entire app and provides `useAuth()`. It uses `@supabase/auth-helpers-nextjs` client-side (`createClientComponentClient`). The `(root)` layout wraps children in `ProtectedRoute` which redirects unauthenticated users to `/`.

Two Supabase clients exist:
- `lib/supabase.ts` — Browser client (anon key) + all TypeScript interfaces for DB tables
- `lib/supabase-admin.ts` — Server-side admin client (service role key) for API routes

### Template Variable System

Proposal templates use `{{variable_name}}` placeholders. The system has two key files:
- `lib/variaveis.ts` — Registry of all available variables with categories (cliente, proposta, valores, servicos, outros)
- `lib/processarVariaveis.ts` — `processarVariaveis(template, dados)` function that replaces all `{{...}}` placeholders with actual data, including currency formatting in BRL and number-to-text conversion

### Key Patterns

- All pages under `(root)/` have `loading.tsx` skeletons for Suspense
- UI components are shadcn/ui defaults in `components/ui/` — don't modify these directly
- Custom app components (`Sidebar`, `Navbar`, `ProtectedRoute`) are in `components/`
- Utility CSS classes (`glass-dark`, `hover-lift`, `text-gradient`, `btn-gradient`, `card-hover`, etc.) are defined in `app/globals.css`
- Icons are from `lucide-react`

## Supabase Tables

Interfaces defined in `lib/supabase.ts`: `Cliente`, `Servico`, `Proposta`, `Modelo`, `Imagem`, `Assinatura`, `Configuracao`, `UserAssinatura`. All tables are scoped by `user_id`.

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `KIWIFY_WEBHOOK_SECRET` (for webhook verification)
- `NEXT_PUBLIC_SITE_URL` (for email redirect URLs)

## Build Notes

- `next.config.mjs` has `output: 'standalone'`, `ignoreDuringBuilds: true` for both ESLint and TypeScript, and `images: { unoptimized: true }`
- Dockerfile uses multi-stage build with standalone output
- Subscription verification is currently disabled (`verificarUsuarioEAssinatura` returns `hasActiveSubscription: true` always)
