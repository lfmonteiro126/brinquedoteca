import postgres from "postgres";
import { calcularEstoqueNovo } from "./estoque";

let _client: ReturnType<typeof postgres> | null = null;
let _initialized = false;

export function getClient() {
  if (!_client) {
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      throw new Error("DATABASE_URL não definida. Configure a variável de ambiente.");
    }
    _client = postgres(DATABASE_URL, { connect_timeout: 10, max: 20 });
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
      ALTER TABLE produtos ADD COLUMN descricao TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

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

    DO $$ BEGIN
      ALTER TABLE vendas ADD COLUMN desconto_autorizado_por TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE vendas ADD COLUMN correcao_justificativa TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE vendas ADD COLUMN corrigido_por INTEGER REFERENCES users(id);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE vendas ADD COLUMN corrigido_em TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE vendas ADD COLUMN estornada BOOLEAN NOT NULL DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE vendas ADD COLUMN estornada_em TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE vendas ADD COLUMN estornada_por INTEGER REFERENCES users(id);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS venda_correcoes (
      id SERIAL PRIMARY KEY,
      venda_id INTEGER NOT NULL REFERENCES vendas(id),
      usuario_id INTEGER NOT NULL REFERENCES users(id),
      justificativa TEXT NOT NULL,
      metodo_anterior TEXT NOT NULL,
      metodo_novo TEXT NOT NULL,
      parcelas_anterior INTEGER NOT NULL DEFAULT 1,
      parcelas_novo INTEGER NOT NULL DEFAULT 1,
      desconto_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
      desconto_novo NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_novo NUMERIC(10,2) NOT NULL DEFAULT 0,
      detalhes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_venda_correcoes_created ON venda_correcoes(created_at);
    CREATE INDEX IF NOT EXISTS idx_venda_correcoes_venda ON venda_correcoes(venda_id);

    INSERT INTO venda_correcoes (
      venda_id, usuario_id, justificativa,
      metodo_anterior, metodo_novo,
      parcelas_anterior, parcelas_novo,
      desconto_anterior, desconto_novo,
      total_anterior, total_novo,
      detalhes, created_at
    )
    SELECT
      v.id,
      COALESCE(v.corrigido_por, v.usuario_id),
      COALESCE(NULLIF(TRIM(v.correcao_justificativa), ''), 'Correção registrada'),
      v.metodo_pagamento,
      v.metodo_pagamento,
      v.parcelas,
      v.parcelas,
      v.desconto,
      v.desconto,
      v.total,
      v.total,
      'Migração de correção existente',
      v.corrigido_em
    FROM vendas v
    WHERE v.corrigido_em IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM venda_correcoes vc WHERE vc.venda_id = v.id
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

    CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes(tipo);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_created ON movimentacoes(created_at);
    CREATE INDEX IF NOT EXISTS idx_vendas_usuario ON vendas(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_sessoes_inventario_status ON sessoes_inventario(status);
    CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
    CREATE INDEX IF NOT EXISTS idx_vendas_estornada ON vendas(estornada);
  `);

  await sql.unsafe(`
    UPDATE vendas v
    SET
      estornada = true,
      estornada_em = COALESCE(
        v.estornada_em,
        (SELECT MIN(m.created_at) FROM movimentacoes m WHERE m.tipo = 'estorno' AND m.referencia_id = v.id)
      ),
      estornada_por = COALESCE(
        v.estornada_por,
        (SELECT m.usuario_id FROM movimentacoes m WHERE m.tipo = 'estorno' AND m.referencia_id = v.id ORDER BY m.id ASC LIMIT 1)
      )
    WHERE v.estornada = false
      AND EXISTS (
        SELECT 1 FROM movimentacoes m WHERE m.tipo = 'estorno' AND m.referencia_id = v.id
      )
  `);

  const adminResult = await sql.unsafe(
    `SELECT id FROM users WHERE email = $1`,
    ["admin@loja"]
  );

  if (adminResult.length === 0) {
    const crypto = await import("crypto");
    const tempPassword = crypto.randomBytes(16).toString("base64url").slice(0, 16);
    const bcrypt = (await import("bcryptjs")).default;
    const hash = await bcrypt.hash(tempPassword, 10);
    await sql.unsafe(
      `INSERT INTO users (nome, email, senha_hash, role, primeiro_login) VALUES ($1, $2, $3, $4, true)`,
      ["Administrador", "admin@loja", hash, "admin"]
    );
    console.warn(`[SECURITY] Admin criado com senha temporária: ${tempPassword}`);
    console.warn("[SECURITY] Troque a senha imediatamente após o primeiro login!");
  }
}

type SqlTagged = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (strings: TemplateStringsArray, ...values: any[]): Promise<any>;
};

export async function registrarMovimentacao(
  params: {
    produtoId: number;
    tipo: "entrada" | "saida" | "ajuste" | "venda" | "inventario" | "estorno";
    quantidade: number;
    usuarioId: number;
    referenciaId?: number | null;
    motivo?: string | null;
  },
  tx?: SqlTagged
): Promise<number> {
  const apply = async (sql: SqlTagged) => {
    const produto = await sql`SELECT estoque FROM produtos WHERE id = ${params.produtoId} FOR UPDATE`;
    if (produto.length === 0) throw new Error("Produto não encontrado");

    const estoqueAnterior = Number(produto[0].estoque);
    const estoqueNovo = calcularEstoqueNovo(params.tipo, estoqueAnterior, params.quantidade);

    if (estoqueNovo < 0) throw new Error("Estoque insuficiente");

    await sql`UPDATE produtos SET estoque = ${estoqueNovo}, updated_at = NOW() WHERE id = ${params.produtoId}`;

    await sql`
      INSERT INTO movimentacoes (produto_id, tipo, quantidade, estoque_anterior, estoque_novo, usuario_id, referencia_id, motivo)
      VALUES (${params.produtoId}, ${params.tipo}, ${params.quantidade}, ${estoqueAnterior}, ${estoqueNovo}, ${params.usuarioId}, ${params.referenciaId ?? null}, ${params.motivo ?? null})
    `;

    return estoqueNovo;
  };

  if (tx) return apply(tx);
  return getClient().begin(apply);
}

export async function proximoNumeroVenda(): Promise<number> {
  return getClient().begin(async (tx) => {
    // FOR UPDATE cannot be used with aggregates in PostgreSQL
    await tx`LOCK TABLE vendas IN SHARE ROW EXCLUSIVE MODE`;
    const result = await tx`SELECT COALESCE(MAX(numero), 0) + 1 as next_num FROM vendas`;
    return Number(result[0].next_num);
  });
}
