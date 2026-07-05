import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "brinquedoteca.db");

let db: Database.Database | null = null;

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'vendedor' CHECK(role IN ('admin', 'vendedor')),
      ativo INTEGER NOT NULL DEFAULT 1,
      primeiro_login INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      codigo_barras TEXT UNIQUE,
      categoria TEXT,
      preco_custo REAL NOT NULL DEFAULT 0,
      preco_venda REAL NOT NULL DEFAULT 0,
      estoque INTEGER NOT NULL DEFAULT 0,
      estoque_minimo INTEGER NOT NULL DEFAULT 5,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL UNIQUE,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      desconto REAL NOT NULL DEFAULT 0,
      metodo_pagamento TEXT NOT NULL DEFAULT 'dinheiro' CHECK(metodo_pagamento IN ('pix', 'debito', 'credito', 'dinheiro')),
      parcelas INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS venda_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venda_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venda_id) REFERENCES vendas(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada', 'saida', 'ajuste', 'venda', 'inventario', 'estorno')),
      quantidade INTEGER NOT NULL,
      estoque_anterior INTEGER NOT NULL,
      estoque_novo INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      referencia_id INTEGER,
      motivo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (produto_id) REFERENCES produtos(id),
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessoes_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'aberta' CHECK(status IN ('aberta', 'finalizada')),
      observacao TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      finalized_at TEXT,
      FOREIGN KEY (usuario_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS inventario_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessao_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      estoque_sistema INTEGER NOT NULL,
      estoque_contado INTEGER NOT NULL,
      diferenca INTEGER NOT NULL,
      FOREIGN KEY (sessao_id) REFERENCES sessoes_inventario(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    );

    CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo_barras);
    CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON movimentacoes(produto_id);
    CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(created_at);
  `);

  const hasPrimeiroLogin = database
    .prepare("PRAGMA table_info(users)")
    .all() as Array<{ name: string }>;
  if (!hasPrimeiroLogin.some((c) => c.name === "primeiro_login")) {
    database.exec("ALTER TABLE users ADD COLUMN primeiro_login INTEGER NOT NULL DEFAULT 1");
    database.exec("UPDATE users SET primeiro_login = 0");
  }

  const adminExists = database
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("admin@loja");

  if (!adminExists) {
    const hash = bcrypt.hashSync("admin123", 10);
    database
      .prepare(
        "INSERT INTO users (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)"
      )
      .run("Administrador", "admin@loja", hash, "admin");
  }
}

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

export function registrarMovimentacao(
  database: Database.Database,
  params: {
    produtoId: number;
    tipo: "entrada" | "saida" | "ajuste" | "venda" | "inventario" | "estorno";
    quantidade: number;
    usuarioId: number;
    referenciaId?: number | null;
    motivo?: string | null;
  }
): number {
  const updateEstoque = database.prepare(
    "UPDATE produtos SET estoque = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
  );
  const insertMov = database.prepare(
    `INSERT INTO movimentacoes (produto_id, tipo, quantidade, estoque_anterior, estoque_novo, usuario_id, referencia_id, motivo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const getProduto = database.prepare("SELECT estoque FROM produtos WHERE id = ?");

  const result = database.transaction(() => {
    const produto = getProduto.get(params.produtoId) as { estoque: number } | undefined;
    if (!produto) throw new Error("Produto não encontrado");

    const estoqueAnterior = produto.estoque;
    const estoqueNovo = params.tipo === "entrada"
      ? estoqueAnterior + params.quantidade
      : estoqueAnterior - params.quantidade;

    if (estoqueNovo < 0) throw new Error("Estoque insuficiente");

    updateEstoque.run(estoqueNovo, params.produtoId);
    insertMov.run(
      params.produtoId,
      params.tipo,
      params.quantidade,
      estoqueAnterior,
      estoqueNovo,
      params.usuarioId,
      params.referenciaId ?? null,
      params.motivo ?? null
    );

    return estoqueNovo;
  })();

  return result;
}

export function proximoNumeroVenda(database: Database.Database): number {
  const last = database
    .prepare("SELECT MAX(numero) as max_num FROM vendas")
    .get() as { max_num: number | null };
  return (last.max_num ?? 0) + 1;
}
