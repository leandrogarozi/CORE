---
name: FARO
description: Painel pessoal de foco, ação, rotina e objetivos, em português do Brasil, com tema claro e escuro.
colors:
  accent: "#4A47D5"
  accent-soft: "#EEEDFC"
  accent-contrast: "#FFFFFF"
  accent-dark-theme: "#8583F0"
  accent-soft-dark-theme: "#26254A"
  background: "#F7F7F9"
  surface: "#FFFFFF"
  surface-2: "#F1F1F4"
  line: "#EFEFF4"
  border: "#EDEDED"
  border-strong: "#D9D9D9"
  text: "#17171C"
  text-muted: "#65656F"
  text-faint: "#9C9CA5"
  danger: "#E5484D"
  success: "#2F9E44"
  info: "#3B82C4"
  challenge: "#B45309"
  background-dark: "#111114"
  surface-dark: "#1B1B20"
  surface-2-dark: "#232328"
  text-dark: "#EEEEF1"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.45
  block-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 650
    letterSpacing: "-0.02em"
  screen-title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    letterSpacing: "-0.02em"
  big-number:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    letterSpacing: "-0.035em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  wordmark:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "27px"
    fontWeight: 800
    letterSpacing: "0"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12px"
rounded:
  chip: "6px"
  control: "9px"
  card: "13px"
  modal: "17px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px 18px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.pill}"
    padding: "6px 13px"
---

# Design System: FARO

## Overview

**Creative North Star: "O Caderno Calmo"** (nome provisório, inferido do sistema de design do dono; confirmar ou trocar)

O FARO é um painel de trabalho do dia a dia. A tela é calma e clara: fundo quase branco com uma mancha lavada de roxo nas quinas de cima, cartões brancos com uma linha de 1px e quase nenhuma sombra. O que separa os blocos é o espaço, não a decoração. A cor entra com significado (atrasado, concluído, categoria) e o roxo só aparece na ação e no que está selecionado.

A densidade é média e constante: muita coisa por tela, mas em linhas curtas e bem alinhadas, com números tabulares. O tema escuro nasce junto, como a mesma linguagem em versão escura, nunca como inversão.

**Key Characteristics:**
- Cartões brancos de contorno suave, cantos de 13px, sombra mínima.
- Um único acento: o roxo FARO, reservado à ação e à seleção.
- Hierarquia por peso e tamanho, não por cor.
- Português do Brasil, texto curto, ícones de traço único.
- Tema claro e escuro com a mesma estrutura.

## Colors

Paleta contida: neutros frios, um acento roxo e cores de significado.

