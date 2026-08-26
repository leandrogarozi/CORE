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
Configurações, mais uma seção "Em breve" com Livros / Medicamentos /
Lembretes como itens desabilitados (só pra sinalizar o que vem por aí).
As pills do topo continuam funcionando também — não foram removidas.

Próximo passo (ainda não feito): opção de escolher o que aparece na tela
principal ou não — um "dashboard configurável" na mesma linha do sistema
de feature flags que já existe pra água/dieta/sono/humor
(`OPTIONAL_FEATURES` em `src/lib/types.ts`).

## Seções novas que vão morar no menu lateral (specs)

### Lista de livros

- Estados: **Para ler** → **Lendo** → **Finalizado**.
- Campo de resumo/insights por livro.
- Vira conteúdo de "inspiração" dentro do painel da pessoa (puxado em
  algum lugar do dashboard/home — onde exatamente ainda não foi
  definido).

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
- [ ] Livros lidos + insights — specs acima
- [x] Cadastro de tipos de lazer — coberto pelo campo de nota nos blocos
      fixos (ex.: bloco "Lazer"), não precisa de tela própria
- [x] Check-in de humor diário
- [ ] Pergunta de desempenho ao marcar treino
- [ ] Aba treino/suplementação

### 🔴 Grandes

- [ ] Painel de frases diárias / motivacionais
- [ ] IA de distribuição de tarefas
- [ ] Sincronização com Google Agenda (inclui sync de lembretes, ver acima)
- [ ] Ferramentas / Roda da Vida
- [ ] Relatório cruzando dados (tarefas × hábitos × humor × sono etc.)
- [ ] Observação do humor no dashboard alimentada por IA (rotina agendada
      + chamada de IA — não é só front-end)
- [ ] Dashboard configurável (o que aparece na tela principal ou não)
