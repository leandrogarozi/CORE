---
name: lg-sistema-de-design
description: O sistema de design do Leandro — a linguagem visual provada no app FARO e pronta pra reusar nos outros apps dele. Use SEMPRE que ele falar em layout, visual, interface, "deixar mais bonito", "cara de aplicativo", "mais limpo", "está poluído", design system, tokens, paleta, tema claro/escuro, ou ao criar uma tela, painel, dashboard, formulário ou componente novo em qualquer app dele — mesmo que ele não use a palavra "design". Também dispara quando ele manda print de uma tela pedindo opinião, quando manda referências visuais que gosta, e quando uma tela nova precisa nascer parecida com o FARO. NÃO dispare para troca trivial de um texto ou de uma cor pontual já decidida.
---

# Sistema de design do Leandro

Isto não é teoria de design. É o que **se provou** no redesenho do FARO em 30/09/2026,
tela por tela, com print aprovado antes de cada publicação. Cada regra aqui existe
porque resolveu um problema real que dava pra ver na tela.

Use como base pra qualquer app dele. O objetivo declarado é que os apps dele
sigam a mesma linha: "gostaria depois que tudo ficasse da mesma forma".

## Antes de qualquer pixel: o combinado com o Leandro

Três regras de processo que valem mais que qualquer token:

1. **Ele aprova por print, não por descrição.** "Assim eu consigo fazer o papel de
   diretor criativo." Nada vai pro ar sem ele ver antes. Se o deploy é automático
   ao dar push, o commit fica local até ele aprovar.
2. **Roupa nova, não cirurgia.** Redesenho não muda o que a tela faz. Se algo só
   melhora mudando comportamento, isso é uma decisão dele, apresentada à parte.
3. **Uma etapa por vez, e a primeira é invisível.** A camada de tokens entra sem
   ninguém consumir — token que ninguém usa não muda pixel nenhum, e é isso que
   torna o primeiro passo reversível por construção.

Quando for abrir uma frente nova de layout, o caminho é: pesquisa e referências →
**três direções** pra ele escolher → print → aplicar. (A skill
`lg-processo-de-projeto` cobre esse rito em detalhe.)

## As três camadas de token

A camada do meio é onde os sistemas morrem. Primitivo sem semântica vira um
`--azul-500` espalhado por tudo que ninguém consegue trocar; semântica sem
primitivo vira trinta valores soltos que ninguém consegue alinhar.

```
CAMADA 1 — primitivos   nomeados pelo que SÃO      --sp-4, --r-3, --fs-5
CAMADA 2 — semânticos   nomeados pelo que FAZEM    --linha, --trilho, --fundo-degrade
CAMADA 3 — componente   só quando um componente     --kpi-altura
                        precisa de algo que mais
                        ninguém usa
```

**Nada no app consome a camada 1 direto.** Quem consome é a 2. Trocar um primitivo
muda o app inteiro de uma vez, e é essa a graça.

Os valores prontos estão em `references/tokens.css` — copie e ajuste o acento e os
cinzas pro app em questão. A estrutura não muda.

## As regras que se provaram

### Espaço e alinhamento

**Base 4, sem exceção.** Metade da sensação de "alinhadinho" das boas referências
vem daqui, não de talento artístico. Medida que não é múltiplo de 4 é bug.

**Uma altura de controle por linha.** 32px no desktop (convenção de Linear, Vercel,
Notion — mouse é preciso), 44px no toque. O que fazia a barra de cima do FARO
parecer torta não era cor nem fonte: era botão de 26, ícone de 18 e "Hoje" de 30
lado a lado.

### Hierarquia

**Peso e tamanho, nunca cor.** Cor é pra significado (atrasado, concluído,
categoria). Quando cor também carrega hierarquia, as duas coisas brigam e a tela
vira um semáforo.

**Caixa alta fora dos títulos.** `11px MAIÚSCULO cinza-claro` grita e não se lê —
é o pior dos dois mundos. Título de bloco é tamanho de corpo com peso alto e cor
de texto.

**Unidade é régua, não dado.** "24h56min" vira `24ʰ 56ᵐⁱⁿ` com a unidade menor e
apagada, pro olho pegar a grandeza antes de ler.

**Números tabulares sempre** (`font-variant-numeric: tabular-nums`). Coluna de
número que dança a cada atualização é desleixo que todo mundo sente e ninguém
aponta.

### Separação

**Espaço e linha de 1px separam; sombra quase não existe.** Uma sombra sutil
(`--sh-1`) dá o descolamento do fundo e acabou. Sombra em tudo é a causa número um
de tela "pesada".

**Linha que para antes da borda parece defeito.** Divisória dentro de cartão
estica até o fim (`margin: 15px -17px` com o padding do cartão).

### Agrupamento

**Número irmão vive numa faixa só.** Sete números em sete cartões soltos fazem cada
um pedir atenção por conta própria. Uma faixa única dividida por linha de 1px diz
"isto é um grupo" sem precisar de título.

> Detalhe que custou uma rodada: a divisória da faixa é `box-shadow`, não `gap`. O
> `gap` pinta o fundo do contêiner, e numa linha incompleta (7 números em 4 colunas)
> sobra um retângulo cinza no vazio. Com `box-shadow: 1px 0 0 var(--linha), 0 1px 0 var(--linha)`
> na célula, a célula que não existe simplesmente não desenha nada.

