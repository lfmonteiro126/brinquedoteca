import { NextResponse } from "next/server";
import { login, setSession } from "@/lib/auth";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000;

function getRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) return false;

  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    if (!getRateLimit(ip)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 1 minuto." },
        { status: 429 }
      );
    }

    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const user = await login(email, senha);

    if (!user) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    await setSession(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao fazer login";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
