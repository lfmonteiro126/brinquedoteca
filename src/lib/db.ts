import postgres from "postgres";
import bcrypt from "bcryptjs";

let _client: ReturnType<typeof postgres> | null = null;
let _initialized = false;

export function getClient() {
  if (!_client) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL não definida. Configure a variável de ambiente.");
    }
    _client = postgres(DATABASE_URL, { connect_timeout: 10 });
  }
  return _client;
}

async function ensureInitialized() {
  if (!_initialized) {
    await initSchema();
    _initialized = true;
  }
}

function buildQuery(queryOrTemplate: TemplateStringsArray | string, values: unknown[]): [string, unknown[]] {
  if (typeof queryOrTemplate === "string") {
    return [queryOrTemplate, values];
  }
  let query = "";
  for (let i = 0; i < queryOrTemplate.length; i++) {
    query += queryOrTemplate[i];
    if (i < values.length) {
      query += `$${i + 1}`;
    }
  }
  return [query, values];
}

export async function sqlGet<T = Record<string, unknown>>(
  queryOrTemplate: TemplateStringsArray | string,
  ...values: unknown[]
): Promise<T | undefined> {
  await ensureInitialized();
  const [query, params] = buildQuery(queryOrTemplate, values);
  const result = await getClient().unsafe(query, params as postgres.Row[]);
  return result[0] as T | undefined;
}

export async function sqlAll<T = Record<string, unknown>>(
  queryOrTemplate: TemplateStringsArray | string,
  ...values: unknown[]
): Promise<T[]> {
  await ensureInitialized();
  const [query, params] = buildQuery(queryOrTemplate, values);
  const result = await getClient().unsafe(query, params as postgres.Row[]);
  return result as unknown as T[];
}

export async function sqlRun(
  queryOrTemplate: TemplateStringsArray | string,
  ...values: unknown[]
): Promise<{ rowCount: number; insertId?: number }> {
  await ensureInitialized();
  const [query, params] = buildQuery(queryOrTemplate, values);
  const result = await getClient().unsafe(query, params as postgres.Row[]);
  return {
    rowCount: result.length,
    insertId: result[0]?.id as number | undefined,
  };
}

export async function sqlExec(query: string): Promise<void> {
  await ensureInitialized();
  await getClient().unsafe(query);
}

export async function initSchema() {
  const sql = getClient();
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'vendedor',
      ativo BOOLEAN NOT NULL DEFAULT true,
      primeiro_login BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT,
      imagem_url TEXT,
      codigo_barras TEXT UNIQUE,
      categoria TEXT,
      preco_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
      preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
      estoque INTEGER NOT NULL DEFAULT 0,
      estoque_minimo INTEGER NOT NULL DEFAULT 5,
      ativo BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    DO $$ BEGIN
      ALTER TABLE produtos ADD COLUMN imagem_url TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS vendas (
      id SERIAL PRIMARY KEY,
      numero INTEGER NOT NULL UNIQUE,
      usuario_id INTEGER NOT NULL REFERENCES users(id),
      total NUMERIC(10,2) NOT NULL DEFAULT 0,
      desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
      metodo_pagamento TEXT NOT NULL DEFAULT 'dinheiro',
      parcelas INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS venda_itens (
      id SERIAL PRIMARY KEY,
      venda_id INTEGER NOT NULL REFERENCES vendas(id),
      produto_id INTEGER NOT NULL REFERENCES produtos(id),
      quantidade INTEGER NOT NULL,
      preco_unitario NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimentacoes (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL REFERENCES produtos(id),
      tipo TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      estoque_anterior INTEGER NOT NULL,
      estoque_novo INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL REFERENCES users(id),
      referencia_id INTEGER,
      motivo TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessoes_inventario (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'aberta',
      observacao TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finalized_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS inventario_itens (
      id SERIAL PRIMARY KEY,
      sessao_id INTEGER NOT NULL REFERENCES sessoes_inventario(id),
      produto_id INTEGER NOT NULL REFERENCES produtos(id),
      estoque_sistema INTEGER NOT NULL,
      estoque_contado INTEGER NOT NULL,
      diferenca INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo_barras);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON movimentacoes(produto_id);
    CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(created_at);
  `);

  const adminResult = await sql.unsafe(
    `SELECT id FROM users WHERE email = $1`,
    ["admin@loja"]
  );

  if (adminResult.length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await sql.unsafe(
      `INSERT INTO users (nome, email, senha_hash, role) VALUES ($1, $2, $3, $4)`,
      ["Administrador", "admin@loja", hash, "admin"]
    );
  }
}

export async function registrarMovimentacao(params: {
  produtoId: number;
  tipo: "entrada" | "saida" | "ajuste" | "venda" | "inventario" | "estorno";
  quantidade: number;
  usuarioId: number;
  referenciaId?: number | null;
  motivo?: string | null;
}): Promise<number> {
  return getClient().begin(async (tx) => {
    const produto = await tx`SELECT estoque FROM produtos WHERE id = ${params.produtoId}`;
    if (produto.length === 0) throw new Error("Produto não encontrado");

    const estoqueAnterior = produto[0].estoque;
    const estoqueNovo =
      params.tipo === "entrada"
        ? estoqueAnterior + params.quantidade
        : estoqueAnterior - params.quantidade;

    if (estoqueNovo < 0) throw new Error("Estoque insuficiente");

    await tx`UPDATE produtos SET estoque = ${estoqueNovo}, updated_at = NOW() WHERE id = ${params.produtoId}`;

    await tx`
      INSERT INTO movimentacoes (produto_id, tipo, quantidade, estoque_anterior, estoque_novo, usuario_id, referencia_id, motivo)
      VALUES (${params.produtoId}, ${params.tipo}, ${params.quantidade}, ${estoqueAnterior}, ${estoqueNovo}, ${params.usuarioId}, ${params.referenciaId ?? null}, ${params.motivo ?? null})
    `;

    return estoqueNovo;
  });
}

export async function proximoNumeroVenda(): Promise<number> {
  const result = await sqlGet`
    SELECT MAX(numero) as max_num FROM vendas
  ` as { max_num: number | null } | undefined;
  return (result?.max_num ?? 0) + 1;
}