**Assunto irmão mora no mesmo cartão**, separado por linha — não em cartões
vizinhos. "Concluídas × pendentes" e "Prioridade" são sobre tarefas; ficam dentro
do cartão Tarefas.

**Colunas fixas, nunca `column-count`.** O `column-count` reordena os blocos sozinho
conforme a altura de cada um: a arrumação muda a cada semana e nunca dá pra decorar
onde as coisas ficam. Prefira `grid-template-columns: repeat(3,1fr)` com
`align-items: start`.

### Cor

**Acento só na ação.** Numa barra com busca, data, três ícones e um botão, só o
botão é colorido. Se tudo é acento, nada é.

**Vermelho só quando é vermelho de verdade.** Zero em vermelho assusta à toa, e
assustar à toa faz o alerta perder o valor. Alerta é condicional: `n > 0`.

**Cor de categoria é do usuário.** Se ele configura a cor da etiqueta em algum
lugar, o gráfico usa a MESMA. Paleta própria fixa no código é cor feia que ninguém
consegue trocar.

### Componentes provados

Os seis que carregam quase tudo estão em `references/componentes.md`, com o CSS
pronto: **faixa de números**, **segmento** (alternador), **cartão com seções**,
**linha de lista**, **barra**, **rosca**. Leia esse arquivo antes de inventar um
componente novo — é provável que um deles já resolva.

Dois acertos que vale saber de cor:

- **Alternador é segmento**: fundo cinza, item ativo como pílula branca. **Um só
  por app.** Botões colados com divisória é linguagem de 2015.
- **Furo da rosca é máscara**, não um círculo branco por cima — assim funciona no
  tema escuro e sobre degradê sem remendo. (`mask: radial-gradient(circle,
  transparent 58%, #000 59%)`. A 70% o anel some.)

### Tema escuro

Nasce junto, como versão escura da mesma linguagem — não é inverter, e não é
trocar pra vidro/neon.

- **No escuro o degradê precisa ser bem mais fraco.** O mesmo brilho que é sutil no
  branco vira mancha no preto.
- **Sombra no escuro não é mais forte, é mais preta e mais fechada**, senão vira um
  halo cinza ao redor do cartão.
- **Se existe botão de tema, o tema é decidido por atributo (`data-theme`), não por
  media query.** Um botão que o sistema pode contradizer não é botão. Quem escreve
  o atributo é um script síncrono no `<head>`, antes do primeiro pixel — framework
  nenhum resolve isso com script "não bloqueante", e sem isso a tela pisca branca
  antes de escurecer. O detalhe com código está em `references/tema-escuro.md`.
- **A escolha mora no aparelho (`localStorage`), não na conta.** Escuro no celular à
  noite e claro no computador de dia é um caso real, não hipótese.

## Trabalhando num app que já existe

**Veja quem mais usa a classe antes de mexer nela.** No FARO, `.dash-box` e
`.dash-nav` eram de 15 telas. Mexer nelas sem saber teria mudado o app inteiro sem
print e sem aprovação.

- Classe usada por **uma** tela → mexa à vontade.
- Classe usada por **várias** → ou vira uma etapa própria, anunciada e com print,
  ou a tela nova estreia com **prefixo próprio** (`dsh-`) e as antigas ficam
  intactas.

```bash
# antes de tocar numa classe
grep -rl "nome-da-classe" src --include=*.tsx | wc -l
```

**Ordem que funcionou:** tokens (invisível) → a tela mais difícil → a casca e as
classes compartilhadas → as telas de dentro. A tela mais difícil primeiro é de
propósito: se o sistema sobrevive a ela, sobrevive a qualquer outra.

## Provar antes de mostrar

Print de mock bonito não prova nada — prova o mock. **A página de prova carrega o
CSS real do projeto e o DOM real que o componente emite.** Se o CSS que vai pro ar
estiver errado, o print mostra o erro.

`scripts/provar.py` monta essa página e tira os prints. Ele embute as fontes em
base64 porque Chromium headless com frequência não busca a folha do Google — e sem
isso o print mentiria sobre a tipografia.

```bash
python3 scripts/provar.py --css src/app/globals.css --corpo tela.html --saida ./prova
```

**Cinco estados, sempre.** O print bonito do caso feliz é o que todo mundo manda; os
outros quatro são onde mora o trabalho:

| Estado | Por quê |
|---|---|
| claro | o caso feliz |
| escuro | metade dos bugs de contraste moram aqui |
| **vazio** | dia sem dado nenhum: a tela fica com buraco? |
| **extremo** | nome comprido + número de 4 dígitos: estoura a caixa? |
| **estreito** (390px) | o celular dele |

Leia os PNGs antes de mandar. Já aconteceu de a rosca sair como círculo vazio e o
texto sair espremido — os dois achados por olhar a imagem, não por olhar o código.

## Ao entregar

Diga o que **saiu de propósito** e o que **mudou fora do combinado**. No FARO: a
segunda barra dos hábitos saiu (o dado virou texto), e o degradê de fundo foi a
única regra que escapou de uma tela e apareceu em todas. Ele precisa saber disso
pra poder vetar.

E diga o que o print **não** prova: animação, hover, o não-piscar do tema no
recarregamento, as telas que você não renderizou uma a uma.

## Ícones

Vêm do banco de ícones do projeto (no FARO, `design/icon-pack/`). Ícone novo sai do
banco, não de invenção — é o que mantém a família. Converta `stroke="white"` para
`stroke="currentColor"` pra cor vir do CSS.
