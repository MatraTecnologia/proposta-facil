import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client para operações de auth (usar anon key)
const supabaseAuth = createClient(supabaseUrl!, supabaseAnonKey!);
// Client para operações admin (usar service role)
const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

// Interface para o corpo da requisição
interface SendOTPRequest {
  email: string;
}

// Função para validar email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Função para verificar se o usuário existe e tem assinatura ativa
async function verificarUsuarioEAssinatura(email: string) {
  try {
    // Buscar usuário no Supabase Auth
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return {
        exists: false,
        hasActiveSubscription: false,
        user: null,
        subscription: null,
      };
    }

    // Verificar assinatura ativa
    const { data: subscription } = await supabaseAdmin
      .from("user_assinaturas")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "ativa")
      .single();

    return {
      exists: true,
      hasActiveSubscription: !!subscription,
      user,
      subscription,
    };
  } catch (error) {
    console.error("Erro ao verificar usuário:", error);
    return {
      exists: false,
      hasActiveSubscription: false,
      user: null,
      subscription: null,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== SOLICITAÇÃO DE OTP ===");

    // Validar environment variables
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("❌ Environment variables não configuradas");
      return NextResponse.json(
        { error: "Configuração do servidor incompleta" },
        { status: 500 }
      );
    }

    // Extrair dados do corpo da requisição
    const body: SendOTPRequest = await request.json();
    const { email } = body;

    console.log("Email solicitado:", email);

    // Validar dados obrigatórios
    if (!email) {
      console.error("❌ Email não fornecido");
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Validar formato do email
    if (!isValidEmail(email)) {
      console.error("❌ Formato de email inválido:", email);
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    // Verificar se usuário existe e tem assinatura
    const userInfo = await verificarUsuarioEAssinatura(email);

    // Sempre retornar mensagem genérica
    if (!userInfo.exists) {
      return NextResponse.json({
        message: "Se o email estiver cadastrado, você receberá o código",
        sent: true,
      });
    }

    // Verificação de assinatura (opcional)
    // if (!userInfo.hasActiveSubscription) {
    //   return NextResponse.json(
    //     { error: "Usuário sem assinatura ativa. Entre em contato com o suporte." },
    //     { status: 403 },
    //   )
    // }

    console.log(
      "📤 Enviando OTP para:",
      email,
      "(verificação de assinatura desabilitada)"
    );

    // Enviar OTP
    const { data, error } = await supabaseAuth.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao enviar código. Tente novamente mais tarde." },
        { status: 500 }
      );
    }

    // Atualizar metadados do usuário
    if (userInfo.user) {
      await supabaseAdmin.auth.admin.updateUserById(userInfo.user.id, {
        user_metadata: {
          ...userInfo.user.user_metadata,
          last_otp_request: new Date().toISOString(),
          otp_count: (userInfo.user.user_metadata?.otp_count || 0) + 1,
        },
      });
    }

    return NextResponse.json({
      message: "Se o email estiver cadastrado, você receberá o código",
      sent: true,
      email: email,
      expires_in: "1 hora",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint de OTP está funcionando",
    timestamp: new Date().toISOString(),
  });
}
