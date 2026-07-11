# Brinquedoteca

Sistema de estoque e vendas presenciais para loja de brinquedos.

## Como rodar

```bash
cd ~/Projects/brinquedoteca
npm install
```

Crie o arquivo `.env.local` na raiz do projeto:

```
DATABASE_URL=postgresql://usuario:senha@host/database?sslmode=require
JWT_SECRET=uma_senha_forte_com_pelo_menos_32_caracteres
```

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

**Login inicial:** `admin@loja` / `admin123` (troque a senha depois)

As tabelas e o usuario admin sao criados automaticamente na primeira execucao.

## Deploy (Vercel + Neon)

1. Crie um repositorio no GitHub e faca push do codigo
2. Crie uma conta gratuita no [Neon](https://neon.tech) e crie um projeto (PostgreSQL 17)
3. Copie a `DATABASE_URL` de conexao do Neon
4. No [Vercel](https://vercel.com), importe o repositorio do GitHub
5. Adicione as environment variables:
   - `DATABASE_URL` — string de conexao do Neon
   - `JWT_SECRET` — frase aleatoria para assinatura JWT
6. Faca deploy — as tabelas sao criadas automaticamente na primeira request

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Graficos | Recharts |
| Icones | Lucide React |
| Banco de dados | PostgreSQL (Neon) + Drizzle ORM + postgres.js |
| Autenticacao | JWT (jose) + bcryptjs |
| PDF | jsPDF + jspdf-autotable |
| Codigo de barras | JsBarcode (geracao de etiquetas) |
| Fontes | Geist Sans / Geist Mono |
| Hospedagem | Vercel (frontend + API) + Neon (banco de dados) |

## Estrutura do projeto

```
src/
├── app/                          # Rotas (Next.js App Router)
│   ├── api/                      # API routes (REST)
│   │   ├── auth/                 #   Login, logout, troca de senha
│   │   ├── auditoria/            #   Log de movimentacoes de estoque
│   │   ├── dashboard/            #   Dados do dashboard
│   │   ├── inventario/           #   Sessoes de inventario
│   │   ├── produtos/             #   CRUD produtos + busca por barcode
│   │   ├── relatorios/           #   Dados dos relatorios
│   │   ├── usuarios/             #   CRUD usuarios (admin)
│   │   └── vendas/               #   Vendas + estorno
│   ├── auditoria/page.tsx        # Pagina de auditoria
│   ├── error.tsx                 # Error boundary global
│   ├── inventario/page.tsx       # Pagina de inventario
│   ├── login/page.tsx            # Login
│   ├── not-found.tsx             # Pagina 404 personalizada
│   ├── perfil/                   # Perfil do usuario
│   ├── produtos/                  # CRUD produtos (listar/novo/editar)
│   ├── relatorios/page.tsx       # Relatorios (admin)
│   ├── trocar-senha/page.tsx     # Troca de senha
│   ├── usuarios/page.tsx         # Gerenciar usuarios (admin)
│   └── vendas/                   # PDV + historico
├── components/                   # Componentes React
│   ├── AppShell.tsx              # Layout autenticado
│   ├── AuditoriaView.tsx         # View de auditoria
│   ├── Breadcrumbs.tsx           # Navegacao hierarquica
│   ├── ConfirmDialog.tsx         # Modal de confirmacao
│   ├── DashboardView.tsx         # Dashboard com charts
│   ├── EmptyState.tsx            # Estados vazios ilustrados (8 tipos)
│   ├── GlobalSearch.tsx          # Busca global (Ctrl+K)
│   ├── IdleTimer.tsx             # Logout por inatividade
│   ├── InventarioView.tsx        # View de inventario
│   ├── LabelPrinter.tsx          # Impressao de etiquetas
│   ├── Nav.tsx                   # Sidebar de navegacao
│   ├── OptimizedImage.tsx        # Imagem com lazy loading e fallback
│   ├── Pagination.tsx            # Componente de paginacao
│   ├── PerfilView.tsx            # View de perfil
│   ├── POSView.tsx               # Ponto de venda (PDV)
│   ├── ProductForm.tsx           # Formulario de produto
│   ├── ProdutosView.tsx          # View de produtos
│   ├── RelatoriosView.tsx        # View de relatorios
│   ├── RoutePreloader.tsx        # Prefetch de rotas criticas
│   ├── ShortcutHelp.tsx          # Ajuda de atalhos de teclado
│   ├── Skeleton.tsx              # Loading skeletons
│   ├── StockAdjustModal.tsx      # Modal de ajuste de estoque
│   ├── ThemeProvider.tsx          # Provider do tema (dark/light)
│   ├── Toast.tsx                 # Sistema de notificacoes
│   ├── UsuariosView.tsx          # View de usuarios
│   └── VendasHistoricoView.tsx   # Historico de vendas
├── hooks/                        # Custom hooks React
│   ├── useDebounce.ts            # Debounce para buscas
│   ├── useKeyboardShortcuts.ts   # Atalhos de teclado (PDV)
│   └── usePreferences.ts         # Preferencias do usuario
├── lib/                          # Utilitarios e logica
│   ├── auth.ts                   # Autenticacao (JWT, sessao)
│   ├── db.ts                     # Conexao PostgreSQL (postgres.js) + helpers
│   ├── schema.ts                 # Schema Drizzle ORM (tabelas do banco)
│   ├── api.ts                    # Helpers de error handling para API
│   ├── format.ts                 # Formatacao (moeda, data)
│   ├── sanitize.ts               # Sanitizacao de inputs (XSS)
│   └── types.ts                  # Tipagens TypeScript
├── drizzle.config.ts              # Config do Drizzle Kit (migrations)
└── middleware.ts                  # Middleware de autenticacao
```

### Banco de dados (PostgreSQL)

Tabelas principais:
- `users` — usuarios do sistema (admin/vendedor)
- `produtos` — cadastro de brinquedos
- `vendas` — vendas realizadas
- `venda_itens` — itens de cada venda
- `movimentacoes` — log de todas as movimentacoes de estoque
- `sessoes_inventario` — sessoes de inventario
- `inventario_itens` — itens contados em cada sessao

O schema e criado automaticamente via `initSchema()` na primeira execucao. Para migrations manuais, edite `src/app/api/...` ou use o SQL Editor do Neon.

## Funcionalidades

### Dashboard
- Visão geral de vendas do dia/mês com indicadores de tendência (vs período anterior)
- Filtro por período (7, 15 ou 30 dias)
- Gráfico de mapa de calor (heatmap) com vendas por hora
- Banner de notificação para produtos com estoque abaixo do mínimo
- Cards de resumo: vendas, estoque, ticket médio, itens vendidos

### PDV (Ponto de Venda)
- Leitura por código de barras USB (leitor comum, sem driver)
- **Busca por nome** — digite para encontrar produtos sem escanear
- **Buscas recentes** — produtos acessados recentemente ficam salvos
- Carrinho persistente (salvo no navegador, sobrevive a reload)
- Métodos de pagamento: PIX, débito, crédito (até 12x), dinheiro
- Desconto por valor (R$)
- Confirmação antes de finalizar a venda
- **Cupom de venda** — opção de imprimir cupom informativo ao finalizar
- Modal de seleção quando a busca retorna múltiplos resultados

### Produtos
- Cadastro completo: nome, código de barras, preço de custo/venda, estoque mínimo, categoria
- Edição e listagem com paginação
- **Impressão de etiquetas** — etiquetas com código de barras em 3 tamanhos (38x25mm, 50x30mm, 70x40mm), configuráveis (preço, código, categoria)
- **Ajuste de estoque** — modal com motivo obrigatório (entrada/saída/correção/inventário/outros), histórico registrado

### Histórico de Vendas
- Lista paginada de todas as vendas
- **Filtros avançados**: data, vendedor, método de pagamento, período (de/até)
- Detalhes expandíveis por venda (itens, pagamento, vendedor)
- **Estorno de vendas** (admin) — devolve estoque automaticamente

### Inventário
- Contagem por código de barras ou busca por nome
- Botões de incremento/decremento para ajuste manual
- Filtros: todos, contados, não contados, com divergência
- **Histórico de sessões** — visualiza inventários anteriores com detalhes
- Exportar divergências para CSV

### Auditoria
- Log completo de toda movimentação de estoque
- **Filtros avançados**: tipo (entrada/saída/ajuste/venda/inventário/estorno), produto, período
- Paginação

### Usuários (admin)
- CRUD completo: criar, editar, desativar/reativar vendedores e administradores
- Controle de perfis (admin/vendedor)

### Relatórios (admin)
- **Resumo**: total de vendas, valor total, ticket médio, itens vendidos, descontos
- **Por período**: gráfico de barras com vendas agrupadas por dia/semana/mês
- **Por categoria**: gráfico de pizza e barras horizontais
- **Por funcionário**: desempenho individual com ticket médio
- **Produtos**: ranking de mais e menos vendidos
- **Margem de lucro**: análise de custo vs receita por produto
- Exportação para **CSV** e **PDF** (com cabeçalho e formatação)

### Perfil do Usuário
- Visualização de dados pessoais (nome, email, função, data de cadastro)
- **Troca de senha** diretamente pelo perfil
- **Preferências**: tema claro/escuro, itens por página

### Segurança
- **Logout automático** após 15 minutos de inatividade
- **Tema escuro** — alterna entre claro e escuro (salva preferência)
- **Navegação responsiva** — menu lateral colapsável no mobile

### UX e Interface
- **Busca global** — Ctrl+K para buscar em todo o sistema
- **Atalhos de teclado** — F1 (ajuda), F2 (novo), F3 (buscar), F4 (limpar)
- **Toasts** — notificações visuais de sucesso/erro/aviso
- **Breadcrumbs** — navegação hierárquica em todas as páginas
- **Empty states ilustrados** — mensagens amigáveis quando não há dados
- **Loading skeletons** — feedback visual durante carregamento
- **Imagens otimizadas** — lazy loading com fallback automático
- **Ajuste de estoque** — modal dedicado com motivo obrigatório (admin)
- **Escurecimento suave** — dark mode sem flash (anti-FOUC)
- **Touch targets** — botões com pelo menos 44px para mobile
- **Micro-interações** — feedback visual em botões e ações

## Leitor de código de barras

Leitores USB comuns funcionam como teclado — basta focar o campo de scan no PDV ou Inventário e escanear. Não precisa de driver especial. Modelos recomendados: qualquer leitor 1D/2D USB entre R$ 80–200.

## Perfis de usuário

| Perfil   | Pode vender | Pode cadastrar | Pode ajustar estoque | Inventário/Auditoria | Usuários/Relatórios |
|----------|-------------|----------------|----------------------|----------------------|---------------------|
| vendedor | Sim         | Não            | Não                  | Não                  | Não                 |
| admin    | Sim         | Sim            | Sim (com motivo)     | Sim                  | Sim                 |

## Anti-desvio (controles no sistema + praticas na loja)

### Ja implementado no sistema
1. **Toda venda passa pelo PDV** — baixa automatica no estoque
2. **Login individual** — cada venda fica vinculada ao funcionario
3. **Auditoria completa** — quem alterou estoque, quando e por que
4. **Ajuste de estoque so para admin** — com motivo obrigatorio
5. **Inventario periodico** — compara prateleira vs sistema
6. **Vendedor nao edita produtos** — nao consegue "inventar" saidas
7. **Estorno de vendas** — admin pode estornar venda, devolvendo estoque automaticamente
8. **Logout automatico** — sessao expira apos 15 min sem atividade

### Recomendacoes operacionais (fora do software)
1. **Regra da loja:** nenhum produto sai sem passar pelo PDV — inclusive brindes
2. **Cameras** na area de caixa e estoque (dissuasao + evidencia)
3. **Inventario surpresa** semanal ou quinzenal
4. **Conferencia de caixa** no fim do turno (vendas do sistema vs dinheiro/Pix)
5. **Etiquetas com codigo de barras** em todos os produtos — dificulta venda "por fora"
6. **Produtos de alto valor** em vitrine fechada ou com alarme
7. **Politica clara** de consequencias por desvio (contrato de trabalho)

## Dados

Os dados ficam no PostgreSQL gerenciado pelo Neon. Faca backup regularmente via dashboard do Neon (Export Data ou SQL Editor).
