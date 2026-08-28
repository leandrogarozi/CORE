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

- **Busca total (28/08)**: campo de busca na topbar, ao lado do nome
  FARO (`TaskSearch.tsx`). Virou busca de verdade "em tudo" — pedido
  do Leandro pra não ficar só em tarefas. Busca por título em Tarefas,
  Lembretes e Livros, e também pelo texto de observações (nota da
  tarefa, insights do livro) — se o termo só aparece na observação
  (não no título), o resultado mostra um trecho da observação como
  subtítulo em vez da data/status, pra ficar claro por que apareceu.
  - **Seletor de escopo**: `<select>` no topo do popover de resultados
    — "Busca total" (padrão, tudo junto), ou filtrar só Tarefas /
    Lembretes / Livros. Ideia do próprio Leandro ("um menu suspenso
    pra escolher").
  - Cada resultado mostra uma etiqueta pequena do tipo (Tarefa/
    Lembrete/Livro) antes do título, já que a lista agora mistura tipos
    diferentes. Até 10 resultados.
  - Clicar num resultado navega: tarefa → pro dia dela (ou Painel do
    dia, se for backlog sem data, igual antes); lembrete/livro → abre
    a tela de Lembretes/Livros (ainda não pula pro item específico
    dentro da lista, só abre a tela certa).
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

## Iniciar reunião / avisos de timer (28/08)

- **Motivação**: o Leandro quer que o FARO monitore o tempo de verdade
  — inclusive reuniões que ele não coloca na agenda com antecedência.
  Ideia dele: registrar o tempo mesmo assim, com o mínimo de fricção.
- **Botão "Reunião" na topbar** (`MeetingButton.tsx`, ao lado do badge
  de cronômetro ativo): clica, escolhe uma **previsão de duração**
  (15/30/40min ou 1h) e digita o nome — cria uma tarefa pra hoje
  (categoria Trabalho, horário = agora) e já **inicia o cronômetro na
  hora**, sem passos extras. Reaproveita 100% a infra de timer que já
  existia pros Blocos fixos/Hábitos (`toggleTimer`/`ActiveTimer`).
  - Novo campo `Task.expectedDurationMin` (`expected_duration_min` no
    banco) guarda essa previsão — só usado internamente pro aviso
    abaixo, não aparece na tabela de tarefas.
- **Aviso quando passa do previsto** (`TimerNudges.tsx`): enquanto o
  cronômetro de uma tarefa com previsão de duração está rodando, o
  app confere a cada 20s se já passou do tempo previsto. Quando passa,
  aparece um card no canto inferior direito perguntando se a reunião
  terminou, com 3 ações: **Concluir** (para o cronômetro e marca a
  tarefa como concluída, usando o primeiro status com "conclui a
  tarefa" marcado), **+15min** (empurra a previsão pra frente, o aviso
  some e só volta se passar de novo) ou dispensar (só fecha o card,
  sem mexer no cronômetro).
- **Aviso 5min antes de tarefas com horário** — pedido do Leandro:
  "o que tiver na agenda já registrado, mandar lembrete 5min antes pra
  iniciar o play". Mesmo componente `TimerNudges.tsx`: confere a cada
  20s se alguma tarefa de hoje com horário definido (e ainda não
  concluída, sem cronômetro rodando) está a até 5min de começar —
  aparece outro card com botão "Iniciar", que já dispara o cronômetro
  daquela tarefa direto.
  - **Limitação importante, não escondida**: isso é um aviso *dentro
    do app*, não uma notificação de verdade do sistema/navegador — só
    funciona enquanto a aba do FARO está aberta. Notificação real
    (mesmo com o app fechado) precisa de service worker + permissão do
    navegador, que é o item 🔴 "Notificações push de lembretes" já
    registrado no backlog — ainda não implementado, mesma dependência.
- **Combinado como próximo passo (ainda não implementado)**: quando a
  sincronização com o Google Agenda existir (🔴 backlog), os eventos
  de reunião já cadastrados lá poderiam disparar esse mesmo aviso de
  5min automaticamente, sem precisar que o Leandro cadastre a tarefa
  manualmente antes.

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

- **Spec capturada (27/08)**: não é uma lista de remédios qualquer —
  é focado em **lembrete/rotina de tomar o remédio no horário certo**,
  não em ficha de medicação.
  - Cada medicamento: nome, **horário fixo** (mesmo horário todo dia —
    um horário por cadastro; se precisar de várias doses/dia, cadastra
    o mesmo remédio mais de uma vez com horários diferentes, por
    enquanto).
  - **Ativo/inativo**: toggle manual, tipo liga/desliga.
  - **Duração opcional**: dá pra cadastrar "por X dias" (ex.:
    antibiótico por 10 dias) — passado esse prazo a partir da data de
    início, desativa **sozinho**, sem precisar lembrar de desligar na
    mão. Sem duração definida = fica ativo até desativar manualmente
    (remédio de uso contínuo).
  - **Notificação**: a ideia é a mensagem chegar no **WhatsApp** na
    hora certa ("Hora de tomar seu remédio X...") — mesma dependência
    já registrada no backlog de Lembretes (WhatsApp Business API/
    Twilio, conta Business verificada, aprovação da Meta). Enquanto
    isso não existir, o comportamento é igual ao dos Lembretes hoje:
    visível na tela, sem alarme de verdade.
- **Implementado (27/08), reestruturado no mesmo dia** depois do
  Leandro explicar melhor o caso de uso real: dois grupos —
  **Temporários** (organizados por motivo/tratamento) e **Recorrentes**
  (lista solta, uso contínuo).
  - **Temporários**: cadastra primeiro o **motivo** (`MedicationGroup`,
    tabela `medication_groups` — ex.: "Tratamento sinusite"), depois os
    remédios dentro dele (`medications.group_id` aponta pro grupo). O
    grupo tem observação geral, período (início/término, ver abaixo —
    desativa o tratamento inteiro sozinho quando expira) e um seletor
    **"Mesmo horário" vs "Horário por remédio"**: mesmo horário = um
    horário só, vale pra todos os remédios do grupo (`shared_time`);
    por remédio = cada um tem o seu. Rótulos escritos por extenso nos
    botões (não só no tooltip) depois que o Leandro achou confuso
    "Único/Individual" sem explicação.
  - **Período (início/término)**: o popover de horário mostra dois
    campos de data — "Início" e "Término" — em vez de só "duração em
    dias" (mudança pedida pelo Leandro; internamente ainda calcula e
    guarda como `startDate` + `durationDays`, só a UI que virou dois
    seletores de data). Vale tanto pro grupo quanto pra cada remédio.
  - **Cada remédio** (temporário ou recorrente) tem, além do nome:
    observação própria (dosagem/instruções, via `CommentButton`
    reaproveitado), e **período próprio** — independente da
    duração do grupo, porque remédios de um mesmo tratamento podem
    parar em dias diferentes (ex.: antibiótico 7 dias + spray nasal 14
    dias dentro do mesmo tratamento de sinusite). Cada remédio também
    tem seu próprio ativo/inativo (`ToggleSwitch`), além do ativo/
    inativo do grupo.
  - **Recorrentes**: lista solta (sem grupo, `group_id` null) — nome,
    horário, observação, duração opcional, ativo/inativo. Uso contínuo
    por padrão (sem duração cadastrada = sem prazo pra parar).
  - **Desativação automática**: calculada no carregamento do board
    (`use-board.ts`, dentro de `load()`) — roda tanto pra grupos quanto
    pra remédios individuais, cada um com seu próprio `startDate` +
    `durationDays`; grava `active:false` no banco quando expira (não é
    só visual).
  - Ícone de horário: `ClockIcon`, novo, do pack (`Calendar/Clock.svg`).
  - Ainda sem bloco/atalho na home (diferente de Lembretes) — só a
    tela própria por enquanto. Notificação via WhatsApp segue como
    dependência futura (ver acima).
  - **Dias da semana (27/08)**: pedido do Leandro — "tenho um remédio
    que vou tomar somente 4x na semana", ou seja, nem todo remédio é
    diário. Cada remédio (`medications.week_days`, `integer[]` novo no
    banco) ganhou um seletor de dias no mesmo popover de horário —
    botões redondos D/S/T/Q/Q/S/S, clica pra marcar os dias em que
    toma. Vazio (nenhum marcado) ou todos os 7 marcados = mesmo
    comportamento de antes, remédio diário (não guarda restrição). Só
    ficou disponível no nível do remédio individual (`MedicationRow`),
    não no horário do grupo/tratamento inteiro — não fazia sentido pra
    tratamento curto tipo antibiótico. Ainda não afeta a desativação
    automática nem gera lembrete de verdade (mesma dependência de
    WhatsApp de sempre) — por enquanto é só informativo, mostra os dias
    junto do horário no rótulo do botão (ex.: "08:00 · SEG,QUA,SEX").

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
- **Sininho colorido em vez de bolinha (28/08)**: no atalho "Lembretes"
  da home, o aviso de pendência não é mais uma bolinha na frente do
  texto — agora o próprio ícone de sino fica dentro de um círculo
  preenchido: amarelo (`--book-yellow`) se tem lembrete pra hoje,
  vermelho (`--danger`) se tem algo atrasado (mesma prioridade visual
  de antes — atrasado "ganha" de pendente hoje). Pedido do Leandro,
  mais direto visualmente.
  - **Ajuste (28/08)**: o Leandro pediu além do preenchimento, um
    número pequeno em cima do sino com a quantidade de lembretes —
    "como se fosse número de notificações". Badge vermelho no canto
    (`.reminders-btn-count`), mostra a contagem (atrasados, se houver
    algum; senão os de hoje), com "9+" acima de 9 pra não estourar o
    tamanho do badge.
  - **Correção (28/08)**: o círculo colorido em volta do sino não era
    o que o Leandro queria — ele quis dizer o **ícone do sino em si
    preenchido/pintado por dentro** (não "envolto numa bola"), vazado
    (só contorno) quando não tem nada pendente. Como o pack de ícones
    não tem uma versão sólida do sino (só contorno, igual todo o
    resto do pack), desenhado um `BellIcon` preenchido como exceção
    (`filled?: boolean`, mesmo padrão do `BoltIcon`/`PillIcon`) — usa
    o desenho clássico de sino de notificação preenchido, sem o
    círculo de fundo. O badge numérico no canto continua.

