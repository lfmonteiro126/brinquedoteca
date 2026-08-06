import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sqlAll } from "@/lib/db";
import bcrypt from "bcryptjs";

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

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    if (!getRateLimit(`desconto-${ip}`)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 1 minuto." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { senha } = body;

    if (!senha) {
      return NextResponse.json(
        { error: "Senha é obrigatória" },
        { status: 400 }
      );
    }

    const admins = await sqlAll<{ senha_hash: string }>`
      SELECT senha_hash FROM users WHERE role = 'admin' AND ativo = true
    `;

    let authorized = false;
    for (const admin of admins) {
      const match = await bcrypt.compare(senha, admin.senha_hash);
      if (match) {
        authorized = true;
        break;
      }
    }

    if (authorized) {
      return NextResponse.json({ authorized: true });
    }

    return NextResponse.json(
      { error: "Senha de administrador incorreta" },
      { status: 401 }
    );
  } catch (error) {
    console.error("[Autorizar Desconto]", error);
    return NextResponse.json(
      { error: "Erro ao validar autorização" },
      { status: 500 }
    );
  }
}
