# Brinquedoteca

Sistema de estoque e vendas presenciais para loja de brinquedos, projetado com interface premium **SaaS Premium** de alta fidelidade visual, excelente UX/UI móvel e controles rígidos de segurança.

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
# Iniciar o servidor de desenvolvimento
npm run dev

# Executar testes unitários (Vitest)
npm run test
```

Acesse [http://localhost:3000](http://localhost:3000)

**Login inicial:** `admin@loja` / `admin123` (troque a senha depois)

As tabelas e o usuário admin são criados automaticamente na primeira execução.

## Deploy (Vercel + Neon)

1. Crie um repositório no GitHub e faça push do código
2. Crie uma conta gratuita no [Neon](https://neon.tech) e crie um projeto (PostgreSQL 17)
3. Copie a `DATABASE_URL` de conexão do Neon
4. No [Vercel](https://vercel.com), importe o repositório do GitHub
5. Adicione as environment variables:
   - `DATABASE_URL` — string de conexão do Neon
   - `JWT_SECRET` — frase aleatória para assinatura JWT
6. Faça deploy — as tabelas são criadas automaticamente na primeira request

## Tecnologias

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Gráficos | Recharts (Customizado com gradients e glassmorphism tooltips) |
| Ícones | Lucide React |
| Banco de dados | PostgreSQL (Neon) + Drizzle ORM + postgres.js |
| Autenticação | JWT (jose) + bcryptjs |
| PDF | jsPDF + jspdf-autotable |
| Geração de Código de barras | JsBarcode (geração de etiquetas) |
| Fontes | Geist Sans / Geist Mono + **Inter** (Display de métricas) |
| Hospedagem | Vercel (frontend + API) + Neon (banco de dados) |
| Analiticas | @vercel/speed-insights |
| Datas | date-fns |
| Testes | Vitest |

## Estrutura do projeto

```
src/
├── proxy.ts                       # Proxy de autenticação (verificação de sessão)
├── app/                           # Rotas (Next.js App Router)
│   ├── globals.css               # Estilos globais (Tailwind)
│   ├── layout.tsx                # Layout raiz
│   ├── page.tsx                  # Página raiz (redirect)
│   ├── error.tsx                 # Error boundary global
│   ├── not-found.tsx             # Página 404 personalizada
│   ├── api/                      # API routes (REST)
│   │   ├── auth/                 #   Login, logout, troca de senha
│   │   ├── auditoria/            #   Log de movimentações de estoque (Admin-only)
│   │   ├── dashboard/            #   Dados do dashboard (Admin-only)
│   │   ├── inventario/           #   Sessões de inventário (Admin-only)
│   │   ├── produtos/             #   CRUD produtos + busca por barcode
│   │   ├── relatorios/           #   Dados dos relatórios (Admin-only)
│   │   ├── usuarios/             #   CRUD usuários (Admin-only)
│   │   └── vendas/               #   Vendas + estorno
│   ├── auditoria/page.tsx        # Página de auditoria (Admin-only)
│   ├── inventario/page.tsx       # Página de inventário (Admin-only)
│   ├── login/page.tsx            # Login
│   ├── perfil/                   # Perfil do usuário (Vendedor/Admin)
│   │   ├── page.tsx              #   Página de perfil
│   │   └── PerfilClient.tsx      #   Componente de perfil (Client-side)
│   ├── produtos/                 # CRUD produtos (listar/novo/editar) (Admin-only)
│   │   ├── page.tsx              #   Lista de produtos
│   │   ├── novo/page.tsx         #   Adicionar produto
│   │   └── [id]/editar/page.tsx  #   Editar produto
│   ├── relatorios/page.tsx       # Relatórios (Admin-only)
│   ├── trocar-senha/page.tsx     # Troca de senha
│   ├── usuarios/page.tsx         # Gerenciar usuários (Admin-only)
│   └── vendas/                   # PDV + histórico
│       ├── page.tsx              #   Página do PDV (Frente de Caixa)
│       └── historico/page.tsx    #   Página de histórico de vendas
├── components/                   # Componentes React
│   ├── AppShell.tsx              # Layout autenticado com controle de rotas por papel
│   ├── AuditoriaView.tsx         # View de auditoria (Linha do Tempo / Activity Feed)
│   ├── Breadcrumbs.tsx           # Geração de Breadcrumbs
│   ├── ConfirmDialog.tsx         # Modal de confirmação
│   ├── DashboardView.tsx         # Dashboard com sparklines e heatmap
│   ├── EmptyState.tsx            # Estados vazios ilustrados (8 tipos)
│   ├── GlobalSearch.tsx          # Busca global (Ctrl+K)
│   ├── IdleTimer.tsx             # Logout por inatividade
│   ├── InventarioView.tsx        # View de inventário
│   ├── LabelPrinter.tsx          # Impressão de etiquetas
│   ├── Nav.tsx                   # Sidebar de navegação + Barra superior móvel
│   ├── OptimizedImage.tsx        # Imagem com lazy loading e fallback
│   ├── Pagination.tsx            # Componente de paginação
│   ├── PerfilView.tsx            # View de perfil
│   ├── POSView.tsx               # Ponto de venda (PDV) com atalhos de teclado
│   ├── ProductDetailModal.tsx    # Modal de detalhes do produto (SaaS premium)
│   ├── ProductForm.tsx           # Formulário de produto
│   ├── ProdutosView.tsx          # View de produtos (Cards premium + tabela tabular)
│   ├── RelatoriosView.tsx        # View de relatórios com gráficos estilizados
│   ├── RoutePreloader.tsx        # Prefetch de rotas críticas
│   ├── ShortcutHelp.tsx          # Ajuda de atalhos de teclado
│   ├── Skeleton.tsx              # Loading skeletons
│   ├── StockAdjustModal.tsx      # Modal de ajuste de estoque
│   ├── ThemeProvider.tsx         # Provider do tema (dark/light/system)
│   ├── Toast.tsx                 # Sistema de notificações
│   ├── UsuariosView.tsx          # View de usuários
│   └── VendasHistoricoView.tsx   # Histórico de vendas em cartões interativos
├── hooks/                        # Custom hooks React
│   ├── useDebounce.ts            # Debounce para buscas
│   ├── useKeyboardShortcuts.ts   # Atalhos de teclado (PDV)
│   └── usePreferences.ts         # Preferências do usuário
├── lib/                          # Utilitários e lógica
│   ├── api.ts                    # Helpers de error handling para API
│   ├── auth.ts                   # Autenticação (JWT, sessão)
│   ├── db.ts                     # Conexão PostgreSQL (postgres.js) + helpers
│   ├── format.ts                 # Formatação (moeda, data)
│   ├── format.test.ts            # Teste unitário de formatação
│   ├── sanitize.ts               # Sanitização de inputs (XSS)
│   ├── sanitize.test.ts          # Teste unitário de sanitização
│   ├── schema.ts                 # Schema Drizzle ORM (tabelas do banco)
│   └── types.ts                  # Tipagens TypeScript
├── drizzle.config.ts             # Config do Drizzle Kit (migrations)
└── middleware.ts                 # Middleware de autenticação
```

## Funcionalidades e Melhorias Premium (Visual SaaS)

### 💎 Design System & UX Premium
* **Tipografia de Alta Definição:** Integração da fonte **Inter** com alinhamento tabular (`tabular-nums`) para números, moedas e métricas de faturamento, gerando visual limpo e simétrico.
* **Tema Escuro Moderno:** Cores escuras refeitas para tons de grafite escuros de alta gama (estilo Vercel/Linear), com contrastes balanceados e suporte automático ao **Tema do Sistema Operacional (OS Scheme)**.
* **Barra de Navegação Superior Sticky:** Layout mobile atualizado com um cabeçalho fixo no topo (`fixed top-0`), acomodando o menu hambúrguer, o logo da empresa, e atalhos de tema e perfil com efeito de vidro embaçado (`backdrop-blur-md`).
* **iOS-Style Toggle Switch:** Switch de ligar/desligar no estilo iPhone integrado na barra de navegação para ativação de modo escuro com animações de deslizamento e cores correspondentes.
* **Modal Inteligente para Smartphones:** O modal de detalhes do brinquedo foi redimensionado ergonomicamente (`max-h-[90dvh]`), possuindo rolagem independente e botões de ação e fechamento fixos para fácil manuseio no mobile.

### 📊 Dashboard
* **Sparklines nos Cards:** Mini-gráficos dinâmicos SVG embutidos nos cards de estatísticas para indicação visual imediata da flutuação de vendas.
* **Mapa de Calor (Heatmap):** Gráfico de atividade de vendas agrupado por hora do dia.
* **Auto-refresh inteligente:** Atualizações em segundo plano a cada 30 segundos com indicador de tempo decorrido.

### 🛍️ PDV (Ponto de Venda)
* **Atalhos Assistidos:** Exibição visual de tags `<kbd>` sinalizando atalhos como `F2` (Desconto) e `F4` (Finalizar).
* **Feedback de Carrinho:** Micro-interações táteis no carrinho com animações de pulso (`animate-bounce-subtle`) a cada inclusão de brinquedos.
* **Busca Rápida:** Filtros instantâneos por nome, código de barras e lista de itens mais acessados.

### 🕒 Auditoria e Linha do Tempo
* **Activity Feed:** Substituição de tabelas estáticas por um fluxo de atividades cronológico com ícones detalhados para cada alteração física de estoque, fluxo numérico (`Estoque Anterior` ➔ `Novo`) e justificativas.

### 📈 Relatórios Analíticos (Admin)
* **Gráficos Customizados:** Gráficos com preenchimentos de gradientes degradê e tooltips flutuantes translúcidos com desfoque de fundo.
* **Visualizador de Tabelas Aperfeiçoado:** Renderização em blocos limpos, hover reativo e totalizadores monoespaçados.

---

## Perfis de Usuário e Segurança Rigorosa

### Controle de Acesso por Função (RBAC)

O sistema agora possui restrição total a nível de rota no frontend e na camada de API (`requireAdmin` / `requireAuth`):

| Perfil   | Acesso de Páginas | Cadastro / Edição | Ajustes de Estoque | Inventário / Auditoria | Usuários e Relatórios |
|----------|-------------------|-------------------|--------------------|------------------------|-----------------------|
| Vendedor | **Apenas Vendas / PDV** | Não               | Não                | Não                    | Não                   |
| Admin    | **Todas as páginas** | Sim               | Sim (com justificativa) | Sim | Sim                   |

### Defesas de Segurança Implementadas
1. **Camada API Protegida:** Correção de falhas IDOR/Escalação de privilégios. Endpoints críticos como `/api/relatorios`, `/api/auditoria` e `/api/produtos` (criação) agora exigem validação de perfil de administrador no backend.
2. **Prevenção de SQL Injection:** Parâmetros de consulta sanitizados e encapsulados automaticamente em placeholders parametrizados (`$1`, `$2`) no driver Postgres.
3. **Session Cookies Seguros:** Token JWT armazenado via cookie com propriedades `httpOnly`, `sameSite: "lax"`, e criptografia em produção.
4. **Proteção XSS:** Sanitização em tempo de renderização de campos textuais.
5. **Logout Automático:** Encerramento automático de sessão após 15 minutos de inatividade.
