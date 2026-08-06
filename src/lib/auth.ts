import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { sqlGet, sqlRun } from "./db";
import type { User, UserRole } from "./types";

export class AuthError extends Error {
  constructor(message: string, public status: number = 401) {
    super(message);
    this.name = "AuthError";
  }
}

const SESSION_COOKIE = "brinquedoteca_session";
const SESSION_MAX_AGE = 60 * 60 * 12;
const JWT_ISSUER = "brinquedoteca";
const JWT_AUDIENCE = "brinquedoteca-app";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET não definido ou muito curto. Configure com pelo menos 32 caracteres."
    );
  }
  return new TextEncoder().encode(secret);
}

interface SessionPayload {
  userId: number;
}

async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return { userId: payload.userId as number };
  } catch {
    return null;
  }
}

export async function login(email: string, senha: string): Promise<User | null> {
  const row = await sqlGet`
    SELECT id, nome, email, senha_hash, role, ativo, created_at
    FROM users WHERE email = ${email} AND ativo = true
  ` as (User & { senha_hash: string }) | undefined;

  if (!row) return null;

  const match = await bcrypt.compare(senha, row.senha_hash);
  if (!match) return null;

  const user = { ...row };
  delete (user as Record<string, unknown>).senha_hash;
  return user as User;
}

export async function setSession(userId: number) {
  const token = await signToken({ userId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function invalidateAllUserSessions(userId: number) {
  await sqlRun`
    UPDATE users SET updated_at = NOW() WHERE id = ${userId}
  `;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session?.value) return null;

  const payload = await verifyToken(session.value);
  if (!payload) return null;

  const user = await sqlGet`
    SELECT id, nome, email, role, ativo, primeiro_login, created_at
    FROM users WHERE id = ${payload.userId} AND ativo = true
  ` as User | undefined;

  return user ?? null;
}

export async function requireAuth(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Não autenticado", 401);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "admin") throw new AuthError("Acesso negado", 403);
  return user;
}

export function canManageStock(role: UserRole): boolean {
  return role === "admin";
}
