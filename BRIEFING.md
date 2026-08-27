# Briefing — Painel FARO

Documento vivo de decisões de produto e backlog do Leandro. Complementa o
`README.md` (que é técnico/setup) — este aqui é sobre **o quê** e **por quê**.
Atualizar sempre que uma decisão de produto for tomada ou o backlog mudar.

## Próximos passos confirmados (retomar aqui)

- [x] **Lembretes** — implementado seguindo o spec (ver seção própria
      abaixo, dentro de "Especificações capturadas").
- [x] **Pacote de ícones do Leandro** — recebido (442 SVGs do Figma,
      organizados em 14 pastas por categoria) e já aplicado. Guardado
      em `design/icon-pack/` no repo (fora do build, só como fonte pra
      próximos ícones). Todos os ~20 ícones do app foram trocados pelos
      equivalentes do pack (mesmo padrão de sempre: `stroke="currentColor"`,
      cor herdada de fora, não fixa no SVG). Duas exceções:
      - `PillIcon` (Medicamentos, ainda desabilitado no menu) ficou
        customizado — o pack não tem ícone de comprimido/medicação.
      - O ícone do grupo "Livros" (antes um retângulo sólido,
        `BookSolidIcon`) virou `BookOpenIcon` — um livro aberto em
        contorno (`Book_Open.svg` do pack), já que o pack é todo em
        estilo linha (sem preenchido). `BookIcon` (livro fechado, usado
        no menu lateral) continua separado.
      - Ponto de rollback se algo não ficar bom: commit `d1dbfcd`
        (estado anterior à troca de ícones).
      - **Regra fixa**: daqui pra frente, todo ícone novo do app vem
        desse pack (`design/icon-pack/`), nunca desenhado do zero.
        Procurar o SVG mais próximo lá, copiar o `path`, converter pro
        padrão do projeto (`viewBox="0 0 24 24"`, `stroke="currentColor"`).
        Só se não existir equivalente no pack (como aconteceu com
        `PillIcon`) é que se desenha um customizado.

## Mascote FARO (assistente de IA do app)

**Ideia do Leandro**: a IA do app se chama FARO (mesmo nome do app) e
tem uma identidade visual — um cachorrinho-robô — que fica sempre
visível no cantinho da tela. Dois níveis, propositalmente separados
por dificuldade:

