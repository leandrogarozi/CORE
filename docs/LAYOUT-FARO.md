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

## Demais telas desenhadas no canvas (22/10) — aguardando aprovação

Cada uma foi desenhada no layout novo (cabeçalho com voltar e título, campo de adicionar com microfone, cartões com cantos arredondados, status em etiqueta com nome, ícones reais, pouco vermelho) **mantendo todas as funções de hoje**. Cada página do canvas tem, no pé, a nota "o que mudou no desenho". Nenhuma foi aplicada no app ainda.

| Tela | Arquivo no canvas | Situação | Observação |
|---|---|---|---|
| Livros / Filmes e séries | `Livros.dc.html` | **Aguardando** | status em etiqueta (Para assistir, Assistindo, Assistido); registro "Enviado para…" |
| Manutenção | `Manutencao.dc.html` | **Aguardando** | cartões de bens; painel de edição com Comprar/Fazer/Vencido, anotação e histórico; vencido sem vermelho |
| Lembretes | `Lembretes.dc.html` | **Aguardando** | seções Atrasados/Hoje/Próximos; "Vindos de outras telas" separado |
| Reuniões | `Reunioes.dc.html` | **Aguardando** | reunião continua sendo tarefa com a tag Reunião |
| Ideias e Estudos | `Ideias.dc.html` | **Aguardando** | tag IDEIA/ESTUDO, ditar ideia, anexar documento |
| Novas Sinapses | `Sinapses.dc.html` | **Aguardando** | |
| Conhecendo você | `Conhecendo.dc.html` | **Aguardando** | Aprovar/Recusar, resumo, trazer da IA |
| Aniversários | `Aniversarios.dc.html` | **Aguardando** | a faixa de cadastro novo mantém o vermelho pedido para aquele fluxo |
| Cadastros | `Cadastros.dc.html` | **Aguardando** | |
| Plano de Estudo | `PlanoEstudo.dc.html` | **Aguardando** | |
| Medicamentos | `Medicamentos.dc.html` | **Aguardando** | |
| Dieta | `Dieta.dc.html` | **Aguardando** | |
| Checklists | `Checklists.dc.html` | **Aguardando** | |
| Projetos | `Projetos.dc.html` | **Aguardando** | etapas usam a linha de tarefa |
| Compras | `Compras.dc.html` | **Aguardando** | |
| Semana | `Semana.dc.html` | **Aguardando** | sem bloco de horas, como pedido |
| Lixeira | `Lixeira.dc.html` | **Aguardando** | |
| Calendário, Perfil | — | **Fora** | ainda não desenhados |

## Pendências conhecidas

- Print do painel de Configurações do app financeiro do Leandro: **ele ainda vai mandar**, para a tela de Configurações ficar parecida com a dele (hoje é a primeira proposta, feita só com os blocos do FARO).
- Carinhas de humor novas (além das 6): não feitas, porque a escala 1 a 5 do Dashboard depende delas. Decidir com ele se vale mudar.
- A fileira Hábitos / Dia a Dia na tela principal ainda mostra "Aperte o play…" como texto de ajuda; revisar quando ele pedir menos texto.
