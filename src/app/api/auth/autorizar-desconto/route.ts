import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sqlAll } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    // Garante que o usuário logado faça a requisição (evita ataques externos)
    await requireAuth();

    const body = await request.json();
    const { senha } = body;

    if (!senha) {
      return NextResponse.json(
        { error: "Senha é obrigatória" },
        { status: 400 }
      );
    }

    // Busca os nomes e hashes de todos os administradores ativos
    const admins = await sqlAll<{ nome: string; senha_hash: string }>`
      SELECT nome, senha_hash FROM users WHERE role = 'admin' AND ativo = true
    `;

    // Encontra o administrador que possui a senha correspondente
    const matchingAdmin = admins.find((admin) =>
      bcrypt.compareSync(senha, admin.senha_hash)
    );

    if (matchingAdmin) {
      return NextResponse.json({ authorized: true, adminName: matchingAdmin.nome });
    }

    return NextResponse.json(
      { error: "Senha de administrador incorreta" },
      { status: 401 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