- **Fase 1 — mascote + saudações contextuais (implementado)**: avatar
  fixo no canto inferior direito (`FaroMascot.tsx`), clicável, com um
  balão de fala. Sem IA nenhuma — é lógica local:
  - Se o dia estiver marcado como "Doente" (🤒) no humor, a mensagem é
    de melhoras em vez do "bom dia".
  - Senão, saudação por horário do dia (bom dia / boa tarde / boa
    noite).
  - O balão aparece automaticamente uma vez por dia (guardado em
    `localStorage`, chave `faro-greeted-<data>`); clicar no avatar
    reabre/fecha o balão manualmente a qualquer momento.
  - **Visual**: Leandro pediu um cachorro-robô, animado (a ideia é
    reforçar "isso é IA"). Passou por algumas iterações: emoji →
    SVG próprio com corpo inteiro + rabo → SVG só da cabeça (orelhas
    pontudas, olhos âmbar) tentando seguir fotos de referência de
    brinquedos robô que ele mandou. Nenhuma versão desenhada à mão
    ficou parecida o suficiente com a referência (render 3D metálico
    fotorrealista é fora do alcance de SVG feito à mão).
  - **Versão atual**: Leandro gerou o render em outra IA (imagem, não
    código) e mandou o PNG com fundo transparente
    (`public/faro-dog.png`, recortado/otimizado de 2000×1750 pra
    294×320px). `FaroMascot.tsx` agora renderiza essa imagem via
    `next/image` no lugar do SVG; o círculo colorido de fundo do avatar
    saiu (a imagem já tem identidade visual própria), só ficou um
    drop-shadow. **Sem animação por enquanto** ("estático por
    enquanto", pedido explícito do Leandro) — as antigas animações CSS
    (flutuar/piscar/pulsar) foram removidas junto com o SVG. Dá pra
    reativar algo (float sutil, por exemplo) se ele quiser depois.
  - Envio de imagem: colar direto no chat não gera um arquivo que dá
    pra usar — só funciona como anexo de verdade (zip, ou Google
    Drive). Aconteceu nessa sessão: precisou pedir 2x até vir como zip.
- **Fase 2 — conversa de verdade (ainda não implementado)**: clicar no
  FARO permite perguntar/pedir coisas em linguagem natural, ex.:
  "Faro, cruza os dados pra mim, como tenho produzido esse mês?" ou
  "Faro, qual a indicação de livro pra mim agora, de acordo com meu
  momento?". Isso é a integração com a API da Claude já discutida
  (ver 🔴 "Relatório cruzando dados" / "IA de recomendação do próximo
  livro" abaixo) — só que em vez de um relatório fixo, o FARO precisa
  decidir dinamicamente qual dado buscar conforme a pergunta feita.
  Depende da chave de API da Anthropic estar configurada; entra como
  a "cara" (UI) desse assistente de IA maior, não como feature isolada.

## Humor (check-in diário)

- Escala 1–5 com emoji (Péssimo/Ruim/Neutro/Bom/Ótimo), rótulo discreto
  embaixo de cada carinha.
- **Carinha "Doente" (🤒)**: opção extra além da escala 1-5, pra não
  precisar escolher "Ruim/Péssimo" e explicar na nota que é doença
  física, não humor. Fica de fora da média/gráfico do dashboard (não é
  um nível de humor, é um estado físico à parte) mas aparece com cor
  própria na faixa de dias do termômetro. `v: 0` em `src/lib/mood.ts`.
- Ao selecionar uma carinha, um ícone de comentário aparece **sobre o
  cantinho da carinha selecionada** (estilo notificação de celular) —
  "Quer comentar por que está se sentindo assim?".
- A resposta fica salva (`mood_note`, campo livre) — **não é só um
  comentário solto**: é matéria-prima para relatórios/insights futuros
  sobre padrões de pensamento recorrentes, abalos, o que anima a pessoa,
  etc. Guardar o texto puro agora, mesmo sem nada consumindo ainda, é
  intencional.
- Dashboard: "termômetro do humor" — funciona com o mesmo seletor
  Semana/Mês do resto do dashboard. Mostra a média do período (número +
  emoji) e uma faixa de dias coloridos (vermelho→verde conforme o humor,
  cinza pros dias sem registro).
- **Pendente**: campo de observação no dashboard alimentado
  automaticamente por IA de acordo com o desempenho da pessoa no período.
  Isso não é só UI — precisa de uma rotina agendada que rode
  periodicamente e chame uma IA pra escrever o resumo. Tratar como item
  de backlog separado (ver 🔴 abaixo), não como parte do gráfico em si.

## Busca e Calendário (topbar)

- **Busca de tarefas**: campo de busca na topbar, ao lado do nome FARO
  (`TaskSearch.tsx`). Filtra por título (case-insensitive) em todas as
  tarefas, mostra até 8 resultados num popover com título + data (ou
  "Sem data"). Clicar num resultado navega pro dia da tarefa (ou pro
  Painel do dia, se for backlog sem data).
- **Botão "Hoje" na topbar**: ao lado da data, pula direto pro dia
  atual (mesma lógica do botão "Hoje" que já existia embaixo, na faixa
  de dias — os dois agora compartilham a mesma função `goToday`).
- **Ícone de calendário na topbar**: abre a view "Calendário"
  (`CalendarView.tsx`) — grade mensal (domingo a sábado, linhas
  variáveis conforme o mês) com navegação de mês (‹ ›), botão Hoje, e
  alternância "Mês"/"Semana" (Semana leva pra view de Semana já
  existente). Cada dia mostra um resumo compacto: um "chip" colorido
  por status de tarefa presente naquele dia (reaproveitando as cores
  dos status customizáveis em Configurações), com a contagem. Clicar
  num dia navega direto pra ele no Painel do dia.

Decisão: sair de pills soltas no topo (Hoje/Semana/Dashboard/Configurações)
para um menu lateral (ícone de hambúrguer no topbar → gaveta que desliza
da esquerda). Motivo: muita coisa nova vai entrar como seção própria (ver
backlog abaixo) e não cabe mais como pill no topo.

Estado atual (implementado): gaveta com Painel / Semana / Dashboard /
Livros / Configurações, mais uma seção "Em breve" com Medicamentos /
Lembretes como itens desabilitados (só pra sinalizar o que vem por aí).
As pills do topo continuam funcionando também — não foram removidas.

Próximo passo (ainda não feito): opção de escolher o que aparece na tela
principal ou não — um "dashboard configurável" na mesma linha do sistema
de feature flags que já existe pra água/dieta/sono/humor
(`OPTIONAL_FEATURES` em `src/lib/types.ts`).

## Seções novas que vão morar no menu lateral (specs)

### Lista de livros — implementado

- Estados: **Para ler** → **Lendo** → **Finalizado** (`BooksView.tsx`,
  tabela `books`). Cada livro tem título editável, seletor de estado, e
  um ícone de comentário pra resumo/insights.
- **Redesign (pedido do Leandro, referência ClickUp)**: era 3 seções
  separadas em cards grandes — trocado por **uma lista única**, contida
  (largura máx. 640px, não estica a tela toda — mesma lógica dos blocos
  de referência tipo Hábitos/dieta), agrupada por status com cabeçalhos
  recolhíveis estilo ClickUp (pill colorida + contagem, ex. "LENDO 3"),
  separados por linhas finas e simples em vez de cards com borda.
- **Cores de status** (decisão explícita do Leandro): 🟢 verde =
  Finalizado (lido), 🟠 laranja = Para ler, 🟡 amarelo = Lendo. Aplicado
  tanto na pill do cabeçalho de grupo quanto no seletor de status de
  cada linha (substituiu o `<select>` nativo por um pill colorido com
  dropdown, no mesmo padrão do `StatusPicker` de tarefas).
- O campo de insights abre como uma "folha de documento" — modal maior
  (não mais popover pequeno) com textarea espaçosa, pensado pra escrever
  resumos de verdade, não só uma nota rápida.
- **Pendente**: o resumo/insights ainda não vira conteúdo de
  "inspiração" em nenhum outro lugar do painel — por enquanto só fica
  guardado no livro. Puxar isso pro dashboard/home é trabalho futuro,
  onde exatamente ainda não foi definido.
- Lista real do Leandro já foi importada (45 livros: 21 finalizados, 8
  lendo, 16 para ler), a partir de um board que ele já mantinha fora do
  app. Os "para ler" são todos livros que ele já tem fisicamente — não
  precisa de um passo de "aquisição" separado.
- **Ideia nova do Leandro**: com os dados de livros + insights + humor
  (e o que ele estiver buscando no momento), o app deveria ajudar a
  **escolher o próximo livro de acordo com o momento de vida da
  pessoa**. Isso é IA raciocinando sobre os dados, não é filtro/UI —
  entra no backlog 🔴 como item próprio (ver abaixo), relacionado mas
  distinto da "IA de distribuição de tarefas".
- **Data nos livros** (pra dar pra cruzar livro × período de vida): só
  `lendo` tem um campo de **data de início** (`started_at`). Livros
  `finalizado` **não têm data** — decisão do Leandro: já foram lidos,
  não precisa registrar quando. `para_ler` também não tem data (ainda
  não começou). (Chegou a existir um campo de ano de conclusão pros
  finalizados; removido a pedido dele.)

### Medicamentos

- Ainda sem spec detalhada — definir quando chegar a vez de implementar.

### Lembretes

- Implementado (`RemindersView.tsx`, tabela `reminders`), acessível pelo
  menu lateral (junto de Livros).
- Lista única com "+ Adicionar lembrete", cada item com: checkbox de
  concluído (risca o texto), título editável, ícone de repetição
  (quando tem), botão de data colapsável (mesmo padrão do
  `BookStartDateButton`) e excluir. Pendentes e concluídos ficam em
  cards separados (mesmo estilo dos grupos de Livros).
- Data é opcional (`remind_date`, null = sem data). Horário
  (`remind_time`, campo `<input type="time">`) e repetição (`repeat`:
  nenhuma/diária/semanal/mensal/anual — reaproveita o mesmo tipo
  `Repeat` já usado nas tarefas) só ficam disponíveis quando existe uma
  data definida, já que os dois precisam de uma âncora — sem data, o
  horário fica vazio e a repetição é sempre "nenhuma".
- Repetição por enquanto é só metadado (mostra o ícone, não gera
  múltiplas ocorrências futuras automaticamente) — isso e a sincronia
  com o Google Agenda (item 🔴 abaixo) ficam pra uma fase 2.
- Classes CSS dos cards (`.narrow-list`, `.list-quickadd-card`,
  `.list-card`) foram generalizadas a partir das de Livros, pra dar
  pra reusar em Medicamentos também quando chegar a vez.
- **Bloco na página principal**: pedido do Leandro pra dar visibilidade
  sem precisar abrir a tela de Lembretes. Primeira versão era uma seção
  inteira fixa no meio da página — ficou "sumida"/perdida entre Hábitos
  e Blocos fixos. Trocado por um **botão sempre visível** no topo do
  Painel (linha da faixa de dias, junto de Hoje/Semana/Dashboard):
  ícone de sino + "Lembretes", com uma **bolinha de atenção** que
  aparece só quando tem pendência — amarela se tem lembrete pra hoje,
  vermelha se tem algo atrasado. Clicar abre um popover compacto com
  "+ Adicionar" rápido, a lista de pendentes e um link "Ver todos" que
  leva pra tela cheia. Reaproveita o mesmo `ReminderRow` da tela cheia
  (`RemindersButton` em `RemindersView.tsx`) — sem duplicar lógica.
- **Hábitos e Blocos fixos lado a lado**: pedido do Leandro pra
  economizar espaço vertical na home — as duas seções agora ficam em
  duas colunas (`.habits-blocks-row`, grid 1fr 1fr) em telas largas;
  em telas estreitas (≤640px, mesmo ponto de corte já usado no resto
  do app) volta a empilhar em uma coluna só.
- **Como o lembrete "avisa" (resposta pro Leandro)**: hoje não existe
  alarme/notificação de verdade — o lembrete só fica visível (na tela
  de Lembretes e agora também no bloco do Painel) e ganha destaque
  visual quando a data chega: linha fica avermelhada se **atrasado**,
  amarela se é **hoje**. Não há aviso automático "na hora marcada"
  (nem som, nem notificação push) — isso exigiria um pedaço de
  infraestrutura novo (service worker + permissão de notificação do
  navegador + algum gatilho agendado rodando no servidor, já que o
  Vercel não roda nada em background sozinho). Virou item 🔴 separado
  no backlog ("Notificações push de lembretes"), distinto da sync com
  Google Agenda.
  - **Confirmado pelo Leandro**: quer notificação de verdade, sim —
    mas fica anotado pra implementar depois, não é pra começar agora.
  - **Ideal (nova ideia do Leandro)**: o lembrete chegar também por
    WhatsApp, se der pra fazer. Isso é uma integração à parte da
    notificação push do navegador — precisaria de uma API de WhatsApp
    (ex.: WhatsApp Business API/Twilio) enviando mensagem no horário
    do lembrete. Anotado como parte do mesmo item de backlog, mas é
    tecnicamente outra peça (fora do que o navegador consegue fazer
    sozinho).
  - **Sonho do Leandro (favorito dele)**: em vez de só mensagem, o
    **telefone tocar de verdade** — uma ligação via WhatsApp na hora
    do lembrete. Ele mesmo não sabe se dá pra fazer; verificamos:
    **dá, sim** — existe a WhatsApp Business Calling API, que permite
    a um número de WhatsApp Business iniciar chamada de voz pro
    usuário. É bem mais avançado que mandar mensagem: precisa de conta
    WhatsApp Business verificada, aprovação da Meta pra usar chamadas,
    e tem custo por minuto de ligação (diferente de mensagem, que tem
    janela gratuita). Fica marcado como o item mais ambicioso dentro
    de "Notificações de lembrete" — não começar sem confirmação
    explícita do Leandro, até pelo custo envolvido.

## Decisões de design (visual)

- Referência: ClickUp (discreto, ícones sem cor exceto pra indicar
  estado, toggles deslizantes reais, bordas finas, linhas em cartão
  compacto) + etiquetas estilo iOS (swatches de cor redondos, não
  quadrados).
- Bolinhas de status de tarefa: **sempre preenchidas com a cor**, não só
  quando "conclui a tarefa" — mais simples que a referência literal do
  ClickUp; decisão explícita do Leandro ("até prefiro assim").
- Campos de comentário/observação (dieta, humor): ficam fechados como um
  ícone de balão; abrir um comentário existente mostra uma bolinha de
  notificação no ícone; salvar fecha de volta. Não deixar caixa de texto
  aberta por padrão.
- Dia marcado como concluído em Hábitos/Blocos fixos usa uma cor própria
  (`#2A9D8F`, `.habit-cell.done`), não o `--success` genérico do resto do
  app — testados antes `--success` padrão e depois `#9BFAB0`, nenhum
  agradou; `#2A9D8F` foi a escolha final do Leandro.
- Faixa de dias da semana (topo do Painel): fica esticada preenchendo o
  espaço disponível (não compacta) — já tentamos compactar pra abrir
  espaço pro botão de Lembretes, mas o Leandro preferiu do jeito
  original. Revisitar se a barra de botões do topo ficar apertada
  conforme mais coisas forem entrando ali.
- **Revisão das cores amarelas do app**: Leandro queria trocar o
  amarelo usado em vários pontos (aviso "falta registrar", chip
  "Rápidas primeiro" ativo, badge de velocidade de execução).
  - Badge "+++" de velocidade (coluna "Vel.Ex") virou **3 ícones
    clicáveis** (contorno vazio, preenchidos até o clicado — não cicla
    mais + → ++ → +++, clica direto no Nº ícone pra setar, ou no mesmo
    pra zerar). Passou primeiro por estrelas (`StarIcon`, do pack) e
    depois virou **raio** (`BoltIcon` em `icons.tsx`, `QuickBolts` em
    `TaskRow.tsx`) — o pack não tem nenhum ícone de raio/lightning
    (conferido nos 442 arquivos), então esse é desenhado à mão como
    exceção à regra fixa, igual o `PillIcon`.
  - **Cor**: Leandro mandou um ícone de referência (triângulo de
    aviso) com o tom de amarelo/dourado que queria. Sem acesso ao
    arquivo exato (só viu a imagem no chat, sem conseguir extrair o
    pixel), aplicado por estimativa visual: `--book-yellow` mudou de
    `#C99A0A` (claro) / `#E8C547` (escuro) pra `#F2B93F` (claro) /
    `#F5C968` (escuro) — um dourado mais vivo/quente. Se o tom não
    bater exatamente com a referência, é só ajustar esse único token.
  - **Unificação**: as 3 caixas de aviso amarelas (`.dl-reminder` —
    "Ainda falta registrar hoje", `.hp-note` — nota de horas,
    `.quicksort-btn.active` — chip "Rápidas primeiro") tinham cada uma
    seu próprio trio de hex fixo duplicado (`#8A6412`/`#FCEFD8`/
    `#E8C077`). Trocado por `color-mix()` derivado de `--book-yellow`
    — daqui pra frente, mudar esse token muda as três juntas. Criada
    `--warn-text-mix` (preto no tema claro, branco no escuro) pra a
    mistura do texto continuar legível nos dois temas.
  - Ponto de rollback se não ficar bom: commit `2a29a67` (estado
    anterior a toda essa revisão de amarelo, antes até das estrelas).

## Backlog

### 🟡 Médios

- [x] Status de tarefa customizável
- [x] Lista de lembretes — specs acima, implementado (tela própria +
      bloco no Painel do dia)
- [ ] Lista de medicação — sem spec ainda
- [x] Livros lidos + insights — feito; falta só a parte de virar
      "conteúdo de inspiração" em outro lugar do painel (ver acima)
- [x] Cadastro de tipos de lazer — cada bloco fixo tem uma lista própria de
      "opções de nota" cadastrável (editar bloco → "Opções de nota"). Se o
      bloco tem opções cadastradas, clicar num dia abre um registro por
      **entradas**: dá pra marcar **vários tipos no mesmo dia, cada um com
      seu próprio tempo** (ex.: hoje — Filme 90min, Video game 60min),
      cada entrada some da lista com um "×". Sem opções cadastradas, cai
      de volta pro campo único de minutos + texto livre de antes. O total
      do dia (pra Dashboard/Painel de horas) é a soma das entradas.
      Cadastro não é tela própria — vive dentro da edição do bloco (ex.:
      bloco "Lazer" → praia, filme, jogo, férias...).
- [x] Check-in de humor diário
- [x] Pergunta de desempenho ao marcar treino — "opções de nota" agora
      funciona em **hábitos** também, não só blocos fixos (mesma edição
      → "Opções de nota"). Diferente do lazer (que usa entradas
      múltiplas), hábito com opções mostra um **popover de escolha
      única** (chip selecionado vira a nota do dia) — combina com
      hábitos que só acontecem uma vez por dia. Já cadastrado nos
      hábitos "Corrida" e "Crossfit" com Fraco/Médio/Bom/Excelente.
- [ ] Aba treino/suplementação

### 🔴 Grandes

- [ ] Painel de frases diárias / motivacionais
- [ ] IA de distribuição de tarefas
- [ ] IA de recomendação do próximo livro — cruza livros/insights/humor/
      objetivos do momento pra sugerir o que ler a seguir
- [ ] Sincronização com Google Agenda (inclui sync de lembretes, ver acima)
- [ ] Notificações push de lembretes — **confirmado pelo Leandro,
      implementar depois** (não é próximo passo agora). Alerta de
      verdade na hora marcada (som/notificação do navegador). Precisa
      de service worker + permissão de notificação + gatilho agendado
      no servidor. Distinto da sync com Google Agenda. Ideal, se der:
      lembrete chegando também por **WhatsApp** (precisaria de API
      própria pra isso, ex. WhatsApp Business API/Twilio — integração
      separada da notificação do navegador). **Sonho do Leandro**:
      ligação de verdade via WhatsApp (telefone toca na hora do
      lembrete) — confirmado que é possível via WhatsApp Business
      Calling API, mas exige conta Business verificada, aprovação da
      Meta e tem custo por minuto; não começar sem ele confirmar.
- [ ] Ferramentas / Roda da Vida
- [ ] Relatório cruzando dados (tarefas × hábitos × humor × sono etc.)
- [ ] Observação do humor no dashboard alimentada por IA (rotina agendada
      + chamada de IA — não é só front-end)
- [ ] Dashboard configurável (o que aparece na tela principal ou não)