## Decisões de design (visual)

- Referência: ClickUp (discreto, ícones sem cor exceto pra indicar
  estado, toggles deslizantes reais, bordas finas, linhas em cartão
  compacto) + etiquetas estilo iOS (swatches de cor redondos, não
  quadrados).
- Bolinhas de status de tarefa: **sempre preenchidas com a cor**, não só
  quando "conclui a tarefa" — mais simples que a referência literal do
  ClickUp; decisão explícita do Leandro ("até prefiro assim").
- **Bandeira de prioridade clicável (28/08)**: clicar direto na
  bandeirinha da tabela de tarefas cicla a prioridade sem precisar
  abrir a tarefa — Média → Alta → Baixa → Média (`setPriority` em
  `use-board.ts`, direto por linha, sem passar pelo fluxo de edição
  nem pelo prompt de escopo de recorrência, igual os raios de
  velocidade já faziam). A cor de "Baixa prioridade" mudou de cinza
  (`#9C9CA5`) pra verde (mesmo tom de `--success`) — antes tinha só
  azul/vermelho, cinza parecia "sem prioridade"; agora as 3 cores do
  ciclo (azul/vermelho/verde) ficam claramente diferentes, do jeito
  que o Leandro descreveu o ciclo esperado.
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

## Correções técnicas

