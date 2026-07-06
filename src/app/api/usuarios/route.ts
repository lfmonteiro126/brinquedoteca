import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sqlGet, sqlAll, sqlRun } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const usuarios = await sqlAll`
      SELECT id, nome, email, role, ativo, primeiro_login, created_at
      FROM users ORDER BY nome ASC
    `;

    return NextResponse.json({ usuarios });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const bcrypt = await import("bcryptjs");

    const { nome, email, senha, role } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
    }
    if (!senha || senha.length < 6) {
      return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
    }
    if (role && role !== "admin" && role !== "vendedor") {
      return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
    }

    const hash = bcrypt.hashSync(senha, 10);
    const result = await sqlRun`
      INSERT INTO users (nome, email, senha_hash, role, primeiro_login)
      VALUES (${nome.trim()}, ${email.trim().toLowerCase()}, ${hash}, ${role || "vendedor"}, true)
      RETURNING id
    `;

    const usuario = await sqlGet`
      SELECT id, nome, email, role, ativo, primeiro_login, created_at
      FROM users WHERE id = ${result.insertId}
    `;

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
    return handleApiError(error);
  }
}
