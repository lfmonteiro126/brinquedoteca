import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sqlGet } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { senhaAtual, novaSenha } = body;
    const bcrypt = await import("bcryptjs");

    if (!senhaAtual) {
      return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 });
    }
    if (!novaSenha || novaSenha.length < 8) {
      return NextResponse.json(
        { error: "Nova senha deve ter no mínimo 8 caracteres" },
        { status: 400 }
      );
    }

    const row = await sqlGet`
      SELECT id, senha_hash FROM users WHERE id = ${user.id}
    ` as { id: number; senha_hash: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const match = await bcrypt.compare(senhaAtual, row.senha_hash);
    if (!match) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await sqlGet`
      UPDATE users SET senha_hash = ${hash}, primeiro_login = false WHERE id = ${user.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
