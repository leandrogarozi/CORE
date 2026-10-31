# Vídeos do "Como usar" do FARO: briefing, roteiros e como organizar as telas

Documento para levar ao projeto de edição de vídeo. O vídeo é só **motion graphics com narração**, sem gravação de pessoas. Ele fica dentro da tela "Como usar" do app (e pode ser usado em convite e redes).

## 1. Decisões a tomar antes de começar (o dono escolhe)

| Decisão | Sugestão | Por quê |
|---|---|---|
| Formato | **Vertical 9:16** (1080×1920) | O app é usado no celular e o "Como usar" abre no celular |
| Estrutura | **1 vídeo de boas-vindas (45 a 60 s) + capítulos de 30 a 40 s**, um por assunto | O FARO muda toda semana; mudou uma tela, refaz só o capítulo |
| Voz | Uma só, calorosa, ritmo de ~150 palavras por minuto (≈ 2,5 palavras por segundo) | Os roteiros abaixo já estão medidos nesse ritmo |
| Legenda | Sempre ligada (queimada no vídeo) | Muita gente assiste sem som |
| Dados nas telas | **Só dados de exemplo inventados** | Nunca aparecer tarefa, cliente, telefone, remédio ou nome real do dono |

## 2. Identidade visual (para o motion seguir o app)

- **Marca:** ícone "Novo A" (robô branco em fundo roxo degradê): `public/marca/` (SVG), `public/faro-logo.png`; mascote: `public/faro-mascote.svg`. Nome FARO em Poppins ExtraBold, degradê roxo.
- **Cores:** degradê principal `#4A47D5` → `#7C4DF0`; WhatsApp `#1E8E55` → `#3FC47E`; fundo `#F7F7FA`; texto quase preto; verde = concluído, amarelo = atenção, vermelho = atrasado/acabando.
- **Formas:** cartões brancos que "flutuam" (sombra macia, cantos de 16 px), botões e segmentos totalmente redondos, ícones de traço único.
- **Fonte do app:** Inter (texto). Números em mono.
- **Movimento:** suave, curto (200 a 400 ms), cartão entra de baixo com leve sombra; botão que "liga" muda de cinza para o degradê; sem efeitos exagerados.
- **Regra de ouro:** o desenho da tela animada tem de **bater com a tela real** (ver seção 5). Em caso de dúvida, usar o print real, não recriar.
- Referências no repositório: `DESIGN.md` (seção "Padrão do celular e dos controles"), `design/sistema-de-design/`.

## 3. Vídeo de boas-vindas (≈ 55 s)

Objetivo: dizer **o que é o FARO, para quem e por que existe**, e prometer o passo a passo.

| Cena | Tempo | Na tela | Narração |
|---|---|---|---|
| 1 | 0–6 s | Ícone do FARO surge; as quatro letras se abrem: **F**oco, **A**ção, **R**otina, **O**bjetivos | "Bem-vindo ao FARO. Foco, Ação, Rotina e Objetivos." |
| 2 | 6–18 s | Cenas rápidas de bagunça (post-its, listas, abas voando) que se organizam num só painel | "A vida de quem trabalha por conta própria vai para todo lado: tarefas num app, lembretes em outro, ideias no caderno. O FARO junta tudo num lugar só." |
| 3 | 18–32 s | **[O dono grava ou escreve em 1 frase por que criou o FARO]** Texto sugerido: tela do dia, depois o mascote | "Eu criei o FARO porque [preencher: motivo do dono, em 1 ou 2 frases, nas palavras dele]. Ele organiza o seu dia, cuida da rotina e guarda o que você aprende." |
| 4 | 32–44 s | O mascote abre; cartão de confirmação; selo "Você decide" | "E tem um assistente que conhece você. Ele sugere, mostra o que vai fazer, e só age depois do seu OK. Saúde e dados bancários nunca vão para a IA." |
| 5 | 44–55 s | Menu lateral com os grupos (Hoje, Aprender, Pessoas, Saúde e casa) acendendo um a um | "Nos próximos vídeos, mostro cada parte, em menos de um minuto. Vamos começar pelo seu dia." |

Observação: a frase da cena 3 é a única que **só o dono pode escrever**; o resto vem do produto (`PRODUCT.md`).

## 4. Capítulos (30 a 40 s cada), na ordem do menu

Cada capítulo: **tela real necessária**, **o que animar**, **narração (≈ 85 a 100 palavras)**. Convenção de nome: `cap-NN-assunto`.

