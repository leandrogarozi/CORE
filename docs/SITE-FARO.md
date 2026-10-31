# Site do FARO: briefing para construir em outro projeto

> **Versão anterior.** A versão atual, com os endereços decididos em 01/11/2026 (`www.soufaro.app.br`), está em `docs/comunicacao/03-SITE-VISAO.md`.

Ideia do Leandro (01/11/2026): um site que **mostra o FARO**. Começa com o **vídeo de boas-vindas** e vai descendo pelas partes do app (os mesmos assuntos dos capítulos do "Como usar"). Tem de ter a **cara do FARO**. Será construído **fora do Code**, no projeto onde ele já tem as skills de site; este arquivo é o que se leva para lá.

## 1. Decisões que o dono precisa tomar

| Decisão | Sugestão | Observação |
|---|---|---|
| **Onde fica o site** | Projeto novo (repositório próprio e projeto próprio na Vercel), **não** dentro do app | O app (`core-app`) é o produto; mexer nele para publicar um site arrisca o teste fechado |
| **Endereço** | Não trocar o do app. Hoje `soufaro.app.br` é o app: os testadores instalaram ele na tela inicial | Mudar o endereço do app quebraria a instalação deles. Opções: (a) site num subdomínio, por exemplo `sobre.soufaro.app.br`; (b) outro domínio; (c) depois do teste, site na raiz e app em `app.soufaro.app.br`, com aviso aos testadores |
| **O que o botão principal faz** | "Quero testar" → formulário de espera, ou conversa no WhatsApp do dono | O teste é fechado: não prometer cadastro livre. Decidir onde caem os contatos |
| **Idioma** | Português do Brasil | |
| **Formato do vídeo no topo** | 9:16 no celular (e 16:9 no computador, se houver versão) | Ver `docs/VIDEO-COMO-USAR.md` |

## 2. Regras de conteúdo (do `PRODUCT.md`)

- **Não inventar:** depoimentos, números de usuários, clientes, preços, selos ou métricas. Nada disso existe ainda.
- Dizer a verdade do teste: "teste inicial fechado, pode falhar, tem canal de feedback".
- **Privacidade é argumento:** cada pessoa vê só os seus dados; saúde, senhas e dados bancários **nunca vão para a IA**; a IA propõe e **só age depois do OK**.
- Tom: humano, direto, sem jargão técnico, frases curtas.
- Telas do app: **só dados de exemplo inventados** (ver `docs/VIDEO-COMO-USAR.md`, seção 5: conta de demonstração e capturas reais).
- Links obrigatórios no rodapé: Termos (`/termos`) e Política de Privacidade (`/privacidade`) do app; e-mail de contato real (ainda a definir).

## 3. Identidade visual

Seguir `DESIGN.md` (seção "Padrão do celular e dos controles") e o `docs/VIDEO-COMO-USAR.md` (seção 2).

- Ícone "Novo A" (SVGs em `public/marca/`), mascote (`public/faro-mascote.svg`), nome FARO em Poppins ExtraBold com degradê.
- Degradê roxo `#4A47D5` → `#7C4DF0`; WhatsApp `#1E8E55` → `#3FC47E`; fundo `#F7F7FA`; texto Inter; cartões brancos flutuantes de 16 px; botões e segmentos totalmente redondos.
- Assinatura do app: "Seu caminho para manter o foco, ação, rotina e objetivos".
- **Atenção à marca:** o FARO tem a **marca própria dele**. O dono tem também a marca pessoal/estúdio (Garozi). Não misturar: o site do FARO usa as cores e a fonte do FARO, e o nome do dono aparece só como "criado por".

## 4. Estrutura da página (mobile primeiro)

