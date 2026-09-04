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

## Incidente: perda de texto ao fechar o navegador (03/09)

O Leandro fechou o navegador e, ao voltar ~10min depois, notou que os
últimos lançamentos tinham sumido. Investigado direto no Supabase
(cruzando `created_at` de tasks/reminders com o horário real): o
último salvamento confirmado foi às 14:50 (horário de Brasília), e ele
fechou por volta das 14:59 — uma janela de ~9 minutos sem nenhum
salvamento. Ele lembrou o que tinha digitado nesse intervalo (uma nova
etapa em Projetos → Aplicativo FARO, um lembrete de sábado sobre
"acompanhar treinador Alberto", uma tarefa "subir demandas vídeos ads
Metalosa") e confirmei no banco: **nenhum dos três existe** — o texto
nunca chegou a sair do navegador, então não tinha como recuperar o
conteúdo exato, só a causa.

**Causa raiz**: os campos "+ adicionar" (tarefa, lembrete, etapa de
projeto) só confirmavam com **Enter** — sem `onBlur`, sem autosave, sem
aviso nenhum. Se o Leandro digitava e fechava a aba (ou clicava em
outra coisa) sem apertar Enter, o texto simplesmente sumia, sem deixar
rastro em lugar nenhum.

**Corrigido**: os 3 campos (`TaskListCard`, `RemindersView`,
`ProjectsView` — etapa) agora também confirmam no `onBlur` (clicar
fora), e um aviso do navegador (`beforeunload`) dispara se qualquer
campo `.quickadd-input` ainda tiver texto não confirmado ao tentar
fechar/recarregar a página — cobre de brinde os quick-add de Livros,
Checklists e Medicamentos também, sem precisar editar cada tela.

**Atualização (mesmo dia, horas depois) — a causa real era outra, mais grave**:
o Leandro voltou a perder lançamentos mesmo depois da correção acima
("toda vez que atualizo o navegador, some"). O diagnóstico do Enter/onBlur
estava incompleto — cobria só uma causa possível, não a que estava
acontecendo de verdade. Investigando os logs do Supabase na hora exata que
ele relançou algo e viu sumir: `POST /rest/v1/tasks` retornando **400**,
com o erro `new row for relation "tasks" violates check constraint
"tasks_category_check"`.

**Causa raiz de verdade**: 3 CHECK constraints no banco nunca foram
atualizadas quando o app ganhou valores novos, então o Postgres estava
**rejeitando o insert/update inteiro** — e como esses erros só iam pro
`console.error` (nunca apareciam na tela), o item sumia sem nenhum aviso.
Não era sobre apertar Enter ou não — mesmo confirmando certinho, o
salvamento falhava silenciosamente:
- `tasks_category_check` só permitia as 6 categorias antigas
  (trabalho/estudo/dev/saude/pessoal/familia) — faltavam `sem_categoria`
  (categoria padrão de task nova desde 02/09 13:53) e `reuniao`. Confirmado
  no banco: **zero** tasks com essas categorias existiam, ou seja, vinha
  falhando 100% das vezes desde então.
- `task_series_category_check` tinha a mesma lacuna (tarefas recorrentes).
- `projects_status_check` só permitia `active`/`done`, faltava `cancelled`
  — esse bug existe desde 29/08 (commit do status Cancelado em Projetos).

**Corrigido**: as 3 constraints atualizadas no Supabase pra aceitar todos
os valores que o app realmente usa. E, mais importante — **um aviso
visível na tela** (`SaveErrorToaster`) agora aparece sempre que um
salvamento falhar de verdade, em vez de sumir só no console: troquei os
73 `console.error` de `use-board.ts` por `reportSaveError`, que loga E
mostra um toast vermelho por 12s. Esse é o tipo de proteção que teria
avisado o Leandro na hora, em vez dele só descobrir no refresh.

**Lição pra próxima vez que um valor novo (categoria, status, etc.) for
adicionado no app**: sempre conferir se existe uma CHECK constraint no
banco pra esse campo, e atualizar ela junto — não só o tipo TypeScript.

**Levantamento do estrago real**: contei nos logs do Supabase todos os
`POST` que falharam por causa dessa constraint desde que o bug começou
(02/09 13:53) até a correção (03/09 ~18:30) — **13 tarefas** perdidas
(incluindo as 3 que o Leandro lembrou de cabeça) e mais alguns `POST` de
lembrete com erro 409 (conflito, causa ainda não investigada —
diferente da constraint, anotar pra olhar se acontecer de novo). Não
tem como recuperar o texto de nenhuma — nunca saiu do navegador.

**Camada extra de proteção (mesmo dia)**: `addTask`, `addReminder` e
`addTaskToProject` agora retornam se salvaram de verdade — os 3 campos
de "+ adicionar" só limpam o campo depois de confirmar sucesso; se
falhar, o texto volta pro campo (em vez de sumir junto com o item
otimista) e fica protegido pelo aviso de fechar a página também. Some
ao `SaveErrorToaster`: agora um erro real vem com aviso na tela E o
texto não perdido, sem o Leandro precisar fazer nada.

**Observação à parte, não corrigida ainda**: no mesmo dia, 3 tarefas
idênticas "Imersão Claude online" foram criadas em 33 segundos —
parece o Leandro apertando Enter várias vezes achando que não tinha
funcionado (falta de feedback visual claro de que o item foi
adicionado). Vale melhorar isso depois, mas não é urgente como a perda
de dado.

## Ícone de anexo nas tasks (03/09)

Pedido rápido: tasks com pelo menos um anexo ganham um ícone de clipe
de papel (`PaperclipIcon`, já usado no botão de Anexos) junto dos
outros indicadores da linha (pauta em aberto, lembrete, observação).
Como a lista de anexos de cada tarefa só era buscada sob demanda (ao
abrir o popover, uma consulta por vez), não dava pra saber de cara
quais tarefas têm anexo sem uma consulta por linha — resolvido com
`attachmentKeys`, um Set leve (`"task:<id>"` etc.) carregado uma vez no
load inicial do board e mantido sincronizado a cada upload/exclusão de
anexo, pra funcionar em Tarefas, Lembretes, Livros e Projetos.

## Destaque colorido + lista numerada, status Aguardando, largura de Projetos (03/09)

Leandro mandou 4 pedidos pra eu ir implementando enquanto ele estava no
Crossfit; dois vieram com print de referência que ele mandou logo em
seguida (fora de ordem, no meio da conversa) — implementados assim que
chegaram:

- **Destaque de texto no editor** (`RichTextEditor.tsx`): botão novo
  "Destaque" (ícone de marcador) abre uma paleta de 8 cores pastel
  (rosa, laranja, amarelo, azul, roxo, vermelho, verde, cinza) + opção
  de remover — usa `@tiptap/extension-highlight` com `multicolor:true`,
  igual ao "Destaques do texto" do ClickUp que ele mandou de exemplo.
  Não implementei "Cores de texto" nem "Selos" (as outras duas seções
  daquele mesmo print) — só o que foi pedido (destaque); se quiser
  aquilo também, é pedir.
- **Lista numerada no editor**: só tinha lista com bolinha até agora;
  adicionado o botão de lista numerada (1, 2, 3...) do lado, usando
  `toggleOrderedList` (já vinha disponível no `StarterKit`, só faltava
  o botão na toolbar).
- **Status "Aguardando" em Lembretes** (cor amarela): antes só existia
  Pendente/Concluído (um booleano `done`). Agora tem uma coluna
  `status` própria (`pending`/`waiting`/`done`) na tabela `reminders`
  (migração aplicada), mantendo `done` sincronizado pra não quebrar a
  lógica de lembrete recorrente/vencido que já dependia dele. Menu de
  status ganhou a 3ª opção "Aguardando".
- **Largura ajustável no bloco de Projeto**: botão novo ao lado do
  título "Projeto" (setas pra fora/pra dentro) alterna entre a largura
  padrão (900px) e uma expandida (1300px), preferência salva no
  navegador. Resolve o print que ele mandou da tabela de etapas cortada
  precisando rolar horizontal pra ver as tags e os ícones de ação —
  não achei nada literalmente "desalinhado" nas colunas em si (cada
  linha seguia a mesma grade), o problema era mesmo falta de espaço;
  se depois de usar o botão ainda achar que tem algo torto, mandar novo
  print apontando onde.

## Formulário de edição padronizado + limpar datas + cancelar projeto (03/09)

Print do Leandro: "as opções de edição da task estão muito feias,
desorganizadas e fora de padrão". Mais dois pedidos junto.

- **Padrão de caixa em todos os campos** (`.edit-grid` no
  `globals.css`): cada campo do formulário tinha um visual próprio —
  `select` era caixa com borda, "Quando"/"Lembrete" eram botões sem
  borda e cinza claro, Categorias era só o chip solto, Anexos era um
  clipe de papel minúsculo. Agora todo controle dentro do grid usa a
  MESMA caixa: `min-height:30px`, mesma borda, mesmo raio (7px), mesma
  fonte (12.5px) e largura total da coluna, com hover igual (borda
  accent). Colunas passaram de 130px para 150px e o alinhamento virou
  `start`, então as caixas ficam na mesma linha de base.
- **Título ganhou label** ("Tarefa") e placeholder, em vez de um input
  solto no topo sem identificação.
- **Observação foi pro fim do formulário e ocupa a linha inteira**
  (`.edit-field-full`) — era o pedido "as observações podem ficar mais
  para baixo pq tem espaço". Antes ela ficava no meio do grid ocupando
  2 colunas e quebrava a leitura dos campos.
- **Botões que estavam vazios agora dizem o que são**: "Quando" mostra
  "Sem data" quando não tem data, "Lembrete" mostra "Definir data",
  Anexos mostra "Nenhum anexo" / "N arquivos" (nova variante
  `variant="field"` do `AttachmentsButton`).
- **Limpar datas e horários** (pedido: "não dá para limpar"):
  - o seletor de horas (`TimePicker`) ganhou um rodapé **Limpar** —
    antes, escolhido um horário, não havia como voltar pra "sem
    horário". Vale também pra Duração (`MinutesPicker`), que agora
    limpa pra `null`.
  - o popover "Quando" ganhou borracha separada pro Início e pro Fim,
    mais um **Limpar** no rodapé que zera tudo.
  - o popover de Lembrete ganhou **Limpar** no rodapé que zera data,
    hora, dias da semana, repetição e aviso de uma vez (a borracha que
    existia limpava só data e hora).
- **Cancelar projeto agora leva as tarefas junto** (bug relatado): o
  projeto ficava cancelado mas as etapas dele continuavam soltas na
  lista "sem data". Novo `board.cancelProject(id)` em `use-board.ts`
  marca o projeto como cancelado E manda as tarefas **em aberto** dele
  pra Lixeira (soft delete, dá pra restaurar). As já concluídas ficam,
  pra não sumir do histórico de horas. A confirmação diz quantas
  tarefas vão ser removidas antes de executar.

## Correção da largura + menu único de data/hora (03/09)

- **Por que o botão de expandir não funcionava**: o container do app
  inteiro (`.wrap`) está travado em `max-width:1180px`. O botão que eu
  tinha feito expandia só o bloco interno (900px -> 1300px), mas ele
  nunca conseguia passar de 1180px por causa do pai — na prática quase
  nada mudava na tela. O Leandro mandou 3 prints com setas nas duas
  bordas de cada bloco deixando claro que queria os blocos ocupando a
  tela, não um pouco mais largos.
- **Refeito como um modo global**: um botão ↔ na topbar liga o
  `.wrap.wide` (até `min(1900px, 100vw - 32px)`) e solta todo bloco
  interno junto (`.narrow-list` vira 100%). Cobre Projetos, Lembretes,
  Livros e também a lista de tarefas do dia — que nem tinha botão antes,
  era o terceiro print dele. Os 3 botões por tela foram removidos.
- **Data/hora de início e fim num menu só**: os 4 campos soltos (Data,
  Hora, Até data, Até hora) viraram um campo "Quando" que abre um
  popover com Início (data + hora) e Fim (data + hora) juntos, como ele
  pediu pra simplificar.

## Leva de 5 ajustes (03/09, depois do incidente de perda de dados)

- **Autosave fechando a caixa de Observação a cada 30s (bug)**: no
  editor expandido (`CommentButton.tsx` → `CommentModal`), o autosave
  de 30s chamava a mesma função do botão Salvar, que também fechava a
  caixa — cortava o Leandro no meio de escrever, repetindo a cada 30s.
  Corrigido: autosave só persiste, nunca fecha; fechar continua sendo
  só Salvar/Cancelar/Escape.
- **Confirmação visual ao anexar arquivo**: depois de subir um anexo,
  o botão "Adicionar anexo" vira "✓ Salvo" por 2.5s antes de voltar ao
  normal — antes não dava nenhum feedback de que salvou, gerava
  insegurança ("gastura", nas palavras dele).
- **Largura ajustável em Lembretes e Livros**: extraído `useWideLayout`
  (compartilhado, antes só existia em Projetos) e aplicado nas duas
  telas — mesmo botão de expandir/reduzir (900px ↔ 1300px), resolve
  descrição cortada em Lembretes.
- **Início/fim de data e hora nas tarefas**: colunas `end_date`/
  `end_time` novas, campos "Até (data)"/"Até (hora)" na edição da
  tarefa, indicador "→ DD/MM HH:MM" na linha quando preenchido. Por
  enquanto só guarda o dado — a tarefa continua no bucket do seu
  `date` original, não aparece em todos os dias do intervalo ainda
  (isso fica pra quando a sync com Google Agenda for implementada de
  verdade).
- **Aviso de reuniões com pauta em aberto em Lembretes, sem misturar**:
  banner amarelo clicável no topo da aba Lembretes ("N reunião(ões) com
  pauta em aberto"), só aparece quando existe pelo menos uma — clicar
  leva pra aba Reuniões (que já tinha essa lógica pronta,
  `countOpenChecklistItems`). A lista de lembretes em si não muda nada.

## Categoria: nasce "Sem categoria" (alerta vermelho) + seleção de até 2 num clique só (02/09)

Evolução em 3 rounds do mesmo problema (tag "Trabalho" fixa e esquecida
em tarefas lançadas rápido, distorcendo relatório por categoria):

1. Primeiro round: categoria virou clicável na linha (menu tipo
   `StatusPicker`), mas continuava nascendo "Trabalho" por padrão.
2. O Leandro apontou o problema de fundo: cair sempre em "Trabalho" faz
   o relatório mentir (conta como trabalho o que não é). Solução: toda
   tarefa nova (`addTask`, `addTaskToProject`, `startMeeting`) passa a
   nascer **sem categoria** — nova categoria especial `sem_categoria`
   (sempre vermelha, ícone de alerta, "Sem categoria" ao invés de ficar
   escondida como "Trabalho"). Reaparece em qualquer lugar que mostre
   categoria — inclusive nos relatórios do Dashboard/Painel de horas,
   como fatia própria "Sem categoria" — então agora dá pra ver de
   verdade quanto ficou sem classificar, em vez de mascarado como
   trabalho. Excluída das listas de customização de cor (Configurações)
   e de categoria padrão de projeto, onde não faz sentido escolhê-la.
3. Pedido de refinar ainda mais: unificar Categoria + 2ª categoria num
   seletor só, permitindo marcar até 2 num clique, com selo numerado
   (①/②) indicando a ordem escolhida. Campo "Categoria" + "2ª categoria"
   (dois selects separados) virou um só, "Categorias", tanto na edição
   completa quanto no clique direto na linha — mesmo componente
   (`CategoryPicker`) nos dois lugares. Clicar numa categoria já
   marcada tira ela (promovendo a 2ª pra 1ª se for o caso); clicar
   numa terceira com as duas já preenchidas substitui a 2ª.

## Bolinha vermelha no ícone de observação (02/09)

Print mostrando que o balãozinho de observação na linha da tarefa passava
despercebido. Adicionado um pontinho vermelho no canto do ícone
(`.task-note-badge::after`) sempre que a tarefa tem observação — sinaliza
"tem algo pra ler aqui" sem precisar de número, só a presença do ponto.

## Aba Reuniões: cliente + pautas em aberto (02/09)

Pedido pra ajudar a pensar: o Leandro cria checklist de pauta nas
anotações da reunião, mas quando marca a reunião como concluída perde de
vista o que ficou pendente pra resolver depois. Conversamos o desenho via
pergunta direta e decidimos:

- **Campo Cliente na tarefa** (`client`, migração `add_client_to_tasks`):
  aparece na edição da tarefa e no popover do botão "Reunião" (que já
  existia — inicia uma reunião rápida com timer) sempre que a tarefa é
  reunião (`category` ou `category2` = "reuniao"), com autocompletar dos
  clientes já usados antes.
- **Pautas em aberto calculadas automaticamente**: em vez de um campo
  manual (que ficaria desatualizado), conto quantos itens do checklist
  dentro da Observação da reunião ainda estão desmarcados
  (`countOpenChecklistItems`, novo em `lib/rich-text.ts`, conta
  `data-checked="false"` no HTML). Zero manutenção manual — a fonte da
  verdade é o próprio checklist.
- **Selo "N pautas" na tarefa**: toda tarefa de reunião com pauta em
  aberto ganha um selo amarelo (ícone de grupo + número) na lista de
  badges, visível em **qualquer lugar** que a tarefa apareça — Hoje,
  Semana, ou já concluída — não só na aba nova. Resolve o "como saber que
  ainda tem pauta ali" mesmo depois de concluir a reunião.
- **Aba "Reuniões" nova** (menu lateral, depois de Projetos): lista todas
  as reuniões agrupadas por cliente, com contador de reuniões e de pautas
  em aberto por grupo, destaque visual (selo amarelo no cabeçalho) nos
  clientes com pendência, busca por nome de cliente e filtro "só com
  pauta em aberto". Cada linha é a mesma `TaskRow` de sempre — abre e
  edita normalmente, herda tudo que a tarefa já tinha (anexos, comentário,
  timer etc.).
- Isso aproveita a função `startMeeting`/`concludeMeeting` que já existia
  (botão "Reunião" de início rápido com timer) — não foi preciso criar
  uma entidade nova, só estender a tarefa existente.

## Checklist do editor de texto vira bolinha, igual ao resto do app (02/09)

Print mostrando as caixinhas quadradas nativas do navegador (checklist
dentro de anotações, tipo pauta de reunião) desalinhadas com o texto.
Trocado por bolinha redonda no mesmo estilo do `status-dot` das tarefas
(borda cinza vazia quando pendente, preenchida verde com check branco
quando concluído, texto riscado/apagado) — puro CSS em cima do checkbox
nativo do Tiptap (`ul[data-type="taskList"]`), sem trocar de biblioteca.

## Modal de confirmação (Excluir) atrás de outros modais (02/09)

Bug reportado logo depois do item acima: a caixa "Tem certeza que deseja
excluir..." abria atrás do modal de Anexos, sem dar pra ver nem clicar.
Causa: `ConfirmModal` era o único modal do app que não usava
`createPortal` — renderizava dentro da árvore normal do componente (em
`BoardApp.tsx`), então mesmo com `z-index` igual ao resto, a ordem no DOM
o deixava atrás de qualquer modal já aberto por cima dele (como o de
Anexos, que é portalizado pro `document.body`). Corrigido portalizando o
`ConfirmModal` também, no mesmo padrão do resto do app — assim ele sempre
monta como o último filho de `body` no momento em que abre, ficando na
frente de qualquer outro modal.

## Confirmação antes de excluir um anexo (02/09)

Ajuste rápido na leva anterior: excluir um anexo agora passa pelo mesmo
modal de confirmação (`askConfirm`) usado no resto do app, mencionando o
nome do arquivo — antes apagava direto no clique.

## Anexos (PDF/Word/imagem) em Tarefas, Lembretes, Livros e Projetos (02/09)

Pedido original: **"conseguimos subir arquivos anexos nas task dos livros?
quero anexo o resumo em pdf de forma que a ia consiga acessar e ler"**.
Antes de implementar, confirmei com o Leandro (via pergunta direta) três
pontos:
- **Escopo**: não só Livros — anexos em qualquer área (Tarefas, Lembretes,
  Livros, Projetos), via um mecanismo genérico reutilizável.
- **"A IA conseguir ler"**: hoje o app não tem nenhum chat/IA de verdade
  ainda (só o mascote FARO com saudações, fase 1). Combinado que por
  enquanto o app extrai e guarda o texto do arquivo automaticamente ao
  subir, deixando pronto pra quando existir uma IA de verdade (fase 2 do
  FARO) puxar esse texto como contexto — sem chat ainda, só a base
  pronta.
- **Formatos**: PDF, Word (.docx) e imagem (PNG/JPG). Só PDF e .docx têm
  o texto extraído automaticamente (bibliotecas `pdf-parse` e `mammoth`,
  rodando no servidor); imagem fica só guardada — teria que ser OCR, que
  não entrou nessa leva.

**Como funciona**: botão de clipe (ícone `PaperclipIcon`, novo, vindo do
pack de ícones) com contador, abrindo um modal de lista + upload + exclusão
+ download. Aparece em:
- **Livros**: na linha do livro, ao lado do botão de resumo.
- **Tarefas**: dentro do formulário de edição (campo "Anexos").
- **Lembretes**: no cabeçalho do modal de detalhes.
- **Projetos**: no cabeçalho do bloco principal, ao lado do tempo total.

**Técnico**:
- Tabela `attachments` nova (migração `create_attachments`): `entity_type`
  (task/reminder/book/project) + `entity_id` genéricos, `file_name`,
  `file_path`, `mime_type`, `size_bytes`, `extracted_text`. RLS por
  `user_id`, igual o resto do banco.
- Bucket privado `attachments` no Supabase Storage, path
  `${userId}/${entityType}/${entityId}/${uuid}-${nome}`; policies de
  storage restringem cada usuário à própria pasta (`storage.foldername`).
- Upload vai direto do navegador pro Storage (mesmo client já usado no
  resto do app, RLS de verdade) — sem passar pela função serverless da
  Vercel, evitando o limite de payload dela.
- Nova rota `/api/attachments/extract` (só recebe o `id` do anexo já
  salvo, não o arquivo em si): baixa o arquivo do Storage no servidor e
  roda `pdf-parse` (PDF) ou `mammoth.extractRawText` (.docx), gravando o
  texto extraído de volta na linha. Limite de 20MB pra tentar extrair.
- Novas funções em `board`: `listAttachments`, `uploadAttachment`,
  `deleteAttachment`, `getAttachmentUrl` (signed URL de 60s pro
  download/preview) — anexos não entram no estado global do app
  (`BoardState`), são buscados sob demanda por entidade, pra não pesar o
  carregamento inicial.

## Dashboard reorganizado (mais compacto, sem blocos soltos) (02/09)

Feedback direto sobre a leva anterior: "blocos quebrados, dados parecidos
longe", pedindo mais organização visual e mais compactação.

- **Layout em colunas (masonry)**: `.dash-charts` deixou de ser um grid
  comum (`auto-fit`, que alinha tudo em linhas e cria buracos quando um
  card é mais alto que o vizinho) e virou `column-count` com
  `break-inside:avoid` — os cards se empilham em colunas de altura
  variável, sem espaço em branco quebrando o layout. 3 colunas no
  desktop, 2 em telas médias, 1 no mobile.
- **Hábitos e Blocos fixos consolidados**: os 4 cards separados (tempo de
  Hábitos, dias ativos de Hábitos, tempo de Blocos fixos, dias ativos de
  Blocos fixos — adicionados na leva anterior) viraram só 2 cards
  ("Hábitos — tempo e dias ativos" / "Dia a Dia — tempo e dias ativos"),
  cada item com duas barrinhas empilhadas (tempo em cima, dias embaixo) e
  os dois valores lado a lado no cabeçalho da linha — resolve o "dados
  parecidos longe" sem perder nenhuma informação.
- **Ordem lógica**: cards de tarefas primeiro (Tarefas, Concluídas x
  pendentes, Prioridade), depois Humor, depois os de tempo/atividade
  (Tempo por categoria, Hábitos, Dia a Dia) — antes a ordem misturava os
  dois assuntos.
- **Compactação geral**: cards de estatística do topo (Atrasadas, Sem
  data etc.) e os `dash-box` ganharam padding/gap menores, cabendo mais
  informação por tela sem cortar nada.

## Dashboard: visão por Dia + blocos de dias ativos (02/09)

Pendência que tinha ficado só documentada na leva anterior — o Leandro
pediu direto ("ajuste o dash agora"):

- **Visão "Dia"**: terceiro botão no toggle do Dashboard, ao lado de
  Semana/Mês (ordem: Dia/Semana/Mês). Navega dia a dia com ‹ ›, igual às
  outras visões; range do dia (`fromISO === toISO`) já funciona com todo
  o resto do cálculo existente (concluídas, tempo, hábitos etc.) sem
  precisar de lógica nova ali.
- **Blocos de dias ativos**: dois novos cards — "Dias ativos — Hábitos" e
  "Dias ativos — Blocos fixos" — mostrando, pra cada item (Leitura,
  Gratidão, Crossfit, Corrida, Lazer, etc.), quantos dias ele foi marcado
  dentro do período (`X/Y dias`, Y = dias do período), ao lado dos cards
  de tempo (`fmtHM`) que já existiam. Como todo hábito/bloco fixo entra
  automaticamente nessas listas, cobre "tudo que tem de atividade fixa"
  sem precisar hardcoded — inclusive Gratidão/Leitura, que já eram
  hábitos cadastrados.

## Pastinha do projeto em toda etapa, mesmo com data (02/09)

Print mostrando que etapas antigas dentro de um projeto (as que já tinham
ganhado uma data, geralmente as concluídas) ficavam sem o ícone verde de
pastinha antes da bolinha de status — só aparecia em etapas sem data.
Causa: a condição no `TaskRow` era `t.projectId && !t.date`; havia também
um badge de link (ícone diferente) reservado só pro caso com data, na
célula de descrição. Agora a pastinha aparece em **toda** tarefa de
projeto, com ou sem data (removido o badge de link duplicado, que ficou
redundante).

## Tags padrão e nomenclatura automática das etapas de Projeto (02/09)

Item da leva grande de 01/09 que tinha ficado só decidido/documentado, sem
entrar no código — o Leandro cobrou (**"nao implementamos a questao da
nomeclatura nos projetos"**) e entrou agora:

- **Tags padrão do projeto**: cada projeto ganha uma linha "Tags padrão das
  novas etapas" (dois selects, Categoria e 2ª categoria) na seção Etapas.
  Toda etapa nova criada dali pra frente já nasce com essas categorias
  aplicadas automaticamente (antes toda etapa nascia fixa como
  "trabalho"/sem 2ª categoria).
- **Nomenclatura automática**: campo `namingTemplate` no projeto, com
  placeholders `{projeto}` e `{etapa}` (número da etapa, com zero à
  esquerda: 01, 02...). Padrão: `[{projeto}] [Etapa_{etapa}] - `. Toda
  etapa nova já nasce com esse prefixo pré-preenchido no campo de título,
  o Leandro só completa a descrição depois.
- **Botão "Atualizar nomenclatura"**: no bloco principal do projeto, ao
  lado de Excluir. Abre um modal simples com o template atual pra editar;
  ao salvar, reaplica o novo prefixo em **todas** as etapas já existentes
  (se o título atual começa com o prefixo antigo calculado pra aquela
  posição, troca só essa parte; senão, prepend do novo prefixo na frente —
  pra não perder texto digitado manualmente). A parte da descrição escrita
  depois do prefixo é sempre preservada.
- Técnico: migração `add_naming_and_default_tags_to_projects` (`projects`
  ganhou `default_category`, `default_category2`, `naming_template`);
  `board.updateTaskTitle(id, title)` novo (mesmo padrão de
  `updateTaskNote`); `board.updateProject` aceita os 3 campos novos.

## Correções da leva anterior: ícone de projeto, rolagem, humor e busca (01/09)

Feedback em cima da leva anterior (print da tabela de Etapas mostrando
informação cortada) + confirmação de que as carinhas de humor não tinham
entrado ainda (só a decisão do formato, não o código):

- **Ícone de projeto**: virou só o ícone da pastinha (sem texto "Projeto"),
  preenchido e verde, posicionado antes da bolinha de status — no mesmo
  espaço do grip/número de posição, não mais dentro da célula de
  descrição. `FolderIcon` ganhou uma variante `filled`.
- **Projetos ainda cortava informação**: a barra de rolagem horizontal da
  tabela de Etapas era invisível (`scrollbar-width:none`, padrão do resto
  do app) — dava pra rolar até o Excluir, mas nada indicava isso. Agora,
  só nessa tabela (`.project-wide`), a barra fica visível.
- **Carinhas de humor implementadas**: `MOOD_EMOTIONS` novo em
  `lib/mood.ts` (estressado/ansioso/nervoso/desmotivado/confiante/em paz,
  cada um com emoji), campo `moodEmotion` no `DailyLog` (migração
  `add_mood_emotion_to_daily_logs`), chips clicáveis dentro do mesmo bloco
  de Humor no Painel do dia — exatamente como decidido: junto do check-in
  existente, intensidade 1-5 continua igual.
- **Busca com deep-link**: clicar num resultado agora abre o item de
  verdade — tarefa abre em modo de edição (com foco/scroll até ela);
  lembrete abre o modal de detalhes completo; livro rola até a linha dele
  com um destaque rápido. Mecanismo novo (`focusRequest` no
  `board-context`) — quem faz a busca "pede foco" num item, e o
  componente daquele item (TaskRow/ReminderRow/BookRow) reage abrindo/
  rolando até ele sozinho.
- Livros ganhou uma **barra de busca própria** dentro da seção, filtrando
  por título nos três grupos.

**Pendência sinalizada, ainda não construída**: no Dashboard, o Leandro
pediu pra além de Semana/Mês ter também visão por **Dia**, e blocos de
"quantos dias fiz X essa semana/mês" não só pra atividade física (Cross/
Corrida), mas também pra **Gratidão** e **Leitura**. Fica junto do resto
do dashboard novo, pro próximo round.

## Leva grande de ajustes + próximos passos definidos (01/09)

O Leandro mandou uma lista grande de pedidos numa mensagem só. Organizei em
checklist, tirei as duas dúvidas de design por pergunta direta, implementei
o que era bem definido nesta rodada e deixei documentado (com a decisão já
tomada) o que é maior e fica pra próxima rodada.

**Implementado:**
- **Bug corrigido**: marcar 2+ dias da semana num Lembrete travava os campos
  de horário e de aviso antecipado (ficavam desabilitados até ter uma data
  também marcada, o que não fazia sentido pra recorrência por dia da
  semana). Corrigido — reproduz exatamente a queixa **"percebi que quando
  escolho 2 dia da semana no lembrete não consigo nem colocar o horário."**
- Campo Observação (Tarefas e Lembretes) abre direto no modo expandido, sem
  passar pelo popover pequeno — `CommentButton` ganhou a prop
  `alwaysExpanded`.
- **Auto-save a cada 30s** nos campos de observação (Tarefas, Lembretes,
  resumo de Livros) — evita perder texto se fechar sem clicar em Salvar.
- "Blocos fixos do dia" virou **"Dia a Dia"**.
- Tag "Sem data" fica amarela com ícone de atenção, com um texto lembrando
  de colocar data.
- Atividades físicas: label do campo mudou pra **"Como se sentiu durante a
  atividade?"**; Crossfit e Corrida ganharam opções com emoji (Corrida com
  o set pedido: 🥵 Pesado / 🙂 Normal / 🪶 Leve / 🕊️ Voando).
- Tarefa de projeto sem data ganha um chip **"Projeto"** (ícone de pasta,
  igual ao do menu lateral) mais evidente que o ícone discreto de antes; a
  confirmação de exclusão agora avisa que a tarefa pertence ao projeto
  (nome do projeto + ícone de pasta no título do aviso).
- Página de Projetos ficou mais larga (mesmo ajuste já usado em Lembretes)
  — corrige o botão Excluir das etapas que estava fora da área visível sem
  nenhuma indicação de que dava pra rolar até ele.

**Discutido e decidido, fica pra próxima rodada (já com o caminho
escolhido, pra ir rápido quando chegar a vez):**
- Carinhas de humor novas (estressado/ansioso/nervoso/desmotivado/confiante/
  em paz): entram junto do check-in de Humor que já existe — mesma tela,
  intensidade 1-5 continua, mais um campo pra marcar a emoção específica.
  Decisão do Leandro (perguntei as opções, ele escolheu "junto do Humor").
- Recorrência dos Lembretes a cada N semanas/meses/anos: vai virar um campo
  numérico "a cada [N]" dentro dos selects Semanal/Mensal/Anual que já
  existem (sem trocar a estrutura da tela). Decisão do Leandro.
- Busca: clicar num resultado deve abrir o item direto (editar a tarefa,
  abrir o lembrete, ir pro livro) em vez de só trocar de aba; Livros ganha
  barra de busca própria dentro da seção. Precisa de um mecanismo de "foco
  pendente" cruzando telas — maior, fica pro próximo round.
- Projetos: tags padrão por projeto (aplicadas automaticamente em toda
  etapa nova) + nomenclatura automática das etapas (ex.: "[Projeto]
  [Etapa_01] - descrição") com um botão "Atualizar nomenclatura" que
  reaplica o padrão em todas as etapas de uma vez, sem mexer na descrição.
- Dashboard: bloco semanal/mensal mostrando dias com atividade física
  (Cross/Corrida por enquanto), estendendo depois pra Lazer/Gratidão/
  Leitura.
- **Aba Ferramentas** (anotado como pedido, sem construir ainda): caderno de
  ganhos, caderno de gratidão, "Eu sou", provérbios sublinhados — e depois
  outras como Roda da Vida/Mapa da Alma. Ideia do Leandro: a IA usar esse
  material pra puxar frases, reconhecimento e lembretes de conquista nos
  dias desanimados. **"vamos começar subindo pelas ferramentas mais fáceis
  de aplicar quando chegar aqui."**

**Nota importante — isso já existe**: o pedido de "mapeamento por item" nos
blocos Dia a Dia (ex.: Piscina → aplicar algicida/trocar filtro/aspirar +
2 tags) já está construído — o botão Editar de qualquer hábito/bloco tem
"Opções de nota", onde já dá pra cadastrar as opções específicas daquele
item, com multi-seleção numa entrada só (mesmo mecanismo que já funciona
pro Lazer). Só falta o Leandro configurar pra Piscina e outros itens que
quiser — não precisa de código novo pra isso.

## Notificação push (grátis, sem WhatsApp/Meta) (30/08)

Discussão sobre alternativas ao WhatsApp pra lembrete no celular: pesquisei
Web Push, Telegram bot e o app Toki (referência do Leandro — liga por voz e
transcreve, mas isso é pago por trás via telefonia, não dá pra copiar de
graça). Decisão combinada com o Leandro: **Web Push como espinha dorsal
gratuita, WhatsApp Business como canal pago opcional só depois, se os dados
de uso mostrarem que vale o custo** — e ele pediu pra eu acompanhar isso
junto conforme o desenvolvimento avança.

Implementado agora (fundação técnica, primeira etapa):
- `public/sw.js`: service worker novo, só cuida de push por enquanto (`push`
  → mostra a notificação; `notificationclick` → foca/abre o app). Confirmei
  que o FARO já tinha tudo mais que precisa pra instalar (manifest, ícones,
  meta tags do iOS) — só faltava essa peça.
- Tabela nova `push_subscriptions` (migração `create_push_subscriptions`,
  RLS própria por usuário) guarda a inscrição de push de cada dispositivo
  (endpoint + chaves).
- Duas rotas de API (`/api/push/subscribe` e `/api/push/test`) usando a lib
  `web-push` com chaves VAPID (identificação do nosso servidor pros serviços
  de push do navegador — não é enviado a nenhum terceiro além disso).
- Em Configurações: novo bloco "Notificações push" com toggle pra ativar e
  botão "Testar notificação", pra confirmar que a entrega funciona de
  verdade antes de conectar em qualquer lembrete de verdade.

**Pendências pro Leandro**: as chaves VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) foram geradas e estão só no
`.env.local` local (não vai pro git) — precisam ser adicionadas nas
variáveis de ambiente do projeto na Vercel antes do deploy funcionar em
produção. Não tenho ferramenta pra fazer isso automaticamente, é um passo
manual no painel da Vercel.

**Não testei entrega de verdade** (não tenho celular/navegador logado nesse
ambiente) — só validei que o app builda, o service worker e o manifest são
servidos corretamente, e não há erro no servidor. Teste real (o botão
"Testar notificação" chegando no celular) só o Leandro consegue confirmar,
depois das chaves estarem configuradas na Vercel.

**Ainda não conectado a lembretes de verdade** — por enquanto é só a
fundação (ativar/testar). Conectar isso ao motor de alertas de Lembretes
(pra realmente notificar quando um lembrete vence) fica pro próximo passo,
depois de confirmar que o teste manual chega.

## Ícone de abrir lembrete movido pro início da linha (30/08)

Pedido do Leandro: **"o ícone de expandir que você colocou no lembrete
ficou muito escondido, vamos colocar ele no início da task — antes do
status — lá em cima vamos dar um nome para essa coluna, tipo 'Abrir'."**

O ícone de expandir (que abre o modal com todos os dados do lembrete) saiu
do fim da célula de Descrição — onde ficava apertado ao lado do texto
truncado — e virou a primeira coluna da tabela, antes do Status, com o
cabeçalho "Abrir".

## Ordem das etapas do Projeto (numeração + arrastar) (30/08)

Print das Etapas de um projeto com a sequência de tarefas fora de ordem
(Dia 6, Dia 2, Dia 7...): **"vamos colocar ordem aqui... 1,2,3... e poder
organizar. Na hora de criar as task de sequência ela está ficando fora de
ordem (aba projetos)."**

Causa raiz: uma etapa nova ganhava a mesma "ordem" usada no backlog geral
(compartilhada com qualquer tarefa sem data, de qualquer projeto), então a
sequência dependia de coisas sem relação com aquele projeto. Agora
`board.addTaskToProject` calcula a ordem olhando só as etapas daquele
projeto (sempre entra no fim da lista dele). A lista de Etapas ganha
numeração visível (1, 2, 3...) e vira arrastável de verdade — mesmo padrão
grip+número já usado na fila de leitura dos Livros — pra reorganizar na
mão quando precisar (útil pra corrigir a ordem das etapas que já existiam
fora de sequência).

## Lembrete com visão focada (texto e observação completos) (30/08)

Print da tabela de Lembretes com a descrição cortada: **"o texto não está
aparecendo todo aqui no lembrete e isso não tem problema, o problema está
que quando eu clico na task ela não abre de forma que dá pra ver o texto
todo e anotações. Temos que ter um clique que resolva isso, podemos ver
com foco todos os dados do lembrete."**

A célula de Descrição continua truncando (normal, cabe pouco espaço na
tabela), mas agora ganha um ícone de expandir sempre visível ao lado do
texto (mesmo `ExpandIcon` já usado no popover de Observação). Clicar nele
abre um modal focado (`ReminderDetailModal`) com tudo do lembrete numa
tela só: status, título completo (editável), recorrência/data, e a
observação com o editor de texto rico — sem precisar abrir cada campo
separado pra montar o quadro completo.

## Prioridade nos Livros (29/08)

Pedido direto do Leandro: **"só colocaria bandeira de prioridade nos
livros, acho melhor alta, media e baixa como nas taks."**

Adicionado o mesmo campo `priority` ("alta"/"media"/"baixa") que já
existia em Tarefas, agora também em `Book` — reaproveitando a mesma
bandeirinha colorida (`FlagIcon` + cores `--flag-alta/media/baixa`) e
o mesmo comportamento de clique-pra-avançar (alta → baixa → média →
alta) que já era usado no `TaskRow`. As funções `priorityColor`,
`priorityLabel` e `nextPriority` foram exportadas de `TaskRow.tsx` e
reaproveitadas em `BooksView.tsx` em vez de duplicadas.

Migração `add_priority_to_books` (coluna `priority text not null
default 'media'`) — os livros já cadastrados ficaram todos com
prioridade "Média" por padrão, o Leandro pode reclassificar clicando
na bandeira de cada um. A bandeira aparece na linha do livro, ao lado
do seletor de status.

## Edição de tarefa mais organizada, Lazer com múltiplas tags, fila de leitura numerada (29/08)

Print da edição de tarefa com feedback direto: **"organizar melhor as
informações de edição da task, exemplo o campo observação estar muito
escondido, ele tem que estar sempre mais aberto — não gosto desse visual
desorganizado."**

- `edit-grid` (linha de edição de tarefa/hábito/bloco) deixa de ser um
  flex-wrap solto e vira um grid de verdade — todo campo agora tem
  rótulo (Categoria, 2ª categoria, Prioridade e Data não tinham antes,
  só os de baixo tinham). Observação ganha destaque: `CommentButton`
  ganha uma variante `field` (botão do tamanho de um campo normal, com
  prévia do texto ou placeholder "+ Observação...", em vez do ícone
  pequeno de antes) e ocupa duas colunas na grade.
- **Lazer ainda não funcionava direito**: *"eu saí para me divertir e
  fiz 3 coisas, quero colocar as 3 tags dentro do mesmo tempo e não
  está dando."* O popover de entradas (blocos com tipos, tipo Lazer)
  só deixava marcar um tipo por vez — cada atividade virava uma entrada
  separada, obrigando a repetir o fluxo. Agora os chips de tipo são
  multi-seleção: marca Futebol + Sauna + Piscina de uma vez, e um clique
  em Adicionar cria uma entrada só, com os três tipos juntos e o mesmo
  tempo (opcional) pra todos.
- **Fila de leitura**: *"não entendi como colocar ordem... numeração,
  primeiro, segundo, terceiro."* Arrastar sozinho não deixava claro que
  dava pra reordenar. Cada livro do grupo "Para ler" agora mostra um
  número de posição (1, 2, 3...) e um ícone de grip do lado do título.


Depois do modal expandido, o Leandro mandou prints de referência (planilha
PDA de outro projeto, e a barra de formatação do ClickUp) e pediu:
**"ele tem que funcionar em todos campos onde podemos escrever
observações, resumos, notas."**

- Novo componente `RichTextEditor` (Tiptap — `@tiptap/react` +
  `starter-kit` + extensões de underline/alinhamento/link/checklist),
  com barra de: negrito, itálico, sublinhado, tachado, título 1/2/3,
  lista, checklist, alinhar esquerda/centro/direita/justificado, link.
  Ícones novos vieram do pack (`Edit/Bold`, `Edit/Italic`, etc.).
- Guarda o conteúdo como HTML no mesmo campo de texto que já existia
  (sem migração — `note`/`description`/`insights` continuam colunas de
  texto simples, só que agora podem conter HTML).
- Onde entrou: o modal expandido de Observação (Lembretes, Dieta, humor,
  água...), a nota da Tarefa (que virou um ícone de observação clicável
  em vez do campo de texto solto que tinha antes — `board.updateTaskNote`
  novo), a descrição do Projeto, e o resumo/insights dos Livros.
- **Onde não entrou de propósito**: o popover pequeno (o balãozinho que
  abre direto, sem precisar expandir) continua com texto puro — não cabe
  uma barra de formatação num popover desse tamanho. Ele mostra/edita a
  versão sem formatação (texto puro) do conteúdo; formatar de verdade
  precisa abrir o expandido. Se você editar ali depois de já ter
  formatado algo, a formatação daquele campo é perdida (vira texto puro)
  — é a troca consciente pra não arriscar mostrar tag HTML solta na tela.
- Em qualquer lugar que só mostra uma prévia em texto (tooltip do ícone
  de observação, por exemplo), a formatação é removida antes de exibir
  (`stripHtml`, novo em `lib/rich-text.ts`) — só o texto conta pra
  esses casos.
- **Não testei a digitação/formatação de verdade num navegador logado**
  (não tenho as credenciais desta sessão) — validei `tsc`, `eslint`,
  `next build` e que o app sobe sem erro no `next dev`, mas vale um
  teste manual seu assim que puder.

## Projetos como PDA — próximo passo (discussão, ainda não construído) (29/08)

Print da planilha PDA (5W2H: Ação/Início/Fim/Onde/Responsável/Motivo
Estratégico/Procedimento/Investimento/Status/%Conclusão) recebido. Pergunta
de volta do Leandro: **"baseado na tabela que eu mandei, o que podemos
ajustar que seria indispensável sem inventar demais? [...] a ideia é que
dependendo da task tenha como colocar certos tipos de campos... vai
depender muito do projeto."**

Como cada projeto pede campos diferentes, a recomendação (ainda não
implementada, aguardando o próximo passo) é não fixar um monte de colunas
novas na tabela — em vez disso:

- Adicionar só **% Conclusão** (0-100) como campo de verdade na etapa —
  é o único conceito genuinamente novo (hoje só existe feito/não-feito).
- Deixar "Onde", "Responsável", "Procedimento", "do que depende" etc.
  dentro da própria observação da etapa (texto livre) — que agora, com o
  editor rico acima, já dá pra estruturar com títulos/checklist/negrito
  conforme cada projeto precisar, sem precisar de campo fixo no banco.
- "Motivo Estratégico" já existe — é o campo de objetivo do projeto.
- Fica pra depois (e junto com o pedido de distribuir o projeto num
  prazo/quantas horas por dia): repensar se algum desses viram campo de
  verdade depois que aparecer um padrão de uso real.

**Resposta do Leandro (29/08, mais tarde)**: **"acho que podemos no bloco
de projeto escolher: Adicionar projeto ou PDA (plano de ação) e depois
quando surgir essa demanda organizamos essa implementação com calma —
deixa no briefing para resolver."** Ou seja: por enquanto só anotar — a
ideia é que criar em Projetos ofereça dois tipos (Projeto normal / PDA),
mas só implementar quando a necessidade de um PDA de verdade aparecer de
novo. Nada a construir agora.

## Observação expansível, status de lembrete por escolha, recorrência continua, Lazer sem minutos obrigatórios, fila de leitura (29/08)

Rodada de pedidos avulsos, com checklist prévio de novo (o Leandro pediu
pra isso virar padrão: **"faça sempre o check list ao lado para eu ir
conferindo"**):

- **Observação expansível**: `CommentButton` ganha um ícone de expandir
  dentro do popover pequeno, que abre um modal grande (reaproveitando o
  mesmo padrão do resumo de livro — `.modal-backdrop`/`.modal-panel`) pra
  nunca mais cortar o campo nem esconder o botão Salvar. Formatação rica
  (negrito, itálico, listas, checklist, alinhamento — o Leandro mandou
  prints do ClickUp como referência de toolbar) e anexos ficam pra uma
  próxima rodada, é maior.
- **Status do lembrete abre escolha em vez de alternar direto**: clicar no
  chip de status agora abre um popover (`Pendente`/`Concluído`, reusando o
  visual `.status-menu` já usado no status das tarefas) em vez de já marcar
  concluído/pendente na hora do clique.
- **Lembrete recorrente concluído gera o próximo**: pedido — *"quando uma
  tarefa recorrente em lembretes é concluída ela vai para concluída, porém
  e a recorrência dela? ela teria que gerar outro lembrete pra dar
  continuidade."* Novo `board.completeReminder(id)`: marca o lembrete atual
  como concluído (fica como histórico) e cria automaticamente um novo
  lembrete pra próxima ocorrência (mesmo repeat/dias da semana/aviso),
  calculando a próxima data a partir de hoje (`nextReminderOccurrenceDate`,
  novo em `reminder-alerts.ts`).
- **Lazer sem minutos obrigatórios**: o bloco fixo "Lazer" já tinha os
  tipos certos cadastrados (Futebol, Sauna, Piscina...) e já suportava
  várias entradas por dia — só que minutos era obrigatório pra cada uma. O
  Leandro só queria marcar as atividades do dia sem cronometrar cada uma;
  agora minutos é opcional no popover de entradas.
- **Fila de leitura dos livros**: `Book` ganha campo `order` (migração
  `add_sort_order_to_books`); dá pra arrastar os livros dentro do grupo
  "Para ler" pra definir a ordem de leitura — só esse grupo é arrastável,
  os outros (Lendo/Concluído) não precisam.
- **Ideias maiores discutidas, não construídas ainda**: Projetos virarem um
  PDA de verdade (o Leandro mandou uma planilha de referência — colunas
  Ação/Início/Fim/Onde/Responsável/Motivo Estratégico/Procedimento/
  Investimento/Status/%Conclusão — vai precisar de um redesenho grande das
  etapas do projeto) e o envio de mensagem de verdade pelo WhatsApp (API
  do WhatsApp Business tem custo e verificação — vai precisar de uma
  conversa própria antes de começar).

## [IDEIA CAPTURADA, AINDA NÃO CONSTRUÍDA] FARO faz varredura de inconsistências (29/08)

Pedido do Leandro: **"a IA FARO faz uma varredura no sistema para encontrar
inconsistência — um projeto com várias task e tags diferentes, uma com
trabalho, outra com dev pessoal... pode ser cadastrada errado. ele verifica
se tem task muito atrasados, tasks e lembretes abandonados... coisas desse
tipo. em configurar FARO podemos definir os dias que ele faz essa varredura.
Perguntar por que não está lendo, por que não está tendo lazer... por
exemplo tenho anotações em livros para ler que são mais importantes para o
momento — ele pode me ajudar. seria interessante também colocar uma ordem
de leitura na fila dos livros."**

Só anotado por enquanto — é um projeto grande (motor de análise + tela nova
de configuração), fica pra depois de alinhar o escopo. Ideias iniciais do
que a varredura poderia checar:

- **Categoria inconsistente num projeto**: etapas com tags muito diferentes
  entre si (ex.: uma "trabalho", outra "dev pessoal") no mesmo projeto —
  sinaliza que alguma etapa pode estar vinculada ao projeto errado.
- **Tarefas muito atrasadas** (sem data recente / paradas há muito tempo).
- **Lembretes e tarefas "abandonados"**: sem interação (nem check, nem
  edição) por N dias.
- **Ausência de categorias inteiras** por um período — ex.: nada marcado em
  Lazer/Saúde há muito tempo, vale perguntar "por que você não está
  descansando/lendo?".
- **Fila de leitura dos livros**: como o Leandro já anota quais livros são
  mais importantes pro momento, o FARO poderia sugerir por onde começar —
  depende de existir uma ordem/prioridade na lista "Para ler" primeiro
  (esse pedaço, sim, é pequeno e dá pra construir antes do resto).
- Tela nova **"Configurar FARO"**: escolher em quais dias da semana essa
  varredura roda.

## Projetos com status Cancelado, botão Salvo, ícones só de indicação, Lembretes mais enxutos (29/08)

Rodada de refinamentos em cima da anterior, a partir de novos prints:

- **Projetos ganham status "Cancelado"** (antes só ativo/concluído). A tela
  de detalhe ganhou o botão **"Cancelar projeto"** (só aparece quando o
  projeto está ativo); a lista principal agora mostra três grupos, cada um
  com um rótulo + ícone (mesmo padrão do "Vencidos" de Lembretes): Projetos
  ativos / Concluídos / Cancelados.
- **Tempo do projeto**: saiu da faixa cinza separada e virou só o ícone de
  relógio + tempo total no canto da linha do nome do projeto, com tooltip
  "Soma total do tempo do projeto" — mais discreto, como pedido.
- **Botão Salvar projeto** agora rastreia se há mudança pendente: sem
  edição, mostra "Salvo" (com check) e fica desabilitado; assim que o nome
  ou a descrição mudam, volta a ficar ativo como "Salvar projeto".
- **Concluir/Reabrir projeto** troca o preenchido roxo pelo mesmo estilo
  contornado do "Excluir projeto" — só que o texto fica **verde** ao passar
  o mouse (`success-hover`, nova classe irmã da `danger-hover` já usada no
  Excluir).
- **Ícones de link/lembrete/observação na tarefa**: o sino e o balão de
  observação deixaram de abrir a edição da tarefa ao clicar — viram só
  indicadores visuais, com tooltip explicando cada um ("Tarefa com
  lembrete", "Observação na tarefa"). O ícone de link continua clicável
  (leva pro projeto), porque essa navegação já era intencional.
- **Lembretes**: a coluna Data mostra só dia e mês, sem o ano (`fmtDayMonth`,
  novo, ao lado do `fmtShortDate` que já existia pras outras telas). O texto
  da coluna Data agora trunca com reticências em vez de vazar pra fora da
  célula quando é muito longo (recorrência + aviso combinados) — a data
  completa continua no tooltip. Filtro ganhou o rótulo "Filtrar por:" antes
  dos botões.

## Lembrete arrastável, ícone de obs/lembrete na task, lembrete vinculado à tarefa, filtro de Lembretes (29/08)

Retomando o feedback com prints depois da entrega anterior: **"isso aqui não foi
mudado: Colocar uma bolinha ou ícone de arrasta na linha no meio dos números
de horário e tempo — não dá para rolar"**, mais três pedidos que ficaram de
fora (ícone de observação na task, tabela de Lembretes cortando na tela,
filtro de Lembretes) e um novo (lembrete dentro da tarefa). Antes de
executar, montei a lista pra aprovação — o Leandro só bateu o martelo na
decisão do item do lembrete-na-tarefa.

- **TimePicker realmente não rolava** — o CSS de overflow parecia certo no
  papel, mas sem uma scrollbar visível não tinha nenhuma pista de que dava
  pra rolar, e rolagem por wheel/touch sozinha não bastava. Resolvido com
  arrastar de verdade: `pointerdown`/`pointermove`/`pointerup` movendo o
  `scrollTop` da coluna (funciona com mouse e dedo), e um ícone de grip
  (`Interface/Drag_Vertical.svg` do pack, 6 bolinhas) centralizado entre as
  colunas de hora/minuto, no lugar do "⋮" discreto de antes. Corrigido no
  componente `TimePicker` — vale pra todos os campos que o usam.
- **Ícone de observação nas tarefas**: `TaskRow` mostra um ícone (balão de
  comentário) quando a tarefa tem nota preenchida, ao lado do ícone de
  vínculo com projeto — mesmo espírito do que já existia pra Projetos.
- **Lembrete dentro da tarefa** (pedido: *"tem tarefa que eu marquei pra
  final de semana — seria interessante criar lembretes também nelas"*):
  campo "Lembrete" na edição da tarefa, reaproveitando o mesmo popover de
  data/hora/repetição/dias/aviso dos Lembretes normais. Decisão confirmada
  pelo Leandro — *"pode sim ser adicionado automaticamente em lembretes...
  ela entra como um lembrete mais padrão: Lembrete para executar a tarefa X"*
  — então ao definir uma data ali, é criado um `Reminder` de verdade
  (`taskId` apontando pra tarefa), com o título "Lembrete para executar a
  tarefa: <nome>", que aparece normalmente na tela de Lembretes também —
  sem duplicar a lógica de vencido/aviso que já existe. Migração
  `add_task_id_to_reminders` (FK com `on delete cascade` — apagar a tarefa
  de vez também remove o lembrete vinculado).
- **Três ícones juntos na linha da tarefa**: onde já estava o ícone de
  vínculo com projeto, agora podem aparecer até três — 🔗 projeto vinculado,
  🔔 lembrete (preenchido, mesmo padrão visual do sino de Lembretes), 💬
  observação — cada um com tooltip explicando o que é ("Tarefa vinculada a
  um projeto" / "Tarefa com lembrete" / "Observação na tarefa"). Clicar em
  qualquer um abre a edição da tarefa.
- **Tabela de Lembretes cortando na tela**: alargado o container só dessa
  página (classe `reminders-wide` sobre `.narrow-list`, sem mexer nas
  outras telas que reaproveitam a mesma classe) e reduzidas as larguras das
  colunas, além de rolagem por toque mais suave (`-webkit-overflow-
  scrolling:touch`) pra quando ainda precisar rolar num celular bem
  estreito.
- **Filtro em Lembretes**: linha de botões (reaproveitando o mesmo visual
  do toggle Hoje/Semana/Dashboard) — Todos / Recorrentes / Hoje / Semana /
  Atrasados.

## Lembretes viram tabela de verdade (igual à de tarefas) + botão Salvar em Projetos (28/08)

- Correção de rota: a tentativa de cartão (seção logo abaixo) não
  funcionou. Feedback direto, com print da tabela de tarefas:
  **"em lembretes não ficou bom... era para funcionar igual a
  task...tipo assim: uma faixa em cima escrevo — status, descrição...
  e o que mais tiver e organizar para baixo igual as task, esse
  formato já funciona muito bem."**
- `ReminderRow` virou uma linha de grid de verdade, com um cabeçalho
  fixo em cima (`Status | Descrição | Tipo | Data | Obs | Excluir`),
  reaproveitando as mesmas classes CSS da tabela de tarefas
  (`.task-list-header`, `.tlh-cell`, `.task-table-scroll`) pra manter
  a mesma cara — só que com colunas de largura fixa, sem
  arrastar/redimensionar (a tabela de tarefas usa um hook específico
  pra isso, não valia a pena generalizar só pra essa segunda tabela).
- O popover estreito do sininho (barra de topo) não cabia numa tabela
  de 6 colunas, então ganhou uma linha compacta própria
  (`ReminderCompactRow`), voltando ao formato de linha única de antes
  do cartão (check redondo + título + data + excluir) — reaproveita
  CSS que já existia (`.reminder-row`, `.reminder-check`) e nunca foi
  removido, porque também é usado pela tela de Medicamentos.
- O cálculo de status (Pendente/Hoje/Vencido/Concluído) continua o
  mesmo de antes, só mudou a forma como é exibido.
- Junto, **Projetos** ganhou o botão explícito **"Salvar projeto"**
  (pedido no mesmo print: "em projetos tem que ter um botão — Salvar
  projeto") — antes só salvava ao sair do campo (blur), sem
  confirmação visível. O blur continua funcionando também, o botão é
  só o caminho garantido e descobrível.
- E também a pedido do Leandro, a aba do projeto ganhou um contador
  de tempo (**"seria importante ter um contador de tempo que mostra a
  soma de todas as task envolvidas... tempo gasto no projeto, tempo
  gasto nas tasks, para gerar o relatório sempre correto"**): soma o
  `trackedSeconds` de todas as etapas vinculadas e mostra
  "Tempo gasto no projeto" formatado (Xh Ymin). Não fica "vivo"
  segundo a segundo enquanto um cronômetro de etapa está rodando —
  mesmo comportamento do resto do app (Dashboard etc.), atualiza
  quando o cronômetro é pausado. Como usa direto o `trackedSeconds`
  de cada tarefa (não um número guardado à parte), fica sempre
  consistente pra virar relatório depois.

## Lembretes viram cartão (Status / descrição / tipo / data) (28/08)

- Retomando o pedido de mais cedo: **"não estou gostando desses
  recorrentes perdidos aí no meio — talvez marcar fazer uma marcação
  como tag, porém em cima ter a descrição: Status / descrição / tipo /
  data — meio parecido com as task, porém aqui no lembrete."**
- `ReminderRow` virou um cartão de duas linhas: em cima, um chip de
  **status** colorido (Pendente/Hoje/Vencido/Concluído — clicável,
  substitui o check redondo antigo), um chip de **tipo**
  (Recorrente/Pontual), e à direita observação/data/excluir; embaixo,
  a **descrição** (título) numa linha só pra si, mais legível. Não
  criei uma tabela de status configurável separada (como a dos
  status de tarefa) — os 4 estados são calculados a partir do que já
  existe (`done`, vencido, hoje), pra não duplicar conceito nem
  precisar de mais uma tela de configuração.
- Isso deixa os recorrentes no mesmo formato de cartão dos outros —
  já não ficam mais "perdidos" porque toda linha agora tem a mesma
  estrutura, só muda o chip de tipo.

## Projetos (PDA — Plano de Ação): tarefas vinculadas como etapas (28/08)

- Conversa longa com o Leandro sobre o item "vincular tarefas" da
  lista de ajustes. Exemplo dele: **"tenho um app financeiro que quero
  fazer... tenho tarefas para listar para isso — entaão elas estariam
  relacionadas, é como se fosse um PDA (plano de ação) pra aquela
  tarefa."** Depois de discutir o modelo (proposto: uma entidade
  Projeto separada, tarefas apontam pra ela), ele confirmou: **"pode
  ser assim, e quando uma tarefa for vinculada aparece um ícone de
  vínculo nela, e sempre leva pro projeto principal pra poder fechar
  ele também quando concluído."**
- Nova entidade **Projeto** (`projects`): nome, descrição/objetivo
  livre, status (`active`/`done`), data de criação. Tarefa ganha
  `projectId` opcional (`tasks.project_id`, `ON DELETE SET NULL` — se
  o projeto for excluído, as tarefas continuam existindo soltas).
- Nova tela **Projetos** no menu lateral: lista de projetos (ativos
  primeiro, concluídos depois) com progresso "X/Y etapas". Abrindo um
  projeto: nome e descrição editáveis, barra de progresso, botão
  Concluir/Reabrir, lista das tarefas vinculadas (reaproveitando o
  `TaskRow` normal — timer, checkbox, categoria, tudo igual), e um
  campo pra adicionar uma etapa nova direto ali (já nasce vinculada).
- Qualquer tarefa (na edição, junto de categoria/prioridade) agora tem
  um campo "Projeto" pra vincular/desvincular. Uma tarefa vinculada
  mostra um ícone de link discreto do lado do título, em QUALQUER
  lista onde ela aparecer (Hoje, Semana, Backlog) — clicar nele leva
  direto pro projeto, de qualquer lugar do app.
- Detalhe técnico: como a navegação entre telas é um estado local do
  componente principal (`BoardApp.tsx`), e o `TaskRow` é usado em
  vários lugares sem acesso direto a essa navegação, criei um
  mecanismo de callback registrado no `board-context` (`openProject`)
  — mesmo princípio já usado pra `askConfirm`.
- **Ainda não feito**: reordenar/arrastar etapas dentro do projeto
  (por enquanto usa a ordem padrão das tarefas); marcar percentual de
  conclusão baseado em pesos por etapa (fica só contagem simples).

## Leva "AJUSTES FARO APP": itens fáceis da lista (28/08)

- O Leandro colou uma lista grande de próximos passos ("AJUSTES FARO
  APP"), pedindo pra executar pelos mais fáceis primeiro. Itens feitos
  nesta leva:
  - **TimePicker não rolava**: bug real de flexbox — a coluna
    (`.time-picker-col`) tinha `overflow-y:auto` mas sem altura
    definida nem `min-height:0`, então o navegador simplesmente
    esticava a caixa em vez de rolar (clássico bug de flex item com
    overflow). `.time-picker-pop` ganhou altura fixa (`height:190px`)
    e as colunas `min-height:0` — junto com `-webkit-overflow-
    scrolling:touch` e `touch-action:pan-y` pra rolagem por toque
    funcionar bem em iOS. Também um indicador visual (⋮) discreto na
    linha divisória, pro Leandro perceber que dá pra rolar ali —
    pedido: *"colocar uma bolinha ou ícone de arrasta na linha no
    meio... não precisa ter essa marcação cinza de rolagem pros 2 —
    somente uma linha no meio."*
  - **Lembretes: ordenar pelos mais próximos**: pedido *"organizar os
    lembretes por datas pros mais próximos não ficar bagunçado."* A
    lista (tanto vencidos quanto pendentes) agora ordena por data+hora
    mais próxima primeiro; sem data marcada fica sempre por último.
  - **Botão "Limpar" vira ícone de borrachinha**: pedido *"trocar o
    botão limpar com um ícone de borrachinha."* Novo `EraserIcon`
    (desenhado à mão — o pack não tem ícone de borracha) no lugar do
    botão de texto.
- **Itens da mesma lista NÃO feitos ainda** (registrados aqui pra não
  perder, com o motivo):
  - **Observação nos Lembretes**: já estava pedido de novo na lista,
    mas já tinha sido implementado numa leva anterior deste mesmo dia
    — nada a fazer.
  - **Vincular tarefas entre si / "PDA" (Plano de Ação) pra projetos
    como um app financeiro**: o próprio Leandro pediu explicitamente
    pra **discutir antes** de implementar — ainda não discutido.
  - **Sinalizar visualmente tarefas com observação**: mesma coisa, o
    Leandro pediu **"vamos discutir isso?"** — ainda não discutido.
  - **Filtro em Lembretes** (recorrentes / dia / semana / atrasados) e
    **redesenho do lembrete recorrente** (virar um cartão com
    Status/descrição/tipo/data, parecido com a tabela de tarefas) —
    maiores, ainda não iniciados.
  - **Lembretes dentro de Tarefas** (poder marcar uma tarefa de fim de
    semana pra também gerar um lembrete) — feature nova, ainda não
    iniciada.

## Lembretes excluídos vão pra Lixeira + botão Limpar data/hora (28/08)

- Dois bugs/pedidos do Leandro: **"lembretes excluídos não estão indo
  para lixeira"** e **"quando eu coloco data e horário errado no
  lembrete não dá para apagar — colocar um botão limpar, hora e data,
  nos campos lembrete."**
- Lembretes ganharam o mesmo soft-delete que as tarefas já tinham:
  `Reminder.deletedAt`, nova coluna `deleted_at` (migração
  `add_deleted_at_to_reminders`). Excluir um lembrete agora manda ele
  pra Lixeira em vez de apagar na hora — aparece na tela Lixeira
  (Restaurar / Excluir de vez) e também no escopo "Lixeira" da busca
  da topbar, junto com as tarefas excluídas.
- Popover de data/hora do lembrete ganhou um botão **"Limpar"** ao
  lado do horário, que zera data e hora de uma vez — antes não tinha
  como tirar uma data/hora errada sem excluir o lembrete inteiro.

## Observação nos Lembretes (28/08)

- Pedido do Leandro: **"seria interessante também ter como adicionar
  observações nos LEMBRETES — se quiser colar um texto, escrever
  algo."**
- Novo campo `Reminder.note` (texto livre), com o mesmo `CommentButton`
  já usado em Dieta/humor/% — ícone de balão ao lado de cada lembrete,
  abre um popover pra colar ou escrever qualquer observação.

## Lembretes vencidos ganham categoria própria, separada dos demais (28/08)

- Pedido do Leandro, olhando a lista de Lembretes: **"sabe essa linha
  amarela - é de um lembrete vencido. Quando for assim, acho que
  devemos subir ele para uma categoria vencido, ficar separado dos
  outros."**
- Bug de raiz encontrado no caminho: um lembrete com hora marcada (ex.:
  hoje às 13:30) só virava "vencido" (vermelho) depois que o DIA
  inteiro passasse — a comparação só olhava a data, não a hora. Por
  isso aquele lembrete de hoje às 13:30, já com o horário passado,
  ainda aparecia amarelo ("hoje") em vez de vermelho ("vencido").
  Nova função `isReminderOverdue` (`reminder-alerts.ts`) agora
  considera a hora também: sem hora marcada, vence só depois das
  23:59 (igual antes); com hora marcada, vence assim que aquele
  horário passa, mesmo no mesmo dia.
- A tela de Lembretes agora separa os vencidos num bloco próprio no
  topo ("Vencidos", com destaque vermelho), antes da lista normal de
  pendentes — em vez de só pintar a linha por dentro da mesma lista.
  O contador do sino (atalho da home) também usa a mesma regra.

## Seletor de horário: visual mais limpo + estendido pra campos de duração (28/08)

- Feedback do Leandro depois de ver o `TimePicker` novo funcionando:
  **"ficou bem melhor assim... porém eu deixaria somente uma linha
  separando os 2, não precisa ter essa marcação cinza de rolagem pros
  2 — somente uma linha no meio. E você colocou só no horário — deve
  ser inserido também em todos os campos TEMPO, horas e marcação de
  tempo, em todos os lugares."**
- Visual: tirada a barra de rolagem visível das duas colunas
  (hora/minuto) — sobra só uma linha fina separando as colunas, sem a
  "caixinha" de cada lado.
- Novo `MinutesPicker` (mesmo arquivo `TimePicker.tsx`): mesmo
  seletor de duas colunas, mas pra duração (quantidade de tempo, ex.:
  90min = 01:30) em vez de horário do relógio — converte de/pra
  minutos totais. Substituiu todo campo de duração que ainda era um
  número cru: duração da tarefa, duração ao criar/editar hábito e
  bloco fixo, minutos no popover de registrar o dia (hábitos/blocos,
  inclusive o modo de múltiplas entradas), e a duração da reunião
  (que já usava esse padrão, só reaproveitado).

## Seletor de horário próprio, padronizado em todo o app (28/08)

- Pedido do Leandro, com print do seletor nativo de horário (o
  relógio do sistema, com os números 17/36 destacados em azul forte):
  **"nos horários de todas as task vamos deixar assim tbm... só
  gostaria que esses blocos com números ficassem menores - mais
  discreto, esse azul tbm pode ser mais suave... a ideia é padronizar
  e mudar em tudo"** — anexando como referência de "discreto" a
  própria tag roxa que o app já usa (`.section-pill.accent`), pedindo
  pra adaptar pro azul.
- O seletor nativo do navegador (`<input type="time">`) não dá pra
  restilizar — cada sistema operacional desenha o próprio, sem
  controle nenhum via CSS (é por isso que aparecia grande/destacado
  daquele jeito). Único jeito de padronizar de verdade era construir
  um seletor próprio.
- Novo componente `TimePicker` (`src/components/board/TimePicker.tsx`):
  botão mostrando "HH:MM" que abre um popover com duas colunas
  roláveis (horas e minutos), no mesmo padrão de popover do resto do
  app (portal + `useClampedPopoverPos`). O número selecionado fica
  destacado num "chip" pequeno e discreto.
- Cor nova: `--info` / `--info-soft` (variáveis CSS, claro e escuro),
  um azul discreto reaproveitando o tom que já existia em
  `--book-blue`/`--flag-media`, com o mesmo fundo suave (soft) que a
  tag roxa (`--accent-soft`) já usava — só trocando a cor.
- Trocado em TODOS os lugares que tinham `<input type="time">`:
  horário da tarefa (editor da tarefa), refeições da Dieta (linha e
  "+ adicionar"), horário de lembrete, horário de remédio, duração da
  reunião (o campo `--:--`), e os horários de "Acordou"/"Dormiu" do
  sono. Um componente só, mesmo visual em todo lugar.
- **Cuidado técnico**: como o `TimePicker` abre seu próprio popover
  via portal (fora da árvore DOM do popover que o contém), os
  popovers de Lembretes/Medicamentos/Reunião que já tinham lógica de
  "fechar ao clicar fora" precisaram aprender a ignorar cliques dentro
  do popover do `TimePicker` (checando `.closest(".time-picker-pop")`),
  senão o popover de fora fechava sozinho ao escolher a hora.

## Vários cronômetros rodando ao mesmo tempo (28/08)

- Pedido do Leandro: **"precisamos tbm deixar mais de 1 task contando
  tempo - por exemplo enquanto eu vou pedindo pra vc me ajudar aqui eu
  estou realizando outras tarefas tbm."**
- Até aqui o app só permitia UM cronômetro ativo por vez: dar play em
  outra tarefa pausava automaticamente a anterior (`activeTimer:
  ActiveTimer | null`, e a tabela `active_timer` tinha `user_id` como
  chave primária — só cabia uma linha por usuário).
- Reestruturado pra permitir quantos cronômetros o Leandro quiser ao
  mesmo tempo:
  - Migração `allow_multiple_active_timers`: a tabela `active_timer`
    ganha uma chave própria (`id uuid`), a antiga PK em `user_id` sai,
    e as colunas viram `NOT NULL` (deixaram de precisar representar
    "vazio" via linha ausente virando `null`).
  - `BoardState.activeTimer` (um só) virou `activeTimers: ActiveTimer[]`
    (lista) em todo o app — `use-board.ts`, `TimerButton.tsx`,
    `TimerNudges.tsx`.
  - Dar play numa tarefa/hábito/bloco NÃO pausa mais os outros
    cronômetros em andamento — cada um roda e acumula tempo
    independente.
  - O badge do cronômetro ativo na topbar (antes um só) agora lista
    todos os que estão rodando, cada um com seu próprio relógio e
    botão de pausar.
  - O aviso "passou do tempo previsto" (reuniões) também passou a
    poder mostrar mais de um card ao mesmo tempo, um por tarefa
    estourada, caso o Leandro tenha mais de uma reunião/tarefa
    cronometrada passando do previsto simultaneamente.
- **Limitação que continua valendo**: o relatório de horas e os
  totais por categoria já somavam por item independente do timer estar
  ativo ou não (cada tarefa/bloco guarda seu próprio `trackedSeconds`),
  então nenhuma mudança foi necessária ali — múltiplos cronômetros
  simultâneos só significam múltiplas linhas acumulando tempo ao mesmo
  tempo, sem risco de um "roubar" o tempo do outro.

## Ícone do WhatsApp preenchido quando ativo + estratégias pra beber água (28/08)

- Pedido do Leandro: **"os icons do zap quando ativado deixa eles
  preenchidos, pintado de verde assim como é o sininho para ficar mais
  visível"**. `WhatsAppIcon` ganhou uma versão preenchida (mesmo
  padrão hand-drawn do `BellIcon.filled`, já que o pack só tem
  contorno) — usada no toggle de WhatsApp por refeição da Dieta.
- Segundo pedido, sobre o campo Água do painel do dia: **"vamos
  colocar um ícone de atenção e nas configurações um bloco: ideias
  para manter o consumo de água... por exemplo garrafa de 1L com
  borrachinha, cada litro reposiciono a borrachinha — seria legal
  poder revisitar as estratégias pra não se perder ou quando perder a
  rota"**.
  - Novo campo `Settings.waterStrategies` (texto livre), com um bloco
    dedicado dentro de Configurações → Painel do dia → Água ("Ideias
    para manter o consumo de água"), só visível quando o widget de
    Água está ligado.
  - No painel do dia, o rótulo "💧 Água" ganhou um ícone de atenção
    (`WarningIcon`, `Warning/Circle_Warning.svg` do pack) que abre o
    mesmo popover compacto do `CommentButton` — dá pra ler e editar as
    estratégias sem precisar ir em Configurações. `CommentButton`
    ganhou um prop `icon` opcional pra permitir essa reutilização com
    um ícone diferente do balão de comentário padrão.

## Limpeza visual: caixas de input sem contorno na Dieta, dias da semana menores (28/08)

- Pedido do Leandro, com prints comparando: **"retira os contornos das
  caixas, deixar mais limpo... anexo tbm mandei exemplo das caixa sem
  contornos que já fizemos ou com o contorno com bastante
  transparência"** e **"as marcações dos dias deixa eles menores uns
  20% — pode ficar pequeno não tem problema"**.
- Campos de texto/hora dentro dos cards de refeição da Dieta (nome,
  horário, "+ nome da refeição") perderam a caixa própria — mesmo
  padrão já usado em `.book-title-input`/`.reminder-title-input`/
  `.quickadd-input` (sem borda, sem fundo, o texto flutua direto no
  card).
- Textareas (plano da dieta, mensagem da refeição) e o campo de
  telefone do WhatsApp mantiveram uma borda, mas trocada pra
  `var(--border)` bem mais clara em vez de `var(--border-strong)`, e
  fundo transparente em vez de cinza — a opção "contorno com bastante
  transparência" que o Leandro ofereceu como alternativa pros campos
  que precisam ficar identificáveis como caixa de texto.
- Os chips de dia da semana no topo (SEG 24, TER 25...) ficaram ~20%
  menores (largura mínima 42px→34px, texto 10px→8px e 14px→11px,
  padding e raio proporcionalmente reduzidos) e a borda também ficou
  bem mais transparente.

## Dieta: canais de lembrete mais simples e balão de observação flutuante (28/08)

- Duas correções pedidas pelo Leandro depois de ver a tela funcionando:
  - **Balão de observação por refeição**: o ícone de comentário ficava
    solto ao lado do chip, ocupando espaço na linha. Pedido: *"quero
    esse mesmo sisteminha de balão nas refeições — ele fica no
    balãozinho branco anexo à tag, quando adicionar obs ele fica
    marcado a bolinha ou preenchido"* (mesmo visual já usado no chip
    de humor). Ajustado só no CSS: o `CommentButton` agora fica
    ancorado no canto do chip (círculo branco, borda e sombra), sem
    ocupar espaço extra na linha.
  - **Fluxo de WhatsApp confuso**: o texto *"Depois, marque o ícone de
    WhatsApp em cada refeição..."* descrevia um comportamento que não
    ficava claro na tela, e o botão por refeição usava um ícone de
    "enviar" genérico. Feedback: **"teria que ser mais simples,
    escolher: Onde quer ser lembrado: notificação dentro do app /
    notificação via WhatsApp — aí pode marcar onde quer. Se marcar no
    WhatsApp aí pede o telefone, sempre nas caixas de digitar tem que
    ter um confirmar pra confirmar que ficou registrado. Depois abaixo,
    quando cadastra as refeições, aí sim já fica sinalizado um ícone
    de lembrete no app e no WhatsApp, tipo ativa/desativa: sininho pro
    app, símbolo zap pro WhatsApp — e um pros dias, marcar os dias ou
    todos os dias."**
- Reescrito o topo da tela de Dieta: em vez de um yes/no de WhatsApp,
  agora é **"Onde quer ser lembrado?"** com duas caixinhas
  independentes — 🔔 notificação dentro do app (`Settings.dietAppOptIn`,
  novo campo) e novo ícone de WhatsApp (`Settings.dietWhatsappOptIn`,
  já existia). Marcando WhatsApp, aparece o campo de telefone — agora
  com botão **Confirmar** explícito (e Enter confirma também) em vez
  de só salvar no blur, mostrando "✓ Número salvo" depois de confirmado.
- Cada refeição cadastrada agora mostra dois ícones de ativa/desativa
  lado a lado — sino (lembrete no app, `DietMeal.active`) e o mesmo
  ícone de WhatsApp do topo (`DietMeal.notifyWhatsapp`) — em vez do
  toggle genérico + botão condicional de antes. Cada um fica
  desabilitado (acinzentado, com dica) se o canal correspondente
  estiver desligado lá em cima.
- Seletor de dias da semana da refeição ganhou um botão **"Todos"**
  explícito ao lado dos D S T Q Q S S, em vez de depender de deixar
  tudo vazio (removida a legenda "(vazio = todo dia)", que o Leandro
  não gostou).
- O aviso "🎯 Foco na dieta" (TimerNudges) agora respeita o novo
  `Settings.dietAppOptIn`: se a pessoa desligar notificação dentro do
  app, nenhum aviso de refeição aparece, independente do que estiver
  marcado em cada refeição.
- Ícone de WhatsApp novo (`WhatsAppIcon`, `icons.tsx`) é derivado do
  pack (mesmo path do `Chat_Circle.svg`, convertido pro padrão do
  projeto) — não existe um ícone de WhatsApp de verdade no pack, então
  reaproveitado o de "balão de conversa" mais próximo, sem desenhar
  do zero.

## Dieta: observação por refeição no check diário (28/08)

- Pedido do Leandro: um "balãozinho" de observação em cima de cada
  refeição (café da manhã, almoço, lanche, jantar...) no check diário
  — **"peguei nisso, comi mais disso...", "acho que valoriza tbm na
  hora de pedir a IA para fazer um resumo, ver onde está errando mais
  ou saindo do combinado"** — pedindo pra manter compacto, "igual está
  o balão da porcentagem".
- Reaproveitado o `CommentButton` que já existe pro campo de % (mesmo
  ícone/popover compacto, sem inventar componente novo): cada chip de
  refeição no painel do dia ganhou um `CommentButton` colado ao lado.
  Só ocupa espaço quando aberto; quando tem observação salva, o ícone
  fica marcado com um pontinho — mesmo padrão visual já usado no % e
  no humor.
- Dado novo: `DailyLog.dietMealNotes: Record<mealId, string>` — texto
  livre por refeição, por dia (nova coluna jsonb `diet_meal_notes` em
  `daily_logs`, migração `add_diet_meal_notes_to_daily_logs`). Leve:
  só grava quando o Leandro escreve algo, sem estrutura extra.
- Serve de matéria-prima pra quando a IA (FARO fase 2) puder resumir
  padrões e desvios da dieta — ainda não implementado, só o dado fica
  guardado desde já.

## Dieta: dias da semana nos lembretes de refeição (28/08)

- Pedido do Leandro: **"colocar tbm nos lembretes da dieta os dias
  para marcar DSTQQSS — as vezes a pessoa nao quer fazer no domingo
  ou nao ser lembrada no domingo entao é interessante termos essa
  opção tbm né?"** — mesma ideia já usada em Lembretes e Medicamentos.
- `DietMeal` ganhou `weekDays: number[] | null` (0=dom..6=sáb; `null`/
  vazio = todo dia). Nova coluna `week_days` em `diet_meals` (migração
  `add_week_days_to_diet_meals`).
- Cada card de refeição em Dieta agora mostra o mesmo seletor
  `weekday-picker` (D S T Q Q S S) usado em Lembretes/Medicamentos,
  logo abaixo do campo de mensagem.
- O aviso flutuante "🎯 Foco na dieta" (`TimerNudges.tsx`) só aparece
  nos dias marcados pra aquela refeição — não incomoda mais em dias
  excluídos (ex.: domingo).
- O checklist "não pulei" do painel do dia (`DailyLogPanel.tsx`) só
  lista as refeições válidas pro dia selecionado, pelo mesmo motivo —
  não faz sentido mostrar (e poder marcar) uma refeição que nem devia
  acontecer naquele dia da semana.

## Ajustes finos na Dieta + ícones em Configurações (28/08)

- **Checklist de refeições mais compacto**: o Leandro pediu pra tirar
  os chips de "não pulei" de baixo, num bloco próprio, e colocar do
  lado do campo de % de fidelidade. Agora é uma linha só, flex-wrap:
  `[% input] [%] [💬] [0/4] [chip][chip][chip][chip]`.
- **Removido o botão "Marquei" do aviso "Foco na dieta"**: marcar a
  refeição como feita passa a acontecer só pelos chips do painel do
  dia — o aviso flutuante (`TimerNudges.tsx`) não precisa mais
  duplicar essa ação.
- **WhatsApp vira opt-in de verdade, não botão solto**: antes, o aviso
  de cada refeição sempre tinha um ícone de "enviar por WhatsApp"
  manual. O Leandro corrigiu o fluxo: agora tem uma pergunta explícita
  na tela de Dieta — "Quer ser avisado no seu WhatsApp sobre sua
  dieta?" (`Settings.dietWhatsappOptIn`). Se sim, aparece o campo pra
  confirmar o número (reaproveita `Settings.notifyPhone`, já existia
  pro Perfil) — e só depois disso cada refeição ganha um ícone de
  WhatsApp clicável pra marcar quais devem avisar por lá
  (`DietMeal.notifyWhatsapp`). O aviso "Foco na dieta" só mostra o
  botão de enviar quando as duas condições batem (opt-in geral E
  aquela refeição marcada).
  - **Limitação que continua valendo**: isso ainda é envio manual via
    link `wa.me` (o Leandro precisa clicar) — não é notificação
    automática de verdade. Não dá pra abrir o WhatsApp sozinho quando
    o app não está aberto/em foco (bloqueio de pop-up do navegador
    pra chamadas fora de um clique direto, e não existe integração
    com WhatsApp Business API ainda — esse é o item grande já
    registrado no backlog). O que mudou aqui foi só a
    **configuração de quais refeições participam**, não o mecanismo
    de envio em si.
- **Ícones nas caixas de Configurações**: as caixas colapsáveis
  (Tags da tarefa, Status de tarefa, Painel de horas, Painel do dia)
  ganharam um ícone pequeno ao lado do título, no mesmo espírito visual
  do menu lateral. Novo `TagIcon` (do pack, `Interface/Tag.svg`);
  Status de tarefa reaproveita `FlagIcon`; Painel de horas reaproveita
  `ClockIcon`; Painel do dia reaproveita `HomeIcon`.

## Dieta ganha item próprio no menu lateral (28/08)

- O Leandro pediu pra Dieta ter entrada própria no menu lateral, igual
  Livros/Lembretes/Medicamentos/Checklists, em vez de ficar só dentro
  de Configurações. Movido: a caixa "Dieta" (plano + refeições) saiu
  de `SettingsView.tsx` e virou tela própria `DietView.tsx`, com o
  mesmo padrão de cabeçalho/voltar das outras (RemindersView etc.).
  Configurações mantém só o toggle liga/desliga do widget de
  fidelidade no painel do dia (isso é cross-cutting, faz sentido ficar
  lá — a configuração do conteúdo da dieta em si, não).
- **Novo ícone `MealIcon`** (garfo + faca) — exceção desenhada à mão,
  documentada aqui porque o pack de ícones (`design/icon-pack/`) não
  tem nada de comida/refeição/nutrição em nenhuma categoria (conferido
  em todas as pastas).

## Dieta: refeições configuráveis, aviso "Foco na dieta" e check diário (28/08)

- **Motivação (conversa longa com o Leandro)**: ele descreveu a
  realidade — 3 refeições fixas na dieta (café da manhã, café da
  tarde/whey, jantar), cada uma com horário e conteúdo próprios que
  precisam de lembrete personalizado, e o desejo de acompanhar isso de
  forma simples no painel.
- **Cadastro do plano** (Configurações → caixa "Dieta"): campo de texto
  livre (`Settings.dietPlan`) pra colar o plano/receitas/divisão de
  macros — sem estrutura, só guardar o texto.
- **Refeições configuráveis** (nova tabela `diet_meals`, mesmo modelo
  de Medicamentos): cada refeição tem nome, horário e uma **mensagem
  livre** — o campo tem a dica exata que o Leandro pediu: "Escreva
  aqui como quer receber o texto do seu lembrete — pode ser só o
  título, as calorias, a divisão da dieta ou a refeição descrita para
  esse horário." Não existe um toggle separado "cardápio vs. só
  horário" — o próprio conteúdo do campo decide isso (vazio = só o
  nome da refeição no aviso; preenchido = aparece o texto inteiro).
  Cada refeição tem ativo/inativo, igual Medicamentos.
- **Aviso "🎯 Foco na dieta"** (`TimerNudges.tsx`, mesmo mecanismo dos
  avisos de reunião/lembrete): quando o horário da refeição chega,
  aparece um card no canto com o nome + mensagem da refeição, e 3
  ações — **Marquei** (marca "não pulei" no dia), **enviar por
  WhatsApp** (ícone de enviar, abre `wa.me` com o texto da refeição —
  sempre manual, nunca automático, mesmo padrão já usado em
  Checklists) e dispensar. Fica visível até ser marcado ou dispensado
  (sem expirar sozinho).
- **Check "não pulei" ≠ fidelidade** — correção importante que o
  Leandro fez durante a conversa: marcar a refeição só confirma que
  ela aconteceu (não foi pulada), **não** que foi seguida certinho
  (podia ter comido mais, menos ou algo fora do combinado). Por isso:
  - Novo campo `DailyLog.dietMealsChecked: string[]` (ids das
    refeições marcadas no dia) alimenta só um contador visual
    "X/Y refeições feitas" no painel do dia, ao lado do campo de
    fidelidade.
  - O campo de **fidelidade (%)** continua exatamente como antes —
    manual, avaliado pelo Leandro, **sem** o app tentar calculá-lo a
    partir dos checks. As duas coisas ficam lado a lado mas
    independentes de propósito.
- **Limitação, não escondida**: mesma ressalva de Lembretes/Medicamentos
  — os avisos são só dentro do app (aba aberta), não notificação
  push real. "Enviar por WhatsApp" é sempre uma ação manual do
  Leandro (escolhe o destino na hora via `wa.me`), nunca automático —
  decisão explícita dele pra não virar "200 mil coisas" por dia.
  Categorias de lembrete liga/desliga (Medicamentos, Dieta, Lembretes
  gerais) ficaram combinadas na conversa mas **não implementadas
  ainda** — próximo passo se sentir necessidade na prática.

## Lembretes: repetição por dia da semana + tag "Recorrente" (28/08)

- **Pedido do Leandro**: campo de repetição por dia da semana nos
  Lembretes (bolinhas/quadradinhos D S T Q Q S S), motivado por um caso
  real — "trocar filtro piscina" acontece 2x por semana, não faz
  sentido só uma data fixa ou "toda semana" genérico.
- Novo campo `Reminder.weekDays: number[] | null` (0=dom..6=sáb),
  **mesmo padrão já usado em Medicamentos** — reaproveitado o
  componente visual `.weekday-picker`/`.weekday-btn` que já existia.
  Fica no mesmo popover de data/hora do lembrete, funciona
  independente de ter uma data marcada (dá pra só marcar os dias, sem
  data fixa nenhuma).
- **Tag "Recorrente"**: qualquer lembrete com `repeat !== "none"` OU
  `weekDays` marcado agora mostra um chip "Recorrente" na lista (era só
  um ícone pequeno antes, específico de `repeat`) — pedido explícito do
  Leandro pra conseguir olhar uma lista cheia e diferenciar o que é
  recorrente do que é pontual.
- **Limitação importante, não escondida**: assim como em Medicamentos,
  isso é **informativo por enquanto** — marcar `weekDays` não faz o
  lembrete recriar sozinho toda semana nem reseta automaticamente
  quando chega o próximo dia marcado. O campo `done` continua sendo um
  boolean único (concluído ou não), sem histórico por dia. Pra virar
  de verdade um lembrete que "volta sozinho" a cada Ter/Qui (resetando
  o check a cada ocorrência), precisaria de um sistema de
  acompanhamento por data como o dos Hábitos/Blocos fixos (`DayLog` por
  dia) — não implementado ainda, é a evolução natural se o Leandro
  sentir falta na prática.

## Cronômetro mostrava só a sessão atual, parecia "esquecer" tempo anterior (28/08)

- **Relato do Leandro**: deu play numa tarefa ("Tratar piscina"), pausou,
  depois deu play de novo — esperava ver o tempo somando (sessão 1 +
  sessão 2), mas o relógio parecia mostrar só a última sessão do zero.
- **Investigação**: conferi os dados no banco — `stopActiveTimer` (em
  `use-board.ts`) já soma corretamente (`t.trackedSeconds + elapsed`) e
  persiste o total sempre que o play é pausado, então o dado acumulado
  em si não estava se perdendo. O problema era só de **exibição**: o
  relógio ao vivo no botão de play (`TimerButton.tsx`,
  `useElapsedSeconds`) mostrava apenas o tempo decorrido *desde o
  início da sessão atual* — ao apertar play de novo, ele reiniciava
  visualmente do zero, dando a impressão de que o tempo anterior tinha
  sumido, mesmo que fosse continuar somando certinho ao pausar.
- **Correção**: `TimerButton` e `ActiveTimerBadge` agora somam o tempo
  já acumulado do item (`trackedSeconds` da tarefa, ou do log do dia
  pra hábito/bloco) com o tempo da sessão atual — o relógio ao vivo
  sempre mostra o **total acumulado**, não reinicia do zero a cada play.

## Blocos fixos: clicar num dia já marcado não apaga mais (28/08)

- **Bug relatado pelo Leandro**: marcou o horário de almoço pelo play,
  depois clicou de novo no bloquinho verde só pra ver quanto tempo
  tinha gastado — e isso **desmarcava** o dia na hora (`RecurringRow`
  em `RecurringSection.tsx`: clicar numa célula já `done`, sem opções
  de nota, chamava `board.clearRecurringDay` direto no clique).
- **Correção**: clicar numa célula já marcada agora abre um popover de
  **visualização** (`DayViewPopover`) mostrando o tempo registrado (e a
  nota, se tiver) — não mexe em nada sozinho. De lá, dois botões
  explícitos: lápis **Editar** (abre o popover de edição já existente,
  pré-preenchido, pra ajustar o valor) ou lixeira **Desmarcar** (aí sim
  limpa o dia, mas é uma ação deliberada, não um efeito colateral do
  clique). Blocos com opções de nota (`entriesMode`, ex.: múltiplas
  entradas por dia) não foram afetados — já abriam um popover de lista
  em vez de limpar direto.

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

## Segunda tag, duração --:--, e Lixeira de verdade (28/08)

- **Segunda tag em vez de categoria "Reunião" sozinha**: o Leandro
  percebeu que trocar a categoria pra "Reunião" fazia o tempo sumir do
  relatório de Trabalho (categoria é campo único, mutuamente exclusivo,
  usado pro "Tempo por categoria" do Dashboard). Pensamos junto e a
  solução foi: `Task.category2` — uma segunda tag **opcional**, que
  não mexe no relatório (o gráfico de pizza continua somando só por
  `category`, então não tem contagem dupla). O botão Reunião agora cria
  a tarefa com `category: "trabalho"` + `category2: "reuniao"` — os
  dois chips aparecem juntos na linha. Também dá pra adicionar a
  segunda tag à mão em qualquer tarefa (editar → "+ segunda tag").
  Categoria continua sendo a única coisa que entra no relatório —
  de propósito, pra não "roubar" o Trabalho quando também é reunião.
  - Novo campo em `TaskSeries.category2` também, pra tarefas recorrentes
    manterem a segunda tag nas próximas ocorrências.
- **Duração no estilo "--:--"**: o popover do botão Reunião trocou o
  campo numérico solto por um `<input type="time">` nativo (mostra
  "--:--" vazio, dá pra digitar ou usar as setinhas/scroll de cada
  parte) — interpretado como duração HH:MM em vez de horário do
  relógio. Os chips (15/30/40min, 1h/1h30/2h) continuam ao lado pra
  atalho rápido; escolher um chip também preenche o input.
- **Lixeira de verdade**: excluir uma tarefa agora é "soft delete" —
  marca `deleted_at` no banco em vez de apagar a linha, e ela sai das
  telas normais mas não desaparece de vez. Pra recuperar: no campo de
  busca da topbar, seletor de escopo → **Lixeira** (mostra tudo que
  foi excluído, com o campo de busca filtrando por título se digitar
  algo). Cada item tem **Restaurar** (volta pra lista normal) ou o
  ícone de lixeira pra **excluir de vez** (aí sim é definitivo, com
  confirmação via `askConfirm`).
  - `board.state.trashedTasks` é carregado à parte na inicialização
    (`deleted_at is null` pras tarefas normais, `not null` pra
    lixeira) — todo o resto do app (dia, semana, dashboard, busca
    normal) nunca vê tarefa excluída, sem precisar filtrar em cada
    tela.
  - **Só em Tarefas por enquanto** — mesma ressalva de antes, dá pra
    estender Lembretes/Checklists/etc. se precisar.
  - **Bug corrigido no mesmo dia**: o popover de busca só abria se
    tivesse texto digitado (`onFocus` só chamava `updatePos()` quando
    `query.trim()`) — como o seletor de escopo (onde fica "Lixeira")
    mora dentro desse popover, não tinha como abrir "Lixeira" sem
    digitar algo antes, ficava inacessível. Corrigido: o popover agora
    abre em qualquer foco no campo de busca, com o seletor de escopo
    sempre visível; sem query e fora da Lixeira mostra só "Digite pra
    buscar...".
  - **Item próprio no menu lateral**: o Leandro pediu um jeito mais
    direto de chegar na Lixeira do que só pela busca — novo item
    "Lixeira" no rodapé do menu lateral (junto de Configurações),
    abrindo uma tela dedicada (`TrashView.tsx`) que já lista tudo que
    foi excluído (sem precisar digitar nada), com Restaurar por item e
    um botão **"Esvaziar lixeira"** no topo que apaga tudo de vez (com
    confirmação, mostrando quantos itens). O escopo "Lixeira" na busca
    continua existindo também, útil pra achar um item específico pelo
    nome rapidinho.

## Ajustes no botão Reunião + confirmação de exclusão (28/08)

- **Feedback do Leandro testando o botão Reunião**: gostou, mas pediu
  3 ajustes.
  1. **Tag "Reunião"**: nova categoria `reuniao` (junto de
     Trabalho/Estudo/Dev/Saúde/Pessoal/Família), com cor própria e chip
     igual às outras. `startMeeting` já cria a tarefa com essa
     categoria — fica visível na tabela mesmo sem escrever "reunião" na
     descrição. Como qualquer categoria, também pode ser escolhida à
     mão em qualquer tarefa (editar tarefa → categoria), e a cor é
     customizável em Configurações como as outras.
  2. **Duração maior que 1h**: chips do popover de Reunião ganharam
     1h30 e 2h, e um campo numérico ao lado ("outro (min)") pra digitar
     qualquer valor — antes só ia até 1h fixo.
  3. **Confirmação antes de excluir tarefa**: o Leandro apagou uma
     tarefa sem querer clicando na lixeira sem querer. Antes, deletar
     uma tarefa avulsa (sem repetição) era instantâneo, sem
     confirmação — só tarefas de série passavam pelo modal de escopo.
     Agora qualquer exclusão de tarefa avulsa abre um modal "Excluir a
     tarefa '...'? Essa ação não pode ser desfeita." com
     Cancelar/Excluir, reaproveitando a mesma estrutura de modal do
     `ScopeModal` (`ConfirmModal.tsx`, `askConfirm` no board-context).
     **Só foi aplicado em Tarefas por enquanto** — os outros botões de
     lixeira do app (Lembretes, Checklists, Medicamentos, Hábitos/
     Blocos) continuam sem confirmação; dá pra estender o mesmo
     `askConfirm` pra eles rapidinho se o Leandro quiser.

## Aviso antecipado em Lembretes (28/08)

- **Pedido do Leandro**: campo "adicionar aviso" no lembrete, pra poder
  marcar minutos ou dias antes da data/hora do lembrete.
- Novo campo `Reminder.alertMinutesBefore` (`alert_minutes_before` no
  banco, minutos) — opcional, só aparece quando o lembrete tem data.
  Selecionado por presets no popover de data (mesmo popover onde já dá
  pra escolher data/hora/repetição): Sem aviso, 10min, 30min, 1h, 1 dia,
  2 dias ou 1 semana antes.
- **Entrega do aviso**: reaproveita o mesmo mecanismo de card no canto
  inferior direito do `TimerNudges.tsx` (mesmo componente dos avisos de
  reunião) — quando o horário calculado (data+hora do lembrete menos o
  aviso escolhido) chega, aparece um card com o título do lembrete e
  botão **Concluir** (marca o lembrete como feito) ou dispensar.
  - Lógica de janela em `src/lib/board/reminder-alerts.ts`
    (`isReminderAlerting`): considera o lembrete "avisando" desde
    `data+hora - aviso` até `data+hora` (lembrete sem hora usa 23:59 do
    dia como alvo, então o aviso cobre o dia inteiro até o fim dele).
  - Mesma limitação já documentada acima pro aviso de reunião: é um
    aviso *dentro do app*, não notificação push real — precisa da aba
    aberta. O ícone de sino/badge na topbar continua baseado só na data
    (hoje/atrasado), não foi alterado por esse aviso antecipado.

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
          push de lembretes" abaixo). **Atualizado (02/09) — integração
          real feita**: ver "WhatsApp Cloud API conectada" logo abaixo,
          já dá pra mandar mensagem de teste de verdade por esse
          número. Envio automático de lembretes por WhatsApp ainda não
          está ligado (só o teste manual, por enquanto).
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
      - **WhatsApp Cloud API conectada (02/09)**: o Leandro configurou a
        conta de negócio no Meta for Developers (app "FARO", WhatsApp
        Business Account "Leandro Garozi") e a integração real ficou de
        pé — `src/lib/whatsapp/send.ts` (helper server-side que chama a
        Graph API) + `POST /api/whatsapp/test` (lê `settings.notify_phone`
        do usuário logado e manda mensagem) + botão **"Testar WhatsApp"**
        em `ProfileFields.tsx`, do lado do campo de telefone. Credenciais
        (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`) ficam só
        como variável de ambiente na Vercel, nunca no código/repo.
        Pegadinhas do processo de configuração (documentando pra não
        repetir o mesmo caminho errado de novo):
        - O número de teste da Meta (tela "Try it out") e o número real
          do negócio são coisas **completamente separadas** — cada um
          com seu próprio Phone Number ID; usar o ID errado dá erro
          "Object does not exist" (permissão).
        - Depois de vincular a conta real, o número precisa passar por
          um passo extra de **"Register"** (Step 2. Production setup →
          Register your WhatsApp phone number) — sem isso a API recusa
          com erro 133010 "Account not registered", mesmo com token e
          Phone Number ID corretos.
        - O template padrão `hello_world` (o que a Meta dá de graça na
          conta de teste) **não existe** na conta de negócio real —
          precisou criar um template próprio (`faro_teste`, categoria
          **Serviços**, idioma `pt_BR`) no WhatsApp Manager
          (business.facebook.com/wa/manage/message-templates) e esperar
          aprovação. Texto genérico de teste é classificado como
          Marketing e arrisca ser rejeitado; teve que soar como
          mensagem de conta/status pra passar em Serviços.
        - **Ainda não feito**: nenhum lembrete/hábito/refeição dispara
          WhatsApp de verdade ainda — só existe o botão de teste manual
          no Perfil. Ligar isso de fato em Lembretes/Medicamentos/Dieta
          é trabalho futuro (ver 🔴 "Notificações push de lembretes"),
          e provavelmente vai exigir templates aprovados por tipo de
          aviso (a API não manda texto livre fora da janela de 24h).
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
- [ ] **(03/09) Correção**: a leva de pedidos que o Leandro colou nessa
      data já tinha sido **quase toda resolvida** na rodada "Leva
      grande de ajustes + próximos passos definidos (01/09)" (ver acima
      no arquivo) — eu não tinha cruzado direito antes de anotar de
      novo, e listei como pendente coisa que já estava feita. Conferido
      no código em 03/09: Observação sempre expandida, auto-save de
      30s, bug do horário com 2+ dias da semana em Lembretes, frase +
      emojis da atividade física, tag "Sem data" (cor/ícone/chip de
      projeto/aviso de exclusão), botão apagar da etapa de projeto —
      **todos já implementados** (01/09), assim como o mapeamento de
      sub-opções por item do Dia a Dia (ex.: Piscina → algicida/trocar
      filtro/aspirar + 2 tags — já dá pra cadastrar isso em "Opções de
      nota", no Editar de qualquer hábito/bloco, sem precisar de código
      novo, só configurar). Dashboard de dias com atividade física
      (Crossfit/Corrida) também já existe, no bloco "Hábitos — tempo e
      dias ativos"; falta só confirmar se cobre Lazer/Gratidão/Leitura
      do mesmo jeito ou se essas precisam de um bloco à parte.
      **O que realmente ainda falta**, sem duplicar o que já foi feito:
      - **Recorrência de Lembretes a cada N semanas/meses/anos**: a
        decisão já foi tomada em 01/09 (campo numérico "a cada [N]"
        dentro dos selects Semanal/Mensal/Anual que já existem, sem
        trocar a estrutura da tela) — só falta implementar.

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
      verdade na hora marcada (som/notificação do navegador). A
      **base de Web Push já existe** (30/08 — service worker,
      permissão, botão de teste em Configurações), mas falta o
      **gatilho agendado no servidor** que dispara sozinho na hora
      certa (hoje só manda se alguém clicar "Testar notificação").
      Distinto da sync com Google Agenda. Ideal, se der: lembrete
      chegando também por **WhatsApp** — a base da integração real já
      foi feita (02/09, ver "WhatsApp Cloud API conectada" acima:
      Cloud API + token + template aprovado + botão de teste manual
      no Perfil), mas ainda falta o mesmo tipo de gatilho agendado no
      servidor pra disparar sozinho, e provavelmente templates
      aprovados por tipo de aviso (a API não manda texto livre fora da
      janela de 24h de conversa). **Sonho do Leandro**: ligação de
      verdade via WhatsApp (telefone toca na hora do lembrete) —
      confirmado que é possível via WhatsApp Business Calling API, mas
      exige conta Business verificada, aprovação da Meta e tem custo
      por minuto; não começar sem ele confirmar.
- [ ] **Layout mobile desconfigurado** — confirmado pelo Leandro
      (28/08): "o app no mobile ainda fica todo desconfigurado".
      Explicitamente adiado por ele — "isso corrigimos mais pra frente
      depois de implementar as coisas mais importantes", só registrar
      por ora. Precisa de uma revisão de responsividade completa (não
      um ajuste pontual) quando chegar a vez: layout geral, popovers,
      tabelas/grids, menu lateral etc. em telas pequenas.
- [ ] **Aba Ferramentas (02/09)** — menu novo, o Leandro quer subir
      conteúdo pessoal que já existe fora do app e transformar em
      ferramentas de uso contínuo, com a IA (FARO) puxando frases,
      reconhecimento e lembretes de conquistas a partir desse material
      quando ele estiver desanimado/triste. Itens que ele quer, na
      ordem "começar pelas mais fáceis de aplicar":
      - **Caderno de ganhos**: ele tem um caderno físico/digital de
        ganhos e conquistas — subir tudo, virar registro consultável.
      - **Caderno de gratidão**: mesma ideia, subir o que ele já tem.
      - **"Eu sou"**: lista de afirmações pessoais.
      - **Provérbios sublinhados**: anotações/estudos do livro de
        Provérbios.
      - **Roda da Vida** e **Mapa da Alma**: ferramentas maiores, ficam
        pra depois das de cima.
      - **Seção de perguntas por momento** (nome ainda em aberto —
        perguntar ao Leandro como quer chamar): registra data + "qual
        o momento atual" (texto livre) + um conjunto de perguntas
        cadastradas pra aquele momento, ele responde, fica arquivado.
        Serve de material pra IA comparar ao longo do tempo (crescendo
        ou estagnado) e é o mesmo tipo de fonte que ele quer usar pra
        responder perguntas de livros que está lendo.
      - **Perguntas em aberto antes de desenhar a modelagem de dados**:
        como estruturar o cadastro de perguntas por "momento" (um
        template fixo ou ele cria conjuntos de perguntas diferentes por
        ocasião?); cada ferramenta (caderno de ganhos, gratidão etc.)
        vira uma lista simples de entradas com data + texto, ou precisa
        de campos próprios por tipo?
- [ ] **Link entre tarefas relacionadas (02/09)** — ideia trazida pelo
      Leandro com o exemplo de um app financeiro que ele quer construir
      "do jeito que estamos fazendo o FARO": várias tasks separadas que
      são, na prática, etapas do mesmo objetivo — tipo um PDA por
      tarefa, sem virar um Projeto formal. Ainda não desenhado; precisa
      de conversa sobre quando isso é diferente de simplesmente criar um
      Projeto pra aquele objetivo.
- [ ] **Plano de estudo (02/09)** — dor real do Leandro: hoje ele
      empurra os estudos pra depois no meio das outras tarefas e isso
      vira ansiedade acumulada (ex.: 2 matérias atrasadas da pós, uma
      mentoria de coach de perfil comportamental pra terminar). Ideia
      inicial dele: item novo no menu lateral onde cadastra um estudo
      até terminar, e o FARO ajuda a distribuir ~40–60min/dia dele
      durante a semana como tarefa com tag "Pessoal + Estudo" e o tempo
      daquele dia — ele pediu explicitamente ajuda pra pensar no
      desenho antes de implementar, não é só "constrói".
- [ ] **Modo Foco / Pomodoro + tag "Desafiadora" (02/09)** — conectado
      ao "Plano da Alma" (visão de futuro) que o Leandro também precisa
      organizar. Duas ideias que ele quer discutir juntos antes de
      implementar:
      - **Modo Foco**: um temporizador tipo Pomodoro; se der pra
        bloquear acesso à internet/distrações de verdade, ótimo — senão
        pelo menos um aviso ao entrar ("Você vai entrar em Modo Foco —
        afaste distrações, silencie o celular..."). Bloqueio de rede de
        verdade provavelmente não é possível a partir de um web app;
        avisar o Leandro disso na conversa de design.
      - **Tag "Desafiadora"**: diferente da bandeira vermelha — marca
        uma tarefa que ele tende a evitar/fugir (procrastinação), não
        só uma tarefa urgente. Se tentar remarcar uma task assim, pedir
        uma **justificativa obrigatória** — vira dado pra IA mapear
        padrão de fuga/postergação ao longo do tempo.
- [ ] **FARO faz varredura de inconsistências (02/09)** — rotina de IA
      que revisa o sistema periodicamente e aponta problemas tipo: um
      projeto com tags muito diferentes entre as etapas (ex.: uma
      "trabalho", outra "dev pessoal" — sinal de cadastro errado);
      tasks muito atrasadas; lembretes abandonados; por que ele não
      está lendo (cruzando com Livros/Lazer); sugestão de ordem pra fila
      de leitura dos livros. Configurável em "Configurar FARO" — o
      Leandro escolhe os dias em que essa varredura roda.
- [ ] **Backup dos dados (02/09)** — o Leandro está transformando o
      FARO num banco de dados pessoal completo (livros, ferramentas,
      registros importantes) e não quer nunca perder isso. Pensar numa
      estratégia de backup — hoje os dados já vivem no Supabase (que
      tem backup próprio de infraestrutura), mas vale avaliar se ele
      quer também uma exportação própria (ex.: botão de exportar tudo
      em JSON/CSV) como camada extra de segurança.
- [ ] **Projetos como PDA completo (02/09)** — o Leandro quer que cada
      etapa de projeto tenha descrição e ação cadastradas de verdade
      (não só um título), pra depois poder pedir ao FARO pra ajudar a
      distribuir aquele projeto ao longo de um prazo (quantas horas por
      dia) — ou fazer isso manualmente. Ele disse que vai mandar um
      print de exemplo pra adaptar o que já existe com o que falta;
      aguardando esse material antes de desenhar. Conecta com a "IA de
      distribuição de tarefas" já listada acima.
- [ ] Relatório cruzando dados (tarefas × hábitos × humor × sono etc.)
- [ ] Observação do humor no dashboard alimentada por IA (rotina agendada
      + chamada de IA — não é só front-end)
- [ ] Dashboard configurável (o que aparece na tela principal ou não)

**(03/09) Conferido com o Leandro — já feito, não entra em pendência:**
carinhas de humor extras (estressado, ansioso, nervoso, desmotivado,
confiante, em paz já existem em `src/lib/mood.ts` como `MOOD_EMOTIONS`,
campo próprio separado do humor 1-5) e o comportamento de arrasto com
o filtro "⚡ Rápidas primeiro" (arrasto desativado pra lista toda
enquanto esse modo está ativo, em `TaskListCard.tsx` — comportamento
correto e já implementado).
