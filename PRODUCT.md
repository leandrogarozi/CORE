# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Profissionais e empreendedores (confirmado pelo dono, 28/10/2026) que tocam trabalho e vida pessoal ao mesmo tempo e querem foco, rotina e autoconhecimento num lugar só. O primeiro usuário é o dono do produto, Leandro Garozi (coach e facilitador); no **teste inicial fechado** entram pessoas selecionadas do círculo dele, que usam no celular (app instalado, PWA) e no computador. Idioma: português do Brasil.

## Product Purpose

FARO ("Foco, Ação, Rotina e Objetivos") é um painel pessoal de produtividade: o dia (tarefas, agenda, reuniões, lembretes, hábitos, horas), a rotina (saúde, dieta, medicamentos, compras, manutenção, checklists) e o aprendizado (Conhecendo você, Metanoia, Sinapses, Ideias, Livros, Plano de Estudo) juntos. Sucesso: a pessoa abre o FARO todos os dias, sabe o que fazer agora e o que ficou para trás, e sente que o app a conhece. Meta imediata: um teste inicial fechado, estável e confiável, antes de qualquer abertura ao público.

## Positioning

Tarefas e agenda **mais** aprendizado pessoal **mais** uma IA que conhece a pessoa (confirmado pelo dono). O assistente (o "cachorrinho") usa o que a pessoa aprovou sobre si mesma e só age depois do OK dela. Um app de tarefas comum não tem a camada de autoconhecimento (Metanoia, Sinapses, Conhecendo você) nem o assistente que a usa.

## Operating Context

- Instalado como app (PWA) no celular e no computador; avisos por push, sininho dentro do app e WhatsApp.
- Reuniões e eventos vão para o Google Agenda de cada pessoa ("Conectar com o Google"); convidados recebem o convite do Google.
- Backup diário interno de cada conta, backups manuais e conector para outras IAs (Claude, ChatGPT) que leem o que a pessoa aprovou.
- Teste fechado em `soufaro.app.br`; contato e feedback pelo Canal de feedback dentro do app.

## Capabilities and Constraints

- Next.js (App Router) + Supabase (Postgres, Auth, RLS por usuário) + Vercel. Veja README.md e BRIEFING.md.
- Cada pessoa vê **somente os seus dados** (RLS). Existe uma área "Particular do dono" que só a conta do dono vê.
- Dados de **saúde, senhas e dados bancários nunca vão para a IA** (regra da Política de Privacidade e do conector).
- **Nada importante muda sem o OK da pessoa:** o assistente propõe, mostra o que vai fazer e só age depois da confirmação.
- Google: a sincronização é de mão única (FARO → Google). Mão dupla, repetição de lembretes por lista e o app financeiro integrado ("Em breve") são decisões futuras, ainda não feitas.
- Decisões em aberto: como os testadores recebem WhatsApp (número de teste da Meta tem limite de destinatários); IA com a chave de cada cliente; verificação do app no Google antes de abrir ao público.

## Brand Commitments

- Nome: FARO. Assinatura: "Seu caminho para manter o foco, ação, rotina e objetivos" (usada na tela de entrada).
- Marca: robô branco em fundo azul-roxo (`design/icone-app/`, versão A) e o nome FARO em Poppins ExtraBold roxo, layout aprovado pelo dono na prancha "Layouts FARO" (página 6).
- Tom: humano e direto, sem jargão técnico na tela; português do Brasil. (Inferido do texto do app; confirmar se mudar.)
- O dono aprova layouts **por print ou desenho antes de publicar**: ver `design/sistema-de-design/SKILL.md` e a prancha Layouts FARO.

## Evidence on Hand

- `BRIEFING.md`: decisões de produto e backlog, com data.
- `design/sistema-de-design/`: o sistema de design provado no app (tokens, regras).
- Prancha "Layouts FARO" (artefato publicado): telas aprovadas e propostas.
- `docs/ENSAIO-COM-2-CONTAS.md`, `docs/google-cloud-oauth.md`, `docs/EMAILS-DO-SUPABASE.md`: operação do teste.
- **Não existem** depoimentos, clientes pagantes, métricas de uso ou preços. Nada disso deve ser inventado em textos do app.

## Product Principles

1. **Privacidade antes de conveniência:** saúde, senhas e dados bancários ficam fora da IA; cada pessoa vê só o que é dela.
2. **A pessoa decide:** o FARO sugere e mostra; nada importante muda sem o OK.
3. **Foco no dia:** a tela principal responde "o que faço agora e o que ficou para trás", sem poluição.
4. **Cadastrar uma vez só:** uma reunião, um lembrete ou uma lista não podem exigir o mesmo cadastro em dois lugares.
5. **Teste honesto:** é um teste inicial; avisar o que pode falhar e facilitar o feedback.