**cap-01-hoje (Painel e tarefas)**
- Telas: Hoje no celular, tarefa aberta (status, data, prioridade), campo de adicionar.
- Animar: tarefa criada no campo; toque na bolinha concluindo; raios de esforço; tarefa aberta com data e lembrete.
- Narração: "Em Hoje você vê o que importa agora. Escreva a tarefa no campo e aperte Enter. Toque na bolinha para mudar o status, ou concluir. Abra a tarefa para escolher data, hora, prioridade e lembrete. O FARO também mostra o que ficou atrasado, sem te cobrar demais."

**cap-02-lembretes**
- Telas: Lembretes, criação com "Avisar", sino e WhatsApp.
- Animar: o sino roxo acende; o WhatsApp verde acende; linha "Abrir".
- Narração: "Lembrete tem data e hora. Escolha quanto tempo antes quer ser avisado e onde: o sino avisa dentro do app, o verde avisa no WhatsApp. Pode ligar os dois. Toque em Abrir para ver o texto inteiro e a observação."

**cap-03-reunioes-e-projetos**
- Telas: Reuniões (lista e criação com convidados), Projetos (lista com barra de etapas).
- Animar: reunião criada com e-mail de convidado; convite indo para o Google Agenda; barra do projeto enchendo.
- Narração: "Crie reuniões com cliente, data e convidados. Com o Google conectado, o convite sai do Google. Em Projetos, divida o trabalho em etapas e acompanhe pela barra quanto já foi feito."

**cap-04-faro-por-voz**
- Telas: bolinha do FARO, janela do FARO com microfone, cartão de confirmação.
- Animar: ondas de voz; frase falada aparece; cartão "Criar lembrete…" com Confirmar.
- Narração: "Toque no FARO e fale: 'lembrar de ligar para o dentista amanhã às nove'. Ele monta um cartão com o que vai fazer. Você confere e confirma. Funciona para tarefa, lembrete, reunião, água, sono, dispensa, manutenção e muito mais."

**cap-05-anotacoes**
- Telas: Anotações, painel no Dashboard.
- Animar: nota solta chega; FARO sugere o destino; nota vira item da Dispensa.
- Narração: "Teve uma ideia ou uma lista? Anote na hora. O FARO sugere onde guardar: Dispensa, Manutenção ou só Anotações. Depois você revisa, move ou apaga."

**cap-06-dispensa**
- Telas: Dispensa (lista, barra de nível, situação), "Acabando".
- Animar: item passa de verde para vermelho; botão de lembrete de compra; fala "comprei cloro" repondo.
- Narração: "A Dispensa guarda o que você tem em casa, com quantidade, validade e onde está. O que está acabando aparece em destaque, e o FARO cria o lembrete de compra. Comprou? É só falar: 'comprei cloro', e o item volta para a lista."

**cap-07-manutencao**
- Telas: Manutenção (bem aberto, item com ciclo, "Feito").
- Animar: ciclo 1 → ciclo 2; contagem de dias; aviso no WhatsApp.
- Narração: "Troca de óleo, filtro, limpeza dos dentes: tudo que se repete. Diga de quanto em quanto tempo e quando foi a última vez. O FARO conta os ciclos, avisa antes de vencer e, quando você marca Feito, já abre o próximo."

**cap-08-dieta-agua-medicamentos**
- Telas: Painel da água e sono, Dieta (refeições e avisos), Medicamentos (com dados fictícios).
- Animar: copo enchendo; refeição com sino e WhatsApp; remédio com horário.
- Narração: "Registre a água, o sono e a dieta do dia em segundos. Na Dieta, cada refeição tem o seu aviso. Em Medicamentos, cadastre horários e tratamentos. Atenção: dados de saúde ficam só com você; nunca vão para a inteligência artificial."

**cap-09-aprender (Conhecendo você, Metanoia, Sinapses, Ideias)**
- Telas: Conhecendo você, Metanoia (cartão roxo), Sinapses, Ideias e Estudos.
- Animar: frase da Metanoia trocando; sinapse com a pergunta que reconecta; ideia virando estudo.
- Narração: "Aprender também é rotina. Em Conhecendo você, o FARO aprende quem você é e só guarda o que você aprova. A Metanoia manda frases que importam para você. Sinapses guardam o que mudou uma crença, com uma pergunta para lembrar. Ideias podem virar Estudo."