- **Popovers saindo da tela perto da borda (27/08)**: o Leandro mandou
  print do popover de "Blocos fixos do dia" (editar dia com opções de
  nota, ex. "Lazer") cortado no canto inferior direito. Causa: todo
  popover flutuante do app (`.daylog-popover` e primos) sempre abria
  em `top: âncora.bottom+4, left: âncora.left`, sem checar se cabia na
  tela — perto de qualquer borda, ficava cortado.
  - Corrigido com um hook compartilhado
    (`useClampedPopoverPos`, em `src/lib/board/use-clamped-popover-pos.ts`):
    mede o próprio popover depois de montado e ajusta a posição — desliza
    pra esquerda se ultrapassar a direita, abre pra cima do âncora se
    não couber embaixo.
  - Aplicado nos 8 popovers do app que tinham o mesmo problema: Blocos
    fixos/Hábitos (`RecurringSection.tsx`), horário de remédio
    (`MedicationsView.tsx`), data de lembrete (`RemindersView.tsx`),
    data/status de livro (`BooksView.tsx`, 2 popovers), observação
    (`CommentButton.tsx`, reaproveitado em vários lugares), status de
    tarefa (`StatusPicker.tsx`) e busca de tarefas (`TaskSearch.tsx`).
  - O popover de atalho de Lembretes na home (`RemindersButton`) não
    precisou de ajuste — já era ancorado pela direita
    (`right: janela.innerWidth - âncora.right`) e já tinha
    `max-height`/scroll próprio, então não sofria do mesmo bug.