| # | Seção | Conteúdo | Vídeo/tela |
|---|---|---|---|
| 1 | **Topo (hero)** | Título "Seu caminho para manter o foco, ação, rotina e objetivos", uma frase de apoio e o botão do teste | **Vídeo de boas-vindas** (autoplay mudo com legenda, ou play com som) |
| 2 | **Para quem é** | Profissionais e empreendedores que tocam trabalho e vida pessoal ao mesmo tempo | Cena de "bagunça que se organiza" |
| 3 | **Seu dia** | Hoje, tarefas, atrasos, Semana | cap-01 |
| 4 | **Avisos onde você quiser** | Lembretes: sino no app e WhatsApp | cap-02 |
| 5 | **Reuniões e projetos** | Convites pelo Google Agenda, etapas com barra | cap-03 |
| 6 | **O assistente FARO** | Fala ou escreve; cartão de confirmação; você decide | cap-04 (destaque) |
| 7 | **Casa e rotina** | Dispensa, Manutenção, Compras, Checklists, Dieta, Água, Medicamentos | cap-05 a cap-08, cap-11 |
| 8 | **Aprender** | Conhecendo você, Metanoia, Sinapses, Ideias, Livros, Plano de Estudo | cap-09, cap-10 |
| 9 | **Privacidade** | "Você decide": 3 compromissos em cartões | tela de confirmação |
| 10 | **Como começar** | 3 passos: instalar na tela inicial, ligar avisos, conversar com o FARO | cap-12 |
| 11 | **Perguntas frequentes** | É pago? (ainda não definido: dizer "teste fechado"), onde ficam meus dados, serve para iPhone e Android, WhatsApp | |
| 12 | **Convite final** | Botão do teste + contato + links de Termos e Privacidade | |

Cada seção usa o **capítulo de vídeo** correspondente (loop curto de ~6 s ao rolar; vídeo completo ao tocar), para o site e o "Como usar" do app reaproveitarem o mesmo material.

## 5. Técnica sugerida

- Página estática rápida (Next.js estático ou HTML), publicada numa **nova** projeto Vercel. Nada de banco nem login.
- Vídeos em arquivo próprio (MP4 + WebM), com `poster` e legenda; carregamento sob demanda para o celular não baixar tudo.
- Acessibilidade: contraste, texto alternativo nas telas, vídeo com legenda, botões com 44 px de toque.
- Métrica simples e respeitosa (sem rastrear dados pessoais); avisar na Política se usar.

## 6. O que levar para o projeto do site

Anexar (ou dar leitura ao repositório `leandrogarozi/CORE`):
1. `docs/SITE-FARO.md` (este arquivo)
2. `docs/VIDEO-COMO-USAR.md` (roteiros, identidade, plano de telas)
3. `PRODUCT.md` (posicionamento e regras de conteúdo)
4. `DESIGN.md` (padrão visual)
5. `public/marca/` e `public/faro-mascote.svg` (marca)
6. `design/video/telas/` (telas reais com dados fictícios, quando eu fizer as capturas)

## 7. Texto para colar no projeto do site

> Construa o site de apresentação do FARO (app pessoal de foco, ação, rotina e objetivos) em português do Brasil, mobile primeiro, seguindo `docs/SITE-FARO.md`. Use a identidade do FARO (`DESIGN.md` e a seção de identidade do `docs/VIDEO-COMO-USAR.md`), não a marca pessoal do dono. Estrutura e regras de conteúdo estão no arquivo; não invente depoimentos, números nem preços. O topo é o vídeo de boas-vindas; cada seção usa o capítulo de vídeo correspondente. Antes de construir, me mostre o layout (desenho ou protótipo) para aprovação, como é o meu processo. Publicar numa projeto Vercel nova, sem tocar no app.

## 8. Pendências

- [ ] Dono: decidir endereço do site e o que o botão "Quero testar" faz.
- [ ] Dono: e-mail de contato real (também falta nos Termos).
- [ ] Dono: frase "por que criei o FARO" (vídeo de boas-vindas).
- [ ] Claude: conta de demonstração e capturas reais (precisa do OK do dono).
- [ ] Projeto do site: layout para aprovação antes de construir.
- [ ] Depois: botão "Ver em vídeo" em cada assunto do "Como usar" do app.
