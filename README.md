# Brinquedoteca

Sistema de estoque e vendas presenciais para loja de brinquedos.

## Como rodar

```bash
cd ~/Projects/brinquedoteca
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

**Login inicial:** `admin@loja` / `admin123` (troque a senha depois)

## Funcionalidades

- **Dashboard** — vendas do dia/mês, estoque, alertas de estoque baixo
- **PDV** — ponto de venda com leitor de código de barras USB
- **Brinquedos** — cadastro com código de barras, preço e estoque mínimo
- **Histórico** — todas as vendas com vendedor e itens
- **Inventário** — contagem física vs sistema (detecta desvios)
- **Auditoria** — log de toda movimentação de estoque

## Leitor de código de barras

Leitores USB comuns funcionam como teclado — basta focar o campo de scan no PDV ou Inventário e escanear. Não precisa de driver especial. Modelos recomendados: qualquer leitor 1D/2D USB entre R$ 80–200.

## Perfis de usuário

| Perfil   | Pode vender | Pode cadastrar | Pode ajustar estoque | Inventário/Auditoria |
|----------|-------------|----------------|----------------------|----------------------|
| vendedor | Sim         | Não            | Não                  | Não                  |
| admin    | Sim         | Sim            | Sim (com motivo)   | Sim                  |

## Anti-desvio (controles no sistema + práticas na loja)

### Já implementado no sistema
1. **Toda venda passa pelo PDV** — baixa automática no estoque
2. **Login individual** — cada venda fica vinculada ao funcionário
3. **Auditoria completa** — quem alterou estoque, quando e por quê
4. **Ajuste de estoque só para admin** — com motivo obrigatório
5. **Inventário periódico** — compara prateleira vs sistema
6. **Vendedor não edita produtos** — não consegue "inventar" saídas

### Recomendações operacionais (fora do software)
1. **Regra da loja:** nenhum produto sai sem passar pelo PDV — inclusive brindes
2. **Câmeras** na área de caixa e estoque (dissuasão + evidência)
3. **Inventário surpresa** semanal ou quinzenal
4. **Conferência de caixa** no fim do turno (vendas do sistema vs dinheiro/Pix)
5. **Etiquetas com código de barras** em todos os produtos — dificulta venda "por fora"
6. **Produtos de alto valor** em vitrine fechada ou com alarme
7. **Política clara** de consequências por desvio (contrato de trabalho)

## Dados

O banco SQLite fica em `data/brinquedoteca.db` — faça backup regularmente.
