import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  role: text("role").notNull().default("vendedor"),
  ativo: boolean("ativo").notNull().default(true),
  primeiroLogin: boolean("primeiro_login").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const produtos = pgTable(
  "produtos",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    imagemUrl: text("imagem_url"),
    codigoBarras: text("codigo_barras").unique(),
    categoria: text("categoria"),
    precoCusto: numeric("preco_custo", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    precoVenda: numeric("preco_venda", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    estoque: integer("estoque").notNull().default(0),
    estoqueMinimo: integer("estoque_minimo").notNull().default(5),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_produtos_codigo").on(t.codigoBarras)]
);

export const vendas = pgTable("vendas", {
  id: serial("id").primaryKey(),
  numero: integer("numero").notNull().unique(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => users.id),
  total: numeric("total", { precision: 10, scale: 2 }).notNull().default("0"),
  desconto: numeric("desconto", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  metodoPagamento: text("metodo_pagamento").notNull().default("dinheiro"),
  parcelas: integer("parcelas").notNull().default(1),
  descontoAutorizadoPor: text("desconto_autorizado_por"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendaItens = pgTable("venda_itens", {
  id: serial("id").primaryKey(),
  vendaId: integer("venda_id")
    .notNull()
    .references(() => vendas.id),
  produtoId: integer("produto_id")
    .notNull()
    .references(() => produtos.id),
  quantidade: integer("quantidade").notNull(),
  precoUnitario: numeric("preco_unitario", { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
});

export const movimentacoes = pgTable(
  "movimentacoes",
  {
    id: serial("id").primaryKey(),
    produtoId: integer("produto_id")
      .notNull()
      .references(() => produtos.id),
    tipo: text("tipo").notNull(),
    quantidade: integer("quantidade").notNull(),
    estoqueAnterior: integer("estoque_anterior").notNull(),
    estoqueNovo: integer("estoque_novo").notNull(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => users.id),
    referenciaId: integer("referencia_id"),
    motivo: text("motivo"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_movimentacoes_produto").on(t.produtoId)]
);

export const sessoesInventario = pgTable("sessoes_inventario", {
  id: serial("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("aberta"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at"),
});

export const inventarioItens = pgTable("inventario_itens", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id")
    .notNull()
    .references(() => sessoesInventario.id),
  produtoId: integer("produto_id")
    .notNull()
    .references(() => produtos.id),
  estoqueSistema: integer("estoque_sistema").notNull(),
  estoqueContado: integer("estoque_contado").notNull(),
  diferenca: integer("diferenca").notNull(),
});
