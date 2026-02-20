import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { sendMagicLink } from "@/utils/email";
import { verificarUsuarioEAssinatura } from "@/utils/verificarUsuarioEAssinatura";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const supabase = createRouteHandlerClient({ cookies });

  const userInfo = await verificarUsuarioEAssinatura(email);

  // Sempre retornar mensagem genérica
  if (!userInfo.exists) {
    return NextResponse.json({
      message: "Se o email estiver cadastrado, você receberá o link mágico",
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

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${requestUrl.origin}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao enviar o link mágico. Tente novamente mais tarde." },
      { status: 500 }
    );
  }

  try {
    await sendMagicLink(email);
    return NextResponse.json({
      message: "Se o email estiver cadastrado, você receberá o link mágico",
      sent: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao enviar o email. Tente novamente mais tarde." },
      { status: 500 }
    );
  }
}
