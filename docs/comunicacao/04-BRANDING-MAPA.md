# Mapa de branding do FARO

Versão de 01/11/2026, extraído do app em produção (`globals.css`, `DESIGN.md`, `design/`). **Onde este arquivo e o app divergirem, vale o app.** Arquivos de marca em `marca/` (neste pacote).

## 1. Essência
- **Nome:** FARO. Significado: **F**oco, **A**ção, **R**otina e **O**bjetivos. (Em português "faro" também é o olfato do cachorro que encontra o caminho; o mascote é "o cachorrinho".)
- **Assinatura:** "Seu caminho para manter o foco, ação, rotina e objetivos."
- **Promessa:** o seu dia, a sua rotina e o seu aprendizado num só lugar, com um assistente que conhece você e só age depois do seu OK.
- **Palavras da marca:** foco, calma, clareza, "você decide", cuidado, companhia.
- **Não é:** frio, técnico, gamificado em excesso, "produtividade a qualquer custo". É um painel **calmo** e humano.
- **Marca própria:** o FARO tem identidade própria. O dono tem outra marca (pessoal/estúdio Garozi). **Não misturar.** Nas peças do FARO o dono aparece só como "criado por".

## 2. Logo e ícone
- **Ícone do app ("Novo A"):** rostinho branco de traço único (orelhas laterais, olhos e boca) sobre fundo em **degradê roxo** `#4A47D5 → #7C4DF0`. Versões: `marca/faro-icone-degrade-cheio.svg` (fundo cheio), `marca/faro-icone-degrade-traco.svg` (traço), PNGs de 32 a 640 px.
- **Mascote:** `marca/faro-mascote.svg` (traço branco, para usar sobre o roxo) e referência 3D `marca/faro-dog-3d.png`. No app é "o cachorrinho" **[DONO: confirmar o nome e a personalidade do mascote]**.
- **Wordmark:** "FARO" em **Poppins ExtraBold**, com o **degradê roxo** (`#4A47D5 → #7C4DF0`) no texto, na entrada do app.
- **Foto do WhatsApp:** `marca/faro-foto-whatsapp.png`.
- **Uso:** respeitar área livre igual à altura do olho do mascote; não esticar; não trocar o degradê; fundo claro ou roxo.

## 3. Cores
| Papel | Hex | Uso |
|---|---|---|
| **Roxo FARO** | `#4A47D5` (escuro: `#8583F0`) | Ação, seleção, link, marca |
| **Degradê principal** | `#4A47D5 → #7C4DF0` (135°) | Botão principal, dia selecionado, barras de progresso, ícones das ações rápidas, chave "ligada" no `#4A47D5` |
| **Roxo suave** | `#EEEDFC` (escuro: `#26254A`) | Fundo de ícones e estados leves |
| **WhatsApp (degradê verde)** | `#1E8E55 → #3FC47E` | Só para o que é WhatsApp (botão, aviso ligado) |
| **Papel** | `#F7F7F9` (escuro: `#111114`) | Fundo da página, com mancha lavada de roxo nas quinas |
| **Cartão** | `#FFFFFF` (escuro: `#1B1B20`) | Superfície |
| **Cinza de apoio** | `#F1F1F4` | Chips, campos |
| **Tinta** | `#17171C` | Texto; secundário `#65656F`; terciário `#9C9CA5` |
| **Atrasado/alerta** | `#E5484D` | Só quando há algo a alertar |
| **Concluído** | `#2F9E44` | Feito, sucesso, "cheio" |
| **Informação** | `#3B82C4` | Neutro, "para ler" |
| **Atenção/desafio** | `#B45309` (âmbar) | Acabando, desafio |

**Regras:** o roxo só marca o que se clica ou o que está escolhido ("se tudo é roxo, nada é"); vermelho só quando há alerta; o **sino** do app é sempre **roxo** e o **WhatsApp** sempre **verde**; livros: verde = concluído, amarelo = lendo, azul = para ler.

## 4. Tipografia
- **Interface:** Inter. **Números:** IBM Plex Mono (tabulares). **Marca:** Poppins ExtraBold, só no nome FARO.
- **Tamanhos no celular (referência: tela de Projetos):** nome do item 14 px (peso 600), subtexto 12 px, títulos de tela maiores. Hierarquia por **peso e tamanho**, não por cor.
- Texto em português do Brasil, curto. Sem caixa alta pequena e cinza como título.

## 5. Forma e componentes (o "estilo flutuante", padrão atual)
- **Cartões** brancos que **flutuam** (sombra macia e funda), cantos de **16 px**, sem aninhar cartão em cartão com borda; **camadas sobrepostas sem linhas**; **filete** de 4 px colorido na borda esquerda seguindo a curva.
- **Botões** totalmente redondos (pílula). Principal em degradê roxo com sombra suave; secundário branco com sombra; ícone branco em botão roxo.
- **Segmentos/abas:** bandeja cinza arredondada, o escolhido em degradê roxo.
- **Campos:** cinza suave sem borda, cantos de 10 px, 36 a 44 px de altura.
- **Sino e WhatsApp:** botão **redondo** (36 px; 40 no celular); desligado cinza, ligado em degradê.
- **Ícones:** traço único (2 px, pontas arredondadas), 14 a 18 px; nunca emoji no lugar de ícone.
- **Tema claro e escuro** com a mesma estrutura (o escuro é a mesma linguagem, não uma inversão).
- **Observação:** o `DESIGN.md` do repositório descreve na parte de cima o estilo "clássico" (cartão com contorno, cantos de 13 px). **Para peças de comunicação vale o estilo flutuante descrito aqui e na seção "Padrão do celular e dos controles" do `DESIGN.md`.**

## 6. Movimento
Curto e suave (200 a 400 ms); cartão entra de baixo; botão que liga muda de cinza para o degradê; barra de progresso enche; o assistente abre com leve escala. Sem efeitos chamativos, sem tremor, sem excesso de partículas.

## 7. Voz e tom
- **Direto e caloroso**, como um bom colega: "Toque na bolinha para concluir", não "Utilize o controle de status".
- Frases curtas; verbos de ação; português do Brasil; "você".
- **Honesto:** "é um teste inicial, pode falhar, conte pra gente".
- **Respeitoso com a privacidade:** "você decide", "só age depois do seu OK", "saúde e dados bancários nunca vão para a IA".
- **Evitar:** jargão ("otimizar", "sinergia"), superlativos vazios ("revolucionário", "incrível"), promessas de resultado ("dobre sua produtividade"), culpa ("você está atrasado!"; no app, o atraso é informação, não cobrança).
- Exemplos de frases já usadas: "O que você precisa?", "Nada atrasado e nenhuma reunião hoje", "Seu caminho para manter o foco, ação, rotina e objetivos".

## 8. Telas e imagens
- Telas: **reais**, de hoje, com **dados inventados** (conta de demonstração). Moldura de celular simples; sem bordas decorativas.
- Fotos: não há banco de fotos do FARO. Não usar fotos de pessoas "de banco de imagem". Se houver pessoas, só com consentimento **[DONO]**.
- Imagem de compartilhamento: ícone grande + nome FARO + assinatura, sobre o degradê.

## 9. O que ainda não está definido **[DONO]**
- Personalidade e nome oficial do mascote.
- Busca de marca "FARO" no INPI (a palavra é comum; o domínio não protege a marca).
- Redes sociais e `@` (checar `@soufaro`).
- Cor de apoio para materiais impressos e versão em preto e branco do logo.
- Música e voz dos vídeos.
