import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Erro interno";
  return NextResponse.json({ error: message }, { status: 500 });
}
