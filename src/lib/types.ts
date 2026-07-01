export type UserRole = "admin" | "vendedor";

export interface User {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  ativo: number;
  created_at: string;
}

export interface Produto {
  id: number;
  nome: string;
  codigo_barras: string | null;
  categoria: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque: number;
  estoque_minimo: number;
  ativo: number;
  created_at: string;
  updated_at: string;
}

export interface Venda {
  id: number;
  numero: number;
  usuario_id: number;
  usuario_nome?: string;
  total: number;
  desconto: number;
  metodo_pagamento: "pix" | "debito" | "credito" | "dinheiro";
  parcelas: number;
  created_at: string;
  itens?: VendaItem[];
}

export interface VendaItem {
  id: number;
  venda_id: number;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface Movimentacao {
  id: number;
  produto_id: number;
  produto_nome?: string;
  tipo: "entrada" | "saida" | "ajuste" | "venda" | "inventario";
  quantidade: number;
  estoque_anterior: number;
  estoque_novo: number;
  usuario_id: number;
  usuario_nome?: string;
  referencia_id: number | null;
  motivo: string | null;
  created_at: string;
}

export interface DashboardData {
  vendasHoje: { total: number; quantidade: number };
  vendasPeriodo: { total: number; quantidade: number };
  produtosEstoque: number;
  produtosEstoqueBaixo: Produto[];
  vendasRecentes: Venda[];
  topProdutos: { produto_nome: string; total_vendido: number }[];
}