## Backlog

### 🟡 Médios

- [x] Status de tarefa customizável
- [x] Lista de lembretes — specs acima, implementado (tela própria +
      bloco no Painel do dia)
- [x] Lista de medicação — implementado (tela própria pelo menu
      lateral); falta só o bloco/atalho na home e a notificação via
      WhatsApp (dependência futura, ver spec acima)
- [x] Checklists — implementado (27/08), tela própria no menu lateral
      ("Checklists"), generalizado além de só viagem depois que o
      Leandro pediu "colocar tbm tipo de check list, pode ser trabalho,
      viagens..." no meio da implementação.
      - **Estrutura**: cada checklist é um registro próprio (`title` +
        `type` livre, ex.: "Viagem praia" / "viagem", "Reunião cliente
        X" / "trabalho") com sua lista de itens (texto + marcado/
        desmarcado). Não é um checklist único reciclado — cada viagem/
        evento fica com seu próprio histórico, visível na lista (dá
        pra olhar checklists antigos depois).
      - **Duplicar**: botão "Duplicar" copia título, tipo e todos os
        itens de um checklist existente pra um novo (itens vêm
        desmarcados) — é o fluxo principal pra reaproveitar uma lista
        de viagem/trabalho anterior editando só o que muda.
      - **Enviar pro WhatsApp**: monta a lista como texto (✅/⬜ por
        item) e abre `https://wa.me/?text=...` — usa o link universal
        do WhatsApp (sem número fixo, sem depender de nenhuma API paga
        nem do campo de telefone do Perfil), o usuário escolhe pra quem
        mandar na hora. Diferente da notificação automática ainda
        pendente (essa aqui já funciona hoje, é só compartilhar).
      - **Tipo**: campo de texto livre com sugestão via `<datalist>`
        dos tipos já usados antes (reaproveita "viagem"/"trabalho" sem
        forçar uma lista fixa de categorias).
      - Tabela `checklists` no Supabase: `title`, `type`, `items`
        (jsonb, array de `{id, text, checked, toBuy}`) — itens
        guardados como JSON aninhado no registro (mesmo padrão já
        usado em `daily_logs`/`fixed_blocks.note_options`), não uma
        tabela à parte, porque toda edição (marcar item, adicionar,
        excluir, duplicar) sempre reescreve a lista inteira de uma vez.
      - Ícone da seção: `ChecklistIcon`, novo, do pack
        (`Edit/List_Checklist.svg`). Ícone de enviar: `SendIcon`, novo,
        do pack (`Communication/Paper_Plane.svg`).
      - **"Marcar para comprar" (27/08)**: pedido do Leandro — no
        checklist de camping, várias coisas (comida, repelente,
        detergente...) precisam ser compradas antes, diferente do
        resto que já é só arrumar/levar. Cada item ganhou um botão de
        carrinho (`CartIcon`, novo, do pack
        `Interface/Shopping_Cart_01.svg`) que marca/desmarca `toBuy`.
        Quando pelo menos um item do checklist está marcado, a lista
        se separa visualmente em duas seções dentro do card — "🛒
        Comprar" primeiro, "Levar" depois; se nenhum item estiver
        marcado, continua mostrando tudo direto, sem seção nenhuma
        (do jeito que já era) — respeitando o que o Leandro pediu:
        "tem viagem que não precisa ir comprar nada, então é direto".
        Também ganhou um botão extra "Enviar lista de compras" (só
        aparece quando há itens marcados) que manda só esses pelo
        WhatsApp — separado do "Enviar pro WhatsApp" normal, que
        manda o checklist inteiro (e agora marca 🛒 nos itens de
        compra dentro dele também).
      - **Dados de exemplo (27/08)**: Leandro mandou fotos de 2
        checklists reais (Motocamping Pedra Azul, 51 itens — juntando
        3 blocos que ele tinha em outro app num só, sem separar por
        mochila/alforge como no original; e Cursos Febracis Vitória,
        19 itens) — cadastrados direto no banco via SQL (não pela UI)
        pra servir de base/ponto de partida.