**cap-10-livros-e-plano-de-estudo**
- Telas: Livros (verde, amarelo, azul), Plano de Estudo (barra, distribuir na agenda).
- Animar: livro mudando de azul para amarelo para verde; plano distribuindo sessões na agenda.
- Narração: "Organize livros, filmes e séries por cor: azul para ver, amarelo em andamento, verde concluído. No Plano de Estudo, diga o tamanho e o prazo, e o FARO calcula quanto estudar por dia e coloca as sessões na sua agenda."

**cap-11-compras-checklists-aniversarios**
- Telas: Compras, Checklists com gastos, Aniversários.
- Animar: item riscado; gasto somando; aniversário com sino e WhatsApp.
- Narração: "Listas de compras e checklists para viagem, trabalho ou casa, com controle de gastos. Em Aniversários, o FARO lembra de quem você ama e pode te lembrar também no WhatsApp."

**cap-12-avisos-e-configuracoes**
- Telas: Configurações (Painéis, WhatsApp, estilo), instalar o app, Atualizar o aplicativo.
- Animar: instalação na tela inicial; chaves liga/desliga; aviso de versão nova.
- Narração: "Instale o FARO na tela inicial do celular e ligue as notificações. Em Configurações, escolha o que aparece no menu, aceite o WhatsApp e veja o que você gastou. Se aparecer 'Atualizar o aplicativo', toque: é uma versão nova."

**Para depois (não gravar agora):** Dashboard, Semana e Calendário, Backup e Google, Canal de feedback.

## 5. Telas reais: como organizar para o motion usar

O problema: as pranchas de design do projeto têm layouts **antigos**. O vídeo precisa das **telas reais de hoje**.

**Fonte única de verdade:** o app no ar (`soufaro.app.br`) com uma **conta de demonstração** cheia de dados inventados. Nunca capturar a conta do dono.

**Plano de captura (eu faço quando você mandar):**
1. Criar uma conta de demonstração no FARO e encher com dados fictícios (tarefas, lembretes, reuniões, Dispensa, Manutenção, livros, estudos, aniversários). Isso grava linhas no banco de produção; por isso peço o seu OK antes.
2. Capturar cada tela com o navegador automático, em **390×844 a 3× (1170×2532)**, tema claro e escuro, estilo flutuante.
3. Salvar no repositório em pastas por capítulo, com nome fixo:
   ```
   design/video/
     telas/
       cap-01-hoje/01-lista.png  02-tarefa-aberta.png  03-campo-adicionar.png
       cap-02-lembretes/…
       …
     marca/  (cópia dos SVGs e do mascote)
     manifesto.json   (capítulo → telas → o que cada uma mostra → data da captura)
   ```
4. O `manifesto.json` diz de qual versão do app é cada print. Se o app mudar, rodo a captura de novo e o motion atualiza.

**Para o projeto de edição ter acesso:** qualquer uma destas formas.
- **Melhor:** dar a ele acesso de leitura ao repositório `leandrogarozi/CORE` (pasta `design/video/` e `DESIGN.md`).
- **Alternativa:** eu envio a pasta `design/video/` para o Google Drive (pasta "FARO – Vídeos") e você compartilha com o projeto.
- **Ou** você baixa a pasta e anexa no projeto de vídeo.

**Prints vs. animação do app de verdade:** o motion pode (a) **animar em cima dos prints reais** (zoom, destaque, toque) ou (b) **recriar a interface em código** usando os prints como modelo exato. Recomendo (a) para telas complicadas (Manutenção, Dispensa) e (b) só para elementos simples (cartão, botão, sino).

## 6. Como pedir ao projeto de edição (texto para colar)

> Crie o vídeo de boas-vindas e os capítulos do "Como usar" do FARO, em motion graphics vertical 9:16, com narração (a voz será gerada à parte) e legenda queimada. Use o roteiro, as cores e a regra de "tela real" do arquivo `docs/VIDEO-COMO-USAR.md`. Use somente as telas da pasta `design/video/telas/` (dados fictícios). Cada capítulo deve ter no máximo 40 s, marcações de tempo por cena e exportar o texto da narração em arquivo separado (um por capítulo) para eu gerar a voz. Não invente funcionalidades; se faltar uma tela, me peça.

## 7. Pendências para fechar o material

- [ ] O dono escreve a frase "por que criei o FARO" (cena 3 das boas-vindas).
- [ ] Escolher o formato (9:16 sugerido) e a voz.
- [ ] OK para criar a conta de demonstração e capturar as telas (seção 5).
- [ ] Decidir onde os vídeos vão ficar no app (tela "Como usar", um botão "Ver em vídeo" em cada assunto).
- [ ] Revisar os roteiros quando uma tela mudar (a narração dos capítulos foi escrita com o app de 01/11/2026).
