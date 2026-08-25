# CRPP

Centro de Relacionamento de Produtividade Pessoal — painel de produtividade pessoal do Leandro. Next.js (App Router) + Supabase (Postgres + Auth) + Vercel, com suporte a instalação como PWA no celular.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** — Postgres com RLS por `user_id`, Auth (email + senha)
- **Vercel** — deploy automático a cada push

## Desenvolvimento local

```bash
npm install
npm run dev
```

Crie um `.env.local` com:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Funcionalidades

- Lista do dia / semana + backlog sem data, captura rápida, drag-reorder
- Modos Hoje / Semana / Dashboard
- Tarefas recorrentes (diária/semanal/mensal/anual) com escopo de edição/exclusão
- Cronômetro play/pausa (um único ativo por vez)
- Hábitos e blocos fixos com registro manual de minutos por dia
- Velocidade de execução (+/++/+++) e ordenação "Rápidas primeiro"
- Painel de horas do dia e Dashboard (categorias, prioridade, concluídas x pendentes)
- Instalável como PWA (manifest + ícones)

## Schema

O schema relacional (tasks, habits, habit_logs, fixed_blocks, fixed_block_logs, task_series, settings, active_timer) vive no projeto Supabase, com RLS habilitado em todas as tabelas (`auth.uid() = user_id`), pensado para multiusuário desde o início.
