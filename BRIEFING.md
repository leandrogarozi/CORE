# Briefing — Painel FARO

Documento vivo de decisões de produto e backlog do Leandro. Complementa o
`README.md` (que é técnico/setup) — este aqui é sobre **o quê** e **por quê**.
Atualizar sempre que uma decisão de produto for tomada ou o backlog mudar.

## Humor (check-in diário)

- Escala 1–5 com emoji (Péssimo/Ruim/Neutro/Bom/Ótimo), rótulo discreto
  embaixo de cada carinha.
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

## Navegação — Menu lateral

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

- Com data ou sem data.
- Com repetição ou sem repetição.
- Opção futura de sincronizar com a agenda (Google Agenda — já é item 🔴
  abaixo).
- Leandro pediu explicitamente pra deixar esse item parado por enquanto
  ("tenho que pensar com mais calma") — specs capturadas aqui, mas não
  começar a implementar sem ele confirmar.

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

## Backlog

### 🟡 Médios

- [x] Status de tarefa customizável
- [ ] Lista de lembretes — specs acima, parado a pedido do Leandro
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
- [ ] Pergunta de desempenho ao marcar treino
- [ ] Aba treino/suplementação

### 🔴 Grandes

- [ ] Painel de frases diárias / motivacionais
- [ ] IA de distribuição de tarefas
- [ ] IA de recomendação do próximo livro — cruza livros/insights/humor/
      objetivos do momento pra sugerir o que ler a seguir
- [ ] Sincronização com Google Agenda (inclui sync de lembretes, ver acima)
- [ ] Ferramentas / Roda da Vida
- [ ] Relatório cruzando dados (tarefas × hábitos × humor × sono etc.)
- [ ] Observação do humor no dashboard alimentada por IA (rotina agendada
      + chamada de IA — não é só front-end)
- [ ] Dashboard configurável (o que aparece na tela principal ou não)