- [x] Perfil do usuário — implementado (27/08) em Configurações, nova
      caixa "Perfil" no topo, antes de "Tags da tarefa". Três campos,
      exatamente o que foi pedido, sem inventar mais nenhum:
      - **Foto**: clica no círculo pra escolher um arquivo, sobe pro
        Supabase Storage (bucket `avatars`, público pra leitura,
        cada usuário só escreve na própria pasta `<user_id>/`, RLS por
        `auth.uid()`), salva a URL pública em `settings.avatar_url`.
        Sem placeholder de crop/recorte — usa a imagem inteira com
        `object-fit:cover` no círculo, do jeito que o usuário mandar.
      - **Como quer ser chamado?**: texto livre (`settings.preferred_name`),
        mesmo padrão de campo com draft+onBlur usado no orçamento de
        horas.
      - **Data de nascimento**: `<input type="date">`
        (`settings.birth_date`).
      - Ícone de placeholder (sem foto ainda): `UserIcon`, novo, do
        pack (`User/User_Circle.svg`).
      - Motivação principal permanece a mesma: dar pro FARO (a IA, fase
        2) o nome certo pra chamar o Leandro, em vez de só "Leandro"
        fixo no código. Isso ainda não está conectado a nada de IA —
        por enquanto só guarda o dado.
      - **Atalho de acesso rápido (27/08)**: pedido do Leandro depois de
        ver o Perfil pronto — em vez de precisar entrar em
        Configurações inteira só pra editar a foto/nome, ganhou um
        bolinha própria com a foto (ou `UserIcon` se ainda não tem
        foto) do lado do ícone de engrenagem, na topbar. Clicar nela
        abre a `ProfileView` — uma tela dedicada, só com os 3 campos
        do Perfil, sem o resto de Configurações junto. Os campos
        (`AvatarUploader` + inputs) foram extraídos pra
        `ProfileFields.tsx`, reaproveitado tanto pela tela dedicada
        quanto por qualquer coisa futura que precise deles; a caixa
        "Perfil" que existia dentro de Configurações foi removida (fica
        só nesse atalho agora, pra não duplicar o mesmo formulário em
        dois lugares). Combinado com o Leandro: "mais adiante podemos
        melhorar lá com outras opções e ir enriquecendo" — ou seja,
        essa tela de Perfil é o lugar certo pra crescer no futuro.
      - **Campos de notificação, fuso horário e "Sair" (27/08),
        implementado** — discutido o que apps costumam ter em Perfil e
        faltava aqui; o Leandro confirmou dois campos como prioridade
        real (usuário/handle, bio pública, localização ficaram de fora,
        não fazem sentido num app de uso pessoal só):
        - **WhatsApp/telefone** (`settings.notify_phone`): campo de
          texto livre pra guardar o destino das notificações — é o que
          faltava pra sair do papel a notificação via WhatsApp já
          combinada em Lembretes/Medicamentos (ver 🔴 "Notificações
          push de lembretes" abaixo). O campo existe e guarda o dado;
          **ainda não está conectado a nenhuma notificação de
          verdade** — isso continua dependendo da integração com
          WhatsApp Business API/Twilio, que segue não implementada.
        - **Fuso horário** (`settings.timezone`, IANA tz):
          `<select>` populado via `Intl.supportedValuesOf("timeZone")`
          (fallback pra uma lista curta de fusos do Brasil se o
          navegador não suportar), com "Detectar do navegador" como
          opção padrão (valor null). Pra lembretes/remédios
          continuarem disparando na hora certa se o Leandro viajar —
          mas hoje isso também é só o dado guardado, nenhum horário
          no app ainda lê esse campo pra ajustar o fuso de verdade.
          **Ajuste (27/08)**: a lista completa do IANA (400+ fusos)
          ficou difícil de achar o Brasil no meio — o Leandro reclamou
          ("teria que pesquisar para achar fácil"). Corrigido com dois
          `<optgroup>`: "Brasil" primeiro (os ~16 fusos oficiais do
          país, ex. São Paulo, Manaus, Fernando de Noronha...) e
          "Outros fusos" depois com o resto da lista do IANA.
        - Quando chegar a vez de configurar a **sincronização com o
          Google Agenda** (🔴 abaixo), as opções de sync entram dentro
          do Perfil, no mesmo lugar — não criar uma tela separada só
          pra isso.
        - O botão **"Sair"** (antes solto no rodapé do app, aparecia
          em toda tela) foi movido pra dentro da `ProfileView`, no
          fim da página, é o lugar mais lógico pra ele.
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
- [ ] Sincronização com Google Agenda (inclui sync de lembretes, ver
      acima) — quando for implementar, as opções de sync entram dentro
      do Perfil (ver seção Perfil acima, "próximos campos já
      combinados"), não numa tela separada.
- [ ] Notificações push de lembretes — **confirmado pelo Leandro,
      implementar depois** (não é próximo passo agora). Alerta de
      verdade na hora marcada (som/notificação do navegador). Precisa
      de service worker + permissão de notificação + gatilho agendado
      no servidor. Distinto da sync com Google Agenda. Ideal, se der:
      lembrete chegando também por **WhatsApp** (precisaria de API
      própria pra isso, ex. WhatsApp Business API/Twilio — integração
      separada da notificação do navegador; depende do campo de
      telefone/WhatsApp no Perfil, ver acima — é pra onde a mensagem
      vai). **Sonho do Leandro**: ligação de verdade via WhatsApp
      (telefone toca na hora do lembrete) — confirmado que é possível
      via WhatsApp Business Calling API, mas exige conta Business
      verificada, aprovação da Meta e tem custo por minuto; não começar
      sem ele confirmar.
- [ ] Ferramentas / Roda da Vida
- [ ] Relatório cruzando dados (tarefas × hábitos × humor × sono etc.)
- [ ] Observação do humor no dashboard alimentada por IA (rotina agendada
      + chamada de IA — não é só front-end)
- [ ] Dashboard configurável (o que aparece na tela principal ou não)
