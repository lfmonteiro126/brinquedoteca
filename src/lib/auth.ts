import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import type { User, UserRole } from "./types";

const SESSION_COOKIE = "brinquedoteca_session";

export async function login(email: string, senha: string): Promise<User | null> {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, nome, email, senha_hash, role, ativo, created_at FROM users WHERE email = ? AND ativo = 1"
    )
    .get(email) as (User & { senha_hash: string }) | undefined;

  if (!row || !bcrypt.compareSync(senha, row.senha_hash)) {
    return null;
  }

  const { senha_hash: _, ...user } = row;
  return user;
}

export async function setSession(userId: number) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, String(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return null;

  const userId = parseInt(session.value, 10);
  if (isNaN(userId)) return null;

  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, nome, email, role, ativo, created_at FROM users WHERE id = ? AND ativo = 1"
    )
    .get(userId) as User | undefined;

  return user ?? null;
}

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new Error("Não autenticado");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Acesso negado");
  return user;
}

export function canManageStock(role: UserRole): boolean {
  return role === "admin";
}
