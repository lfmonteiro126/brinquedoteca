import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sqlGet, sqlRun, getClient } from "@/lib/db";
import { handleApiError } from "@/lib/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const bcrypt = await import("bcryptjs");

    const existing = await sqlGet(
      "SELECT id FROM users WHERE id = $1",
      id
    ) as { id: number } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (body.nome !== undefined) {
      if (!body.nome?.trim()) {
        return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
      }
      updates.push(`nome = $${paramIndex++}`);
      values.push(body.nome.trim());
    }

    if (body.email !== undefined) {
      if (!body.email?.trim()) {
        return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(body.email.trim().toLowerCase());
    }

    if (body.senha) {
      if (body.senha.length < 6) {
        return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
      }
      const hash = bcrypt.hashSync(body.senha, 10);
      updates.push(`senha_hash = $${paramIndex++}`);
      values.push(hash);
      if (body.forcePrimeiroLogin !== false) {
        updates.push("primeiro_login = false");
      }
    }

    if (body.role !== undefined) {
      if (body.role !== "admin" && body.role !== "vendedor") {
        return NextResponse.json({ error: "Perfil inválido" }, { status: 400 });
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(body.role);
    }

    if (body.ativo !== undefined) {
      updates.push(`ativo = $${paramIndex++}`);
      values.push(!!body.ativo);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    values.push(id);
    await getClient().unsafe(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    );

    const usuario = await sqlGet`
      SELECT id, nome, email, role, ativo, primeiro_login, created_at
      FROM users WHERE id = ${id}
    `;

    return NextResponse.json({ usuario });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    if (message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (id === admin.id) {
      return NextResponse.json({ error: "Não é possível desativar a si mesmo" }, { status: 400 });
    }

    const existing = await sqlGet(
      "SELECT id, role FROM users WHERE id = $1 AND ativo = true",
      id
    ) as { id: number; role: string } | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    await sqlRun`UPDATE users SET ativo = false WHERE id = ${id}`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
