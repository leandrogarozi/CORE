# Layout do FARO: referência viva

Este arquivo guarda o desenho aprovado do FARO, o que já foi aplicado e o que falta, para que qualquer sessão futura continue de onde esta parou. **Atualize a tabela de status sempre que aplicar, aprovar ou recusar algo.** O BRIEFING aponta para cá.

- **Origem (22/10/2026):** o Leandro pediu uma pesquisa do "Skip" da Adapta (plataforma que cria sistemas por prompt, `skip.it`, comprada pela Adapta em março de 2026) e mandou 4 imagens de painéis. As imagens são painéis de exemplo; o Skip não é um app de finanças.
- **Canvas de desenho (privado, só o Leandro abre):** https://claude.ai/artifact/ALhRbpDjZWPHZVMey1pr7q (telas: Tela do dia, Dashboard, Tela escura, Menu, Listas, Funções A e B, Funções C a H, Configurações).
- **Aprovação:** em 22/10 o Leandro aprovou o layout do canvas ("aplicar todo o layout igual você fez") com a condição abaixo.

## Regras que valem para toda mudança de layout

1. **Adaptar o que existe, não trocar.** O que está em uso funciona e não pode ser perdido. Antes de mexer numa tela, conferir contra o componente atual (`TaskRow.tsx`, `RecurringSection.tsx`, `DailyLogPanel.tsx`, `HoursPanel.tsx`, `DayAgendaPanel.tsx`, `Dashboard.tsx`).
2. **Cadastrar e ligar/desligar só em Configurações.** A tela principal só preenche (escolher a carinha, somar água, marcar o hábito). Cada painel tem o seu bloco em Configurações → Painéis da tela principal, com o interruptor "Mostrar na tela / Não usar". Desligado, o painel some da tela do dia e do Dashboard; os dados ficam guardados.
3. **Pouco vermelho.** Vermelho só na frase "N tarefas atrasadas" da saudação e nas bolinhas de aviso (sino, aniversário, contador do Dashboard: vermelho com número branco). O resto usa roxo da marca, cinza ou a cor configurada nas tags. As cores das tags continuam configuráveis em Configurações → Tags da tarefa.
4. **Ícones reais do FARO** (`src/components/board/icons.tsx`), nunca emoji nem ícone inventado.
5. **Tema claro e escuro** sempre. Cores vêm das variáveis de `globals.css` (`--accent`, `--surface`, `--linha`, `--text`…). Raios amarelos de rapidez usam `--book-yellow`.
6. **Cada item novo registra aqui**: o que é, onde mora no código, a data.

## Status por item

Legenda: **Feito** (no ar), **Parcial** (feito em parte, ver nota), **Aguardando** (aprovado no desenho, ainda não aplicado), **Fora** (não aprovado nem aplicado).

