# Minha Loja — Simulação Corporativa

Jogo de simulação de varejo com **React**, **Node**, **Prisma** e **SQLite** (arquivo local — **não precisa instalar PostgreSQL**).

## Por que outro projeto “não precisava” de PostgreSQL?

Em muitos projetos o banco é um destes:

| Tipo | O que é |
|------|---------|
| **SQLite** | Um arquivo `.db` na pasta do projeto (é o que usamos aqui) |
| **Nuvem** | Supabase, Neon — só cola a URL no `.env` |
| **Docker** | PostgreSQL roda em container, sem instalar no Windows |

Este projeto usa **SQLite em desenvolvimento**, igual vários tutoriais com Prisma.

## Modelo de participação

- **Facilitador**: cria a sessão, compartilha o PIN e avança as fases/rodadas.
- **Empresas**: **1 pessoa por empresa**; quantas empresas quiser.
- Rodadas usam apenas empresas que **enviaram o plano** na fase de configuração.

## Configuração rápida (sem PostgreSQL)

**1. Copiar variáveis de ambiente**

```bash
copy apps\api\.env.example apps\api\.env
```

No Windows PowerShell também pode usar: `Copy-Item apps/api/.env.example apps/api/.env`

**2. Instalar e criar o banco (arquivo `dev.db`)**

```bash
cd C:\Users\peume\Downloads\minha-loja-game
npm install
npm run db:setup
```

**3. Rodar**

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001  
- Health: http://localhost:3001/api/health → `"database": "connected"`

O banco fica em: `apps/api/prisma/dev.db`

## Fluxo do jogo

1. Facilitador → **Criar nova sessão** → PIN e painel.
2. Empresas → **Entrar no jogo** (PIN + empresa + nome).
3. Facilitador avança as fases até o resultado final.
4. Telão: `/telao?session=ID`

## Comandos úteis

| Comando | Descrição |
|---------|-----------|
| `npm run db:setup` | Gera o Prisma Client e cria/atualiza o SQLite |
| `npm run db:studio` | Abre o Prisma Studio (ver dados) |
| `npm run db:migrate` | Migrations (se alterar o schema) |

## Estrutura

- `apps/web` — React + Vite
- `apps/api` — Express + Socket.io + Prisma
- `apps/api/prisma/schema.prisma` — schema do banco
- `packages/game-engine` — cálculos do jogo
- `packages/shared-types` — tipos compartilhados

## Quer PostgreSQL depois? (opcional)

Só se for publicar em produção ou preferir Postgres: use Supabase/Neon (URL na nuvem) ou Docker — não é obrigatório para desenvolver localmente.
