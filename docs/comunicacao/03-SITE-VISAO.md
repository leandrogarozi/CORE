# Site do FARO: visão geral

Versão de 01/11/2026. Este é o briefing do site. (O arquivo `SITE-FARO.md` do pacote é a versão anterior, mantida para consulta; **vale este aqui.**)

## 1. Objetivo
Um site que **mostra o FARO**: abre com o **vídeo de boas-vindas** e desce pelas partes do app (os mesmos assuntos dos capítulos de vídeo), com a **cara do FARO**. Convida para o teste fechado.

## 2. Endereços (decisão do dono, 01/11/2026)
- **Site:** `www.soufaro.app.br`.
- **Login do app, depois:** `www.soufaro.app.br/login`.
- **Hoje:** o app roda em `soufaro.app.br` (sem `www`) e **os testadores o instalaram na tela inicial desse endereço**. Hoje `www.soufaro.app.br` apenas redireciona para `soufaro.app.br`.

**Passo 1 (agora, o site):** o `www` passa a apontar para o **projeto do site** (projeto novo na Vercel) e **deixa de redirecionar** para o app. O app continua em `soufaro.app.br`. Quem já instalou o app **não é afetado**.

**Passo 2 (depois, o login em `www.soufaro.app.br/login`):** atenção a um fato técnico. O app instalado e as inscrições de notificação ficam presos ao **endereço de origem** (`soufaro.app.br`). Mover o app de verdade para `www.soufaro.app.br` obriga cada testador a **reinstalar e religar as notificações**, e exige atualizar: endereços de login no Supabase, redirecionamentos do Google, endereço do webhook do WhatsApp na Meta e a variável do endereço do site. Duas formas de fazer:
- **A (recomendada para agora):** `www.soufaro.app.br/login` **redireciona** para `soufaro.app.br/login`. Para a pessoa, o endereço bonito existe, e **nada quebra**.
- **B (depois, com calma):** mover o app inteiro para `www.soufaro.app.br` (ou trocar: site na raiz e app em um subdomínio). Fazer **antes** de muita gente instalar, com aviso aos testadores.

## 3. Regras de conteúdo
- **Não inventar:** depoimentos, números de usuários, clientes, preços, selos, métricas.
- Dizer a verdade do teste: "teste inicial fechado, pode falhar, há um canal de feedback".
- **Privacidade é argumento:** cada pessoa vê só os seus dados; saúde, senhas e dados bancários nunca vão para a IA; a IA propõe e só age depois do OK.
- Tom: humano, direto, sem jargão técnico, português do Brasil.
- Telas do app: **dados de exemplo inventados**, capturas reais de hoje.
- Rodapé: Termos (`/termos`) e Política de Privacidade (`/privacidade`) do app; e-mail de contato real (**[DONO]**: ainda não existe).

## 4. Estrutura da página (mobile primeiro)
| # | Seção | Conteúdo | Vídeo |
|---|---|---|---|
| 1 | **Topo** | "Seu caminho para manter o foco, ação, rotina e objetivos", frase de apoio e o botão do teste | Boas-vindas |
| 2 | Para quem é | Profissionais e empreendedores que tocam trabalho e vida pessoal ao mesmo tempo | Cena "bagunça que se organiza" |
| 3 | Seu dia | Hoje, tarefas, atrasos | cap-01 |
| 4 | Avisos onde você quiser | Sino no app e WhatsApp | cap-02 |
| 5 | Reuniões e projetos | Convites pelo Google Agenda, etapas com barra | cap-03 |
| 6 | O assistente FARO | Fala ou escreve; cartão de confirmação; você decide | cap-04 |
| 7 | Casa e rotina | Dispensa, Manutenção, Compras, Checklists, Dieta, Água, Remédios | cap-05 a 08, 11 |
| 8 | Aprender | Conhecendo você, Metanoia, Sinapses, Ideias, Livros, Plano de Estudo | cap-09, 10 |
| 9 | Privacidade | "Você decide": 3 compromissos em cartões | Tela de confirmação |
| 10 | Como começar | 3 passos: instalar na tela inicial, ligar avisos, conversar com o FARO | cap-12 |
| 11 | Perguntas frequentes | Preço (ainda não definido: "teste fechado"), onde ficam os dados, iPhone e Android, WhatsApp | |
| 12 | Convite final | Botão do teste, contato, Termos e Privacidade | |

## 5. Botão principal
O teste é fechado. O botão não pode prometer cadastro livre. Opções (**[DONO]** escolhe): (a) "Quero testar" → formulário de espera; (b) conversa no WhatsApp do dono; (c) "Já tenho acesso" → `/login`.

## 6. Técnica
- Página rápida (Next.js estático ou HTML) numa **nova** projeto Vercel, **sem tocar no app** (`core-app`). Sem banco nem login no site.
- Vídeos com `poster`, legenda e carregamento sob demanda (MP4 + WebM).
- Acessibilidade: contraste, texto alternativo, legenda, alvos de toque de 44 px.
- Métrica simples, sem dados pessoais; se usar, avisar na Política.
- Meta tags e imagem de compartilhamento (WhatsApp/Instagram) com o ícone e o degradê do FARO.

## 7. Marca
Usar a identidade do **FARO** (ver `04-BRANDING-MAPA.md`). O dono tem também a marca pessoal/estúdio (Garozi): **não misturar**. No site do FARO o nome do dono aparece só como "criado por".

## 8. Fluxo de aprovação (processo do dono)
Mostrar **layout ou protótipo antes de construir**; ele aprova; só então construir. Não publicar sem OK.

## 9. Pendências
- [ ] Dono: botão do teste (a/b/c) e e-mail de contato real.
- [ ] Dono: frase "por que criei o FARO".
- [ ] Configurar o `www` na Vercel para o projeto do site (passo 1) sem derrubar o app.
- [ ] Decidir se o passo 2 será A (redirecionar) ou B (mover o app) e quando.
- [ ] Capturas reais das telas (conta de demonstração).
- [ ] Layout aprovado → construir → publicar.