| Item | O que é | Situação | Onde está no código / nota |
|---|---|---|---|
| 1 | Números do Dashboard com variação vs período anterior e cartão em destaque | **Feito** (22/10) | `Dashboard.tsx` (`Variacao`, `intervaloAnterior`, `numerosDoIntervalo`); CSS `.dsh-kpi.destaque`. Atrasadas e Tópicos abertos não comparam (são retrato do momento) |
| 2 | Saudação com frase viva (reuniões hoje, atrasadas) | **Feito** (22/10) | `DayGreeting.tsx`; usa `settings.preferredName` |
| 3 | Menu lateral agrupado (Hoje, Aprender, Pessoas, Saúde e casa) | **Feito** (22/10) | `Sidebar.tsx` (`GRUPOS`). Continua sendo gaveta aberta pelo botão de menu; "Painel" mantém o nome |
| 4 | Atalhos Nova tarefa, Lembrete, Reunião, Ideia | **Feito** (22/10) | `QuickActions.tsx`; leva ao campo que já cria (não duplica regra) |
| 5 | Faixa embaixo das tarefas: Seu dia, Horas, Agenda | **Feito** (22/10) | `DaySummary.tsx` (anel), `HoursPanel`, `DayAgendaPanel` dentro de `.day-info-row` em `BoardApp.tsx` |
| 6 | Status de tarefa como etiqueta com nome | **Feito** (22/10) | `StatusPicker.tsx` (`.status-pill`); coluna Status mais larga (`column-widths.ts`, largura antiga estreita é descartada). No celular volta a ser só a bolinha |
| 6b | Etiquetas de status em Clientes, Lembretes, Livros, Cadastros | **Aguardando** | só a tarefa foi feita |
| 7 | Barra "usado de" (teto WhatsApp, metas) | **Parcial** | o Dashboard já tinha a barra do teto do WhatsApp; barras de meta dependem do item D |
| 8 | Busca e filtro "Todos ▾" acima das listas (Clientes etc.) | **Aguardando** | |
| 9 | Menu estreito só com ícones | **Fora** | não aprovado (era opção) |
| 10 | Menu escuro | **Fora** | o modo escuro do app já existe (botão de tema) |
| 11 | Faixa dos dias da semana mantida, em linha com Hoje / Semana / Dashboard | **Feito** | já era assim; mantida |
| 12 | Registro do dia em colunas: Humor, Sono, Água, Dieta | **Feito** (22/10) | `DailyLogPanel.tsx` (`data-dl`) + CSS `.daily-log-panel` em grade |
| 13 | Hábitos e Dia a Dia mantidos como hoje | **Feito** | `RecurringSection.tsx`; na tela principal sem formulário de cadastro (`podeCadastrar={false}`); play, editar e excluir de cada linha continuam |
| 14 | Ícone de Aniversários na barra de cima | **Feito** | já existia (`AniversariosButton`); contador agora vermelho com número branco |
| 15 | Modo escuro | **Feito** | já existia (`ThemeButton`) |
| 17 | Linha discreta de aniversários sob a saudação | **Feito** (22/10) | `DayGreeting.tsx` (hoje e próximos 3 dias, sem os pendentes de confirmação) |
| P1 | Configurações em blocos com trilho de grupos | **Feito** (22/10) | `SettingsView.tsx` (`CollapsibleBox` novo, `GrupoDeConfiguracao`); CSS `.cfg-*`; blocos fecham por padrão e lembram, neste aparelho, quais ficaram abertos |
| P2 | Painéis da tela principal ligam/desligam (Humor, Água, Sono, Dieta, Hábitos, Dia a Dia, Horas, Agenda, Seu dia, Sem data) | **Feito** (22/10) | chaves em `settings.feature_flags`: `mood`, `water`, `sleep`, `diet` (já existiam) e `panel_habitos`, `panel_diadia`, `panel_horas`, `panel_agenda`, `panel_resumo`, `panel_semdata`; Dashboard também respeita Hábitos e Dia a Dia |
| P3 | Cadastro de hábitos e Dia a Dia em Configurações | **Feito** (22/10) | `RecurringManager.tsx` (reaproveita `RecurringEditRow`) |
| P4 | Emoções do Humor cadastráveis | **Feito** (22/10) | `settings.day_options.emotions` (coluna `day_options jsonb`); `src/lib/board/opcoes-do-dia.ts`. **As 6 carinhas continuam fixas** (alimentam média e gráfico do Dashboard). A IA do app e o conector só conhecem as emoções de fábrica |
| P5 | Botões rápidos de água editáveis | **Feito** (22/10) | `settings.day_options.waterSteps` |
| A | Busca por significado | **Aguardando** | não aprovado ainda como item; exige índice semântico |
| B | Resumo da manhã (push + aviso) | **Aguardando** | reaproveita `faro_avisos` e o push |
| C | Linha do tempo de atividade | **Aguardando** | |
| D | Metas com progresso | **Aguardando** | |
| E | Quadro de etapas dos clientes | **Aguardando** | pede estado novo por cliente |
| F | Cartões do Dashboard escolhidos e ordenados | **Aguardando** | |
| G | Modelos de tarefa, projeto e formulário | **Aguardando** | |
| H | Regras "se acontecer isso, faça aquilo" | **Aguardando** | |
| I | Atualização ao vivo entre aparelhos | **Aguardando** | |
| J | Importar clientes e aniversários de planilha | **Aguardando** | |

## Demais telas: layout aplicado (22/10)

Ao conferir cada desenho contra o app, a maior parte já era igual (as telas já tinham cabeçalho, campo de adicionar com microfone, cartões, grupos e as mesmas funções). Por isso a aplicação foi nas diferenças reais, de forma transversal, sem tirar nenhuma função:

