# Índice da documentação do FARO (onde está cada coisa)

Atualizado em 01/11/2026. Se algo não estiver aqui, está no `BRIEFING.md` (procurar pela data).

## Para retomar uma conversa
1. `BRIEFING.md`: no topo, o quadro **"Próximos passos e revisões"**; depois, as decisões por data. Procurar "01/11" para o mais recente.
2. `CLAUDE.md` e `AGENTS.md`: regras para quem trabalha no código (ler o `DESIGN.md` antes de mexer em tela).
3. `DESIGN.md`: sistema visual e a seção **"Padrão do celular e dos controles"** (valer para tudo que for criado ou ajustado).
4. `PRODUCT.md`: quem usa, para que serve, posicionamento e regras de conteúdo (nada de inventar depoimento, número ou preço).

## Documentos em `docs/`
| Arquivo | Assunto |
|---|---|
| `VIDEO-COMO-USAR.md` | Roteiros dos vídeos (boas-vindas e 12 capítulos), identidade e plano de telas reais |
| `comunicacao/` | **Pacote do projeto de comunicação** (visão geral, vídeos, site, branding, funcionalidades, novidades) e o `.zip` pronto para levar |
| `SITE-FARO.md` | Briefing do site de apresentação (estrutura, regras, texto para colar no projeto do site) |
| `MAPA-IA-E-FARO.md` | O que o assistente e o conector externo fazem (tabela de ações) |
| `LAYOUT-FARO.md` | Layout aprovado em 22/10 |
| `CADASTRO-DE-CLIENTES.md` | Funil de cadastro de clientes pelas LPs |
| `EMAILS-DO-SUPABASE.md` | E-mails de confirmação em português |
| `google-cloud-oauth.md` | Passo a passo do Google Cloud |
| `ENSAIO-COM-2-CONTAS.md` | Ensaio geral com duas contas |
| `sql/` | Scripts de banco |

## Marca e desenho
- `public/marca/` e `design/icone-app/`: ícone "Novo A" (SVG/PNG), `public/faro-mascote.svg`, `public/faro-logo.png`.
- `design/sistema-de-design/`: o sistema de design do app.
- Pranchas de layout (artefato publicado, "Layouts FARO"): são **referência de decisão**, não a tela de hoje; para a tela real use o app ou as capturas de `design/video/telas/` (a fazer).

## Onde fica o quê no código
- Telas: `src/components/board/` (uma por assunto); menu: `Sidebar.tsx`, `MobileNav.tsx`, `DockFaro.tsx`.
- Estilo: `src/app/globals.css` (blocos no fim do arquivo por data); estilo/tema: `src/lib/estilo.ts` e `GuardaDoEstilo.tsx`.
- Assistente (IA do app): `src/lib/ia/` (`ferramentas.ts`, `executar.ts`, `conversa.ts`, `resumo-do-dia.ts`); conector externo: `src/lib/conector/`.
- Dados: Supabase (projeto `dfrqgwpujodnwpbsgdrq`); publicação: Vercel (`core-app`), deploy automático da branch `claude/new-session-7uftof`.
- Texto do "Como usar": `src/lib/tutorial.ts`.

## Regra de manutenção
Toda decisão ou mudança entra no `BRIEFING.md` com a data; todo documento novo entra neste índice.
