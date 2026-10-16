# Mapa: como a IA e o FARO conversam

> Documento de referência (e base de material comercial). Explica, em linguagem simples, tudo o que acontece entre a inteligência artificial e o FARO: o que a IA lê, o que ela pode criar, o que só vale depois da aprovação da pessoa e como a pessoa é avisada.
>
> Última atualização: 16/10/2026. Quando uma capacidade nova da IA nascer, atualizar aqui.

## A ideia em uma frase

**O FARO é o cérebro da pessoa; a IA é o assistente que lê esse cérebro, ajuda a preenchê-lo e nunca decide sozinha o que vale.**

Tudo o que a pessoa constrói no FARO a IA enxerga. Tudo o que a IA aprende sobre a pessoa volta ao FARO como **proposta**, e só entra para valer quando a pessoa aprova.

## Os três caminhos

```
                         ┌─────────────────────────────┐
                         │            FARO             │
                         │  (cérebro e rotina da pessoa)│
                         └──────┬───────────────┬──────┘
                                │               ▲
        ① LER (conector)        │               │   ② PROPOR / CRIAR (conector)
   a IA consulta o que a        │               │   a IA devolve aprendizados e
   pessoa aprovou               ▼               │   cria itens, sempre com OK
                         ┌─────────────────────────────┐
                         │   IA externa (ex.: Claude)  │
                         │   a que a pessoa já usa     │
                         └─────────────────────────────┘

        ③ IA DE DENTRO DO APP (mascote "Toque e fale")
        a pessoa fala ou escreve no próprio FARO e a IA propõe ações
        em cartões de confirmação.
```

### ① FARO → IA: a IA lê (conector, só leitura)

A pessoa liga o FARO ao Claude uma vez (um endereço secreto, colado em Conectores). Daí em diante, em qualquer conversa, a IA pode:

| A IA consulta | Serve para |
|---|---|
| Quem a pessoa é (perfil, valores, objetivos, preferências, decisões) | Responder e criar já no jeito dela, sem pedir contexto toda vez |
| Sinapses (aprendizados que mudaram uma crença) e Ideias | Conectar o assunto da conversa com o que a pessoa já pensou |
| Anotações de livros e estudos | Não repetir o que ela já sabe |
| "O que entrou de novo" | Saber o que a pessoa andou aprendendo |

Só o que a pessoa **aprovou** é lido. **Saúde, medicamentos, senhas e dados bancários ficam sempre de fora.**

### ② IA → FARO: a IA devolve e cria (conector, com confirmação)

**Aprendizados (o que a IA descobriu sobre a pessoa):**
1. Durante uma conversa, a pessoa revela algo novo e durável (um valor, uma decisão, um objetivo).
2. A IA envia ao FARO como **proposta**.
3. O FARO **avisa a pessoa** por notificação no celular: *"Tem 2 aprendizados novos para você aprovar"*, e mostra um número no menu "Conhecendo você".
4. Na aba **Para revisar**, a pessoa aprova, edita ou descarta cada item.
5. Só o aprovado passa a valer: entra no resumo "O que o FARO sabe sobre você", no backup e na leitura da IA.

**Criar coisas no dia a dia (aniversários, tarefas, lembretes):**
1. A pessoa pede na conversa: *"anota o aniversário do João, 20/03"*.
2. A IA mostra uma **prévia** do que vai criar (nada foi gravado).
3. A pessoa diz que sim; só então a IA grava. O servidor **exige** essa confirmação: a IA não consegue pular a etapa.
4. O FARO avisa por notificação que a IA criou algo.

### ③ A IA dentro do app (mascote)

A pessoa toca no mascote, fala ou escreve, e a IA propõe **cartões de ação**: criar tarefa, criar lembrete, anotar um gasto, adicionar um aniversário (e ligar o lembrete no WhatsApp), registrar humor, sono, água e dieta do dia, reajustar um plano de estudo. Nada é gravado antes do toque em **Confirmar**.

## As regras que não mudam (a confiança do produto)

1. **A pessoa aprova.** A IA propõe; o FARO só guarda como "valendo" o que a pessoa confirmou.
2. **A IA só cria e faz dois ajustes leves e reversíveis** (marcar como feita, acrescentar texto à anotação). Não apaga nem reescreve nada. O pior erro possível é um item a mais ou uma tarefa marcada a mais, que se desfaz em um toque.
3. **Sem duplicar.** Pessoa já na lista de aniversários e aprendizado de mesmo título são pulados.
4. **Dado inválido é barrado** (data impossível, hora sem data, aprendizado que cita saúde ou senha).
5. **Saúde nunca viaja.** Medicamentos, tratamentos e anotações de saúde não são lidos nem enviados pela IA externa.
6. **A pessoa é sempre avisada** quando a IA grava ou propõe algo.
7. **Tudo tem cópia.** O que está no FARO entra no backup diário (Mac/Windows e Google Drive); o que a IA propôs e foi aprovado também.

## Mapa de capacidades (hoje)