- **Cabeçalho de todas as telas** (`.dash-range-label` em `globals.css`): título à esquerda, ao lado da seta de voltar, em tamanho maior. Vale para Livros, Manutenção, Lembretes, Reuniões, Ideias e Estudos, Novas Sinapses, Conhecendo você, Aniversários, Cadastros, Clientes, Plano de Estudo, Medicamentos, Dieta, Checklists, Projetos, Compras, Lixeira, Calendário, Perfil e Configurações.
- **Status com nome nos Livros / Filmes e séries** (`BooksView.tsx`, mesma etiqueta `.status-pill` das tarefas; no celular volta a ser só a bolinha).
- **Pouco vermelho:** "vencido" na Manutenção, "Vencido" e a faixa "Atrasados" nos Lembretes, a data atrasada e o fundo avermelhado das linhas, "atrasado" no Plano de Estudo e o sino de Lembretes agora são neutros (texto escuro em cinza). Ficam vermelhos: a faixa de cadastro novo em Aniversários (pedido daquele fluxo), erros, microfone gravando, excluir ao passar o mouse e as bolinhas de aviso.
- **Status de Lembretes:** "Hoje" em roxo da marca e "Aguardando" com texto mais escuro (contraste).
- Reuniões, Projetos e Semana já usam a linha de tarefa, então herdam o status com nome.

| Tela | Situação | Nota |
|---|---|---|
| Livros / Filmes e séries | **Feito** | etiqueta de status + cabeçalho |
| Manutenção | **Feito** | cabeçalho + vencido neutro; o resto já era igual ao desenho |
| Lembretes | **Feito** | cabeçalho + status/atrasados sem vermelho |
| Reuniões, Ideias e Estudos, Novas Sinapses, Conhecendo você, Cadastros, Plano de Estudo, Medicamentos, Dieta, Checklists, Projetos, Compras, Semana, Lixeira | **Feito** | cabeçalho; estrutura e funções já eram as do desenho |
| Aniversários | **Feito** | cabeçalho; faixa vermelha de cadastro novo mantida |
| Calendário, Perfil | **Feito** (só o cabeçalho) | não chegaram a ser desenhados |

Se o Leandro quiser algum desenho ao pé da letra além disto (ex.: cartões de bens da Manutenção com resumo no cabeçalho, ou cartões de item em Ideias), é mudança nova: pedir e registrar aqui.

## Ajustes depois da conferência do Leandro (22/10, tarde)

- **Menu lateral rola** no computador (`.sidebar` com rolagem própria; Lixeira e Configurações ficam fixas embaixo).
- **Registro do dia, bloco da dieta reorganizado** (`DailyLogPanel.tsx`): primeiro % e comentário; abaixo, caixa "Refeições" com uma grade de refeição + botão de comentário lado a lado.
- **"N tarefas atrasadas" na tela do dia é clicável** (`DayGreeting` → `BoardApp` → `Dashboard`): abre o Dashboard já com a lista das atrasadas.
- **Aparência > Cor do fundo ganhou "Salvar cor"** (e "Descartar"): a cor escolhida é só prévia até salvar; ao salvar, o app relê do banco e avisa se gravou ou não.
- **Desenhos reorganizados em 5 páginas** (Tela do dia e Dashboard / Menu e listas / Funcionalidades / Configurações / Demais telas) para dar para conferir tela por tela.

## Ajustes de 22/10 (noite)

- **Lembretes:** vencidos voltam a ter um vermelho suave (data, etiqueta "Vencido", sino e leve tom na linha), a pedido do Leandro. Isso substitui a regra anterior de deixar os vencidos neutros só em Lembretes.
- **Play da tarefa:** com tempo registrado o play fica preenchido na cor da marca e o tempo aparece ao passar o mouse (não escreve mais o tempo ao lado, que desalinhava a coluna). O relógio rodando fica fora do fluxo, o botão não sai do lugar.
- **Lista compacta:** colunas alinhadas, descrição longa cortada com "…".
- **Registro do dia e saudação:** desenho aprovado em partes (saudação menor + 4 blocos); última versão em duas colunas de altura livre aguarda o OK para aplicar.

## Pendências conhecidas

- Print do painel de Configurações do app financeiro do Leandro: **ele ainda vai mandar**, para a tela de Configurações ficar parecida com a dele (hoje é a primeira proposta, feita só com os blocos do FARO).
- Carinhas de humor novas (além das 6): não feitas, porque a escala 1 a 5 do Dashboard depende delas. Decidir com ele se vale mudar.
- A fileira Hábitos / Dia a Dia na tela principal ainda mostra "Aperte o play…" como texto de ajuda; revisar quando ele pedir menos texto.