### Primary
- **Roxo FARO** (#4A47D5; no escuro #8583F0): botão principal, item selecionado, atalho ativo, link, marca e o nome FARO. É a única cor de ação. Seu tom suave (#EEEDFC; no escuro #26254A) pinta o fundo de ícones e de estados selecionados leves.

### Neutral
- **Papel frio** (#F7F7F9; escuro #111114): fundo da página, sob o degradê lavado das quinas.
- **Cartão branco** (#FFFFFF; escuro #1B1B20): superfície de cartões e campos.
- **Cinza de apoio** (#F1F1F4; escuro #232328): segundo nível, chips e áreas de fundo.
- **Linha fina** (#EFEFF4; escuro #2A2A30): divisórias e contornos de cartão de 1px.
- **Tinta** (#17171C; escuro #EEEEF1), **cinza médio** (#65656F; #A4A4AE) e **cinza claro** (#9C9CA5; #75757F): três níveis de texto.

### Semantic
- **Vermelho de alerta** (#E5484D; escuro #F0787C): atrasado, perigo, excluir. Só aparece quando há algo a alertar.
- **Verde de feito** (#2F9E44; escuro #5FC97C): concluído, sucesso.
- **Azul de informação** (#3B82C4; escuro #6FAEE0): prioridade média e avisos neutros.
- **Âmbar de desafio** (#B45309; escuro #E0A458): tarefa da qual se foge. É outra informação, não é vermelho.
- Categorias (trabalho, estudo, dev, saúde, pessoal, família) têm cores próprias que **a pessoa pode configurar**; gráficos usam as mesmas.

### Named Rules
**The Acento Só na Ação Rule.** O roxo marca o que se clica ou o que está escolhido. Se tudo é roxo, nada é.
**The Vermelho De Verdade Rule.** Zero em vermelho assusta à toa. Alerta é condicional (n > 0).

## Typography

**Interface:** Inter (com sistema como reserva). **Números e código:** IBM Plex Mono, com números tabulares. **Marca:** Poppins ExtraBold, só no nome FARO da tela de entrada.

**Character:** neutra e legível; o peso (600 a 650) e o tamanho fazem a hierarquia, com leve aperto nos títulos e mais aperto nos números grandes.

### Hierarchy
- **Número de destaque** (650, 26px, -0.035em): total do painel.
- **Título de tela** (650, 17px): nome da tela, ao lado do botão de voltar.
- **Título de bloco** (650, 15px): cartões e grupos.
- **Corpo** (400, 13 a 14.5px, 1.45): texto padrão; textos longos ficam em linhas de 65 a 75 caracteres.
- **Apoio** (400 a 500, 12px): legendas, contagens, subtítulos.
- **Rótulo miúdo** (10.5px): só em gráficos e selos.

### Named Rules
**The Sem Gritar Rule.** Nada de caixa alta pequena e cinza-clara como título. Título de bloco é peso alto, cor de texto.
**The Número Tabular Rule.** Todo número que se atualiza usa `font-variant-numeric: tabular-nums`.

## Layout

Coluna central de até 1180px (ou a tela inteira no modo largo), com barra lateral de menu que vira gaveta no celular. Espaçamento em base 4 (4, 8, 12, 16, 20, 24, 32, 40, 48). Uma altura de controle por linha (32px no desktop, 44px no toque). Campos de formulário seguem a grade de propriedades: rótulo à esquerda (124px), valor à direita, em duas colunas quando cabe, e o rótulo vai para cima no celular (até 520px). Assuntos irmãos moram no mesmo cartão, separados por linha de 1px; números irmãos ficam numa faixa única.

### Named Rules
**The Base 4 Rule.** Medida que não é múltiplo de 4 é bug.
**The Colunas Fixas Rule.** Grades com colunas definidas, nunca `column-count`: o lugar das coisas não pode mudar sozinho.

## Elevation & Depth

Plano por padrão: a separação vem de espaço e linha de 1px. Existe um vocabulário curto de sombra: `--sh-1` (0 1px 2px + 0 6px 18px, quase imperceptível) para descolar cartões do fundo; `--sh-2` e `--sh-3` para menus, popovers e modais. No tema escuro as sombras são mais fortes para valer sobre fundo escuro. O estado selecionado de destaque (ex.: assunto em "Como usar") é a exceção aprovada: borda de 2px roxa, fundo levemente tingido e brilho suave.

### Named Rules
**The Plano Por Padrão Rule.** Sombra em tudo deixa a tela pesada; usá-la só para descolar ou elevar.

## Shapes

Cantos suaves e consistentes: chips 6px, campos e botões 9px, cartões e faixas 13px, caixas grandes e modais 17px, pílulas totalmente redondas (atalhos, selos). Ícones de traço único (2px, pontas arredondadas), 14 a 18px, dentro de quadradinhos de 36px com 10px de canto quando ilustram um título.

## Components

### Buttons
- **Shape:** 9px de canto, altura de controle única por linha.
- **Primary:** fundo roxo FARO, texto branco; um só por área.
- **Ghost:** fundo transparente, contorno suave; perigo em vermelho só no hover ou na confirmação.
- **Link de ação** (`.link-acao`): texto pequeno sublinhado para ações discretas e raras (ex.: Cancelar reunião).

### Chips e atalhos
- **Style:** pílula branca com contorno suave e ícone de traço. **Selecionado:** roxo cheio, texto e ícone brancos, sombra leve.

### Cards / Containers
- **Corner Style:** 13px. **Background:** branco. **Border:** 1px linha. **Shadow:** `--sh-1`. **Padding:** 16 a 18px. Cartão dentro de cartão não se usa.
- **Bloco de Configurações** (`.cfg-bloco`): quadradinho de ícone, título, resumo e seta; abre e fecha; chave liga/desliga na frente quando o painel é opcional.

### Inputs / Fields
- **Style:** fundo de superfície, contorno suave, 9px de canto. **Focus:** contorno roxo. **Erro:** contorno vermelho. Campos sem classe herdam o visual por regra global.

### Navigation
- Barra lateral com grupos (Hoje, Aprender, Pessoas, Saúde e casa); no celular vira gaveta. No topo de cada tela, botão de voltar redondo e o botão "? Como funciona".

### Escolha de aviso
- Segmento de três opções (Push, WhatsApp, Os dois), pílula selecionada em roxo suave. Um alternador por app é o padrão.

## Padrão do celular e dos controles (aprovado de 30/10 a 01/11/2026) — seguir em tudo que for criado ou ajustado

Este é o acordo com o dono depois de uma noite inteira de ajustes com prints do iPhone. Antes de mexer em qualquer tela, ler esta seção; ao criar tela nova, aplicar tudo; ao ajustar, não desfazer.

**Estilo e teste**
- O estilo padrão é o **Cartão flutuante** (roxo). A escolha mora na chave `faro-estilo-v2` (+ cookie); `GuardaDoEstilo` recoloca `data-estilo` e `data-theme` se o `<html>` perder os atributos. Valores antigos são ignorados de propósito. O Clássico não muda e não é referência.
- Testar sempre a **390 px** (largura do iPhone) e no tema claro e escuro. Método que funcionou: página HTML estática com o `globals.css` real e a marcação da tela, fotografada com o Playwright; depois o dono confere no iPhone e manda print. Desenho novo (layout inédito) é mostrado antes de aplicar.
- Toda mudança de tela vira uma entrada no `BRIEFING.md` e vai para o ar (push na branch).

**Letra**
- A tela de **Projetos** é a referência: **nome do item 14 px** (peso 600 em títulos de cartão), **subtexto 12 px**, campo de texto 13 px. Não aumentar por conta própria; o editor de texto longo fica em 16 px.
- Nada de reticências em nome de item no celular: o nome **quebra em linhas** (`TituloQueCresce` ou `textarea` que cresce; Enter confirma).

**Linha de item no celular (lista de lembretes, remédios, livros, ideias, projetos, tarefas…)**
1. Parte de cima: ícone/status + **título inteiro**.
2. Meio: etiquetas, status, data ou aviso em texto.
3. Embaixo: **uma linha de botões, todos encostados à direita, do mesmo tamanho** (36 a 40 px, ícone de 17 px). Se houver "abrir" ou ação principal, ela vai à esquerda dessa linha com nome ("Abrir").
- Conteúdo raro ou redundante some no celular (ex.: "0 s feitos" do Plano de Estudo).
- Campo de **adicionar fica sempre em cima** da lista, com o botão de enviar à vista; campo secundário (tipo, hora) desce para a linha de baixo.

**Controles**
- **Sino (avisa no app) e WhatsApp:** classes `.bell-btn` e `.zap-btn` (nunca usar `zap-btn` para sino), botão **redondo** (36 px, 40 no celular); desligado cinza suave, ligado em **degradê roxo (sino) ou verde (WhatsApp)**, ícone branco. Vale para Lembretes, Dieta, Aniversários, Compras, Manutenção e Medicamentos.
- **Segmentos e abas:** bandeja redonda, **uma linha só** (rola de lado se não couber), o escolhido em **degradê roxo**. Escolha curta de 2 a 5 opções (Ideia/Estudo, Por data/Por cliente, filtros) usa segmento. Onde há contador (Dashboard), a bandeja deixa o número sobrar (`overflow:visible`).
- **Liga/desliga** (`.toggle-switch.on`): roxo escuro `#4A47D5`. Em linha de propriedade: nome à esquerda, chave à direita, explicação embaixo em letra pequena.
- **Botões:** principal em degradê roxo, ghost branco com sombra; ícone branco em botão roxo; **Salvar e Cancelar centralizados**; 3 ou 4 botões numa caixa vão em **grade de duas colunas** (`edit-actions-grade`); texto de botão não quebra no meio da palavra.
- **Campos:** cinza suave sem borda, `box-sizing:border-box` e `max-width:100%` (nunca passam da caixa); data e hora em campo cinza do mesmo desenho.
- **Contadores e bolinhas** (anexos, "tem anotação"): no **canto** do ícone, nunca no meio.
- **Cores com significado:** Livros verde = concluído, amarelo = lendo, azul = para ler; Dispensa verde = cheio (60% ou mais), amarelo = atenção (30 a 59%), vermelho = acabando.

**Cartões**
- Cartões de **16 px** de canto, **filete** de 4 px na borda esquerda seguindo a curva (`.com-filete`, `.synapse-card`), camadas sobrepostas **sem linhas** (bandeja cinza suave + blocos brancos com sombra leve). Sem aninhar cartão em cartão com borda.

**iPhone**
- O Safari amplia a tela ao tocar num campo com letra pequena. Solução adotada: `maximum-scale=1` posto pelo `GuardaDoEstilo` só no iPhone. Se voltar a ampliar, o plano B é letra de 16 px só nos campos que causarem (`select` inclusive), não em todos.
- Texto de saudação e títulos usam quebra de linha normal (`text-wrap:wrap`); o `balance` do Safari deixa a frase estreita.

## Do's and Don'ts

### Do:
- **Do** usar peso e tamanho para hierarquia; cor é para significado.
- **Do** mostrar o layout por desenho ou print antes de publicar (processo do dono).
- **Do** manter o tema escuro como a mesma linguagem, com os mesmos tokens semânticos.
- **Do** usar números tabulares e unidades menores e apagadas.
- **Do** manter alvos de toque de 44px no celular.

### Don't:
- **Don't** usar roxo em tudo: só ação e seleção.
- **Don't** usar vermelho para valor zero.
- **Don't** usar caixa alta pequena e cinza como título.
- **Don't** aninhar cartões nem usar sombra em todos os blocos.
- **Don't** usar emoji ou glifos no lugar de ícones desenhados.
- **Don't** usar uma segunda cor de acento.