| Capacidade | IA do app | IA externa (conector) | Pede confirmação? |
|---|---|---|---|
| Ler o que a pessoa aprovou no FARO | usa o resumo do dia | **sim** | não precisa |
| Criar tarefa | sim | sim | **sim** |
| Criar lembrete | sim | sim | **sim** |
| Adicionar aniversário (com lembrete no app e no WhatsApp) | sim | sim | **sim** |
| Ligar/desligar lembrete e WhatsApp de um aniversário | sim | (em breve) | **sim** |
| Ver a agenda (próximos dias, atrasadas, lembretes) | pelo resumo do dia | **sim** (`faro_ver_agenda`) | não precisa (só leitura) |
| Criar reunião | sim | sim (tarefa com tag Reunião) | **sim** |
| Marcar tarefa como feita | sim | sim | **sim** |
| Acrescentar texto na anotação de tarefa/reunião (pauta, decisões) | sim | sim | **sim** |
| Anotar gasto num checklist | sim | (em breve) | **sim** |
| Registrar humor, sono, água, dieta | sim | não (de propósito) | **sim** |
| Reajustar plano de estudo | sim | não | **sim** |
| Propor aprendizado novo sobre a pessoa | não se aplica | **sim** | **vai para "Para revisar"** |
| Anexar arquivo | não | não | (futuro) |
| Editar ou apagar o que já existe (além dos dois ajustes acima) | não | não | não permitido |

## Como a pessoa é avisada

- **Caixa de Avisos na home (botão "Avisos"):** cada coisa que a IA propôs ou criou fica registrada até a pessoa ler, com explicação do que aconteceu, botão que leva ao lugar certo e "marcar como lido". É a rede de segurança: mesmo que a notificação do celular passe despercebida, o aviso continua lá.
- **Notificação no celular (push):** sempre que a IA propõe um aprendizado ou cria algo.
- **Número no menu:** "Conhecendo você" mostra quantos itens esperam aprovação.
- **WhatsApp:** usado para os **lembretes** que a pessoa liga (aniversários, tarefas, remédios etc.), não para os avisos da IA, para não gerar custo por mensagem sem necessidade.

## Para ligar (uma vez, 3 minutos)

1. No FARO: **Configurações → Conector FARO → Copiar endereço**.
2. No Claude: **Configurações → Conectores → Adicionar conector personalizado**, nome *FARO*, colar o endereço.
3. Nas preferências do Claude, colar a instrução fixa: *"Antes de escrever, planejar ou criar algo para mim, consulte o FARO. Quando eu revelar algo novo e durável sobre mim, proponha registrar no FARO."*
4. Testar: *"O que o FARO sabe sobre mim?"*.

## Roteiro para explicar a um cliente (30 segundos)

> "Você já conversa com uma IA todo dia, e ela aprende coisas sobre você. O problema é que esse aprendizado fica preso lá dentro. O FARO é o seu cérebro: a IA lê o que você aprovou, para te conhecer de verdade, e devolve o que descobriu como proposta. Você recebe um aviso, aprova o que faz sentido e o resto some. Ela também anota por você: aniversários, tarefas, lembretes, mas sempre mostrando antes e esperando o seu 'pode'. Nada acontece sem você, e nada se perde: tudo tem cópia."

## Perguntas que o cliente vai fazer

- **"A IA pode apagar meus dados?"** Não. Só cria, e cria depois do seu OK.
- **"E se ela entender errado?"** Ela mostra antes. E o que ela propõe como aprendizado só vale depois de você aprovar.
- **"Meus dados de saúde vão para a IA?"** Não. Ficam fora do conector por regra.
- **"Funciona com outra IA além do Claude?"** O conector segue o padrão MCP, que o ChatGPT e outras IAs também estão adotando. Para qualquer IA, existe o caminho manual: pedir um resumo e colar em "Conhecendo você".
- **"Preciso lembrar de pedir à IA?"** Para ler, não: ela consulta sozinha. Para devolver aprendizados, a instrução fixa nas preferências cuida disso.

## Limites conhecidos (honestidade vale em material comercial)

- A **memória interna** da IA não é acessível ao FARO: só chega o que a própria IA decide propor durante as conversas.
- A IA externa **ainda não anexa arquivos**.
- O aviso de proposta chega por **notificação do celular**; sem o app instalado e as notificações ligadas, vale o número no menu.

## Onde está no código (para quem for manter)

- Leitura e ferramentas do conector: `src/lib/conector/faro-mcp.ts`, rota `src/app/api/mcp/[token]/route.ts`.
- Criação e propostas (com confirmação): `src/lib/conector/faro-escrita.ts`.
- IA do app: `src/lib/ia/` (`ferramentas.ts`, `executar.ts`, `conversa.ts`), tela `src/components/board/FaroMascot.tsx`.
- Aprovação das propostas: `src/components/board/ConhecendoView.tsx` (aba "Para revisar").
- Avisos: caixa na home `src/components/board/AvisosButton.tsx` (tabela `faro_avisos`) e push `src/lib/push/enviar.ts`.
- Regra fixa: **toda ação nova da IA deve existir nos dois lugares** (IA do app e conector) e entrar neste mapa.
