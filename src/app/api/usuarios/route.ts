import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const db = getDb();

    const usuarios = db
      .prepare("SELECT id, nome, email, role, ativo, primeiro_login, created_at FROM users ORDER BY nome ASC")
      .all();

    return NextResponse.json({ usuarios });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const db = getDb();
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
    const result = db
      .prepare(
        "INSERT INTO users (nome, email, senha_hash, role, primeiro_login) VALUES (?, ?, ?, ?, 1)"
      )
      .run(nome.trim(), email.trim().toLowerCase(), hash, role || "vendedor");

    const usuario = db
      .prepare("SELECT id, nome, email, role, ativo, primeiro_login, created_at FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    return NextResponse.json({ usuario }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
    return handleApiError(error);
  }
}
