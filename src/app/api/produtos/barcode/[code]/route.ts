import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sqlGet } from "@/lib/db";
import { handleApiError } from "@/lib/api";

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { code } = await params;
    const produto = await sqlGet(
      "SELECT * FROM produtos WHERE codigo_barras = $1 AND ativo = true",
      decodeURIComponent(code)
    );

    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ produto });
  } catch (error) {
    return handleApiError(error);
  }
}
