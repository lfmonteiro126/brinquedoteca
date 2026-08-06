import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[API Error]", error);
  return NextResponse.json(
    { error: "Erro interno do servidor" },
    { status: 500 }
  );
}
