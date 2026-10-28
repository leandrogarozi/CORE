# Cadastro de clientes pelas LPs (endpoint público do FARO)

Várias páginas (uma por produto) em `https://cadastro.leandrogarozi.com.br` enviam dados de clientes novos para **uma única tabela** do FARO. O aniversário de cada cadastro novo entra na lista de **Aniversários**, e o FARO avisa o Leandro (caixa **Avisos** + push).

## Endereço

```
POST https://soufaro.app.br/api/cadastro
Content-Type: application/json
```

Chave pública da conta do Leandro (pode ficar no código da página; ela só deixa ENVIAR cadastros para ele, nunca ler):

```
faro_cad_a5db8af040e04e04a673d1d8
```

Se a página não mandar `chave`, o servidor usa o único dono ativo. Mandar a chave é o recomendado (separa contas no futuro).

## Formato do JSON

| Campo | Obrigatório | Regra |
|---|---|---|
| `produto` | **sim** | texto curto em minúsculas: letras, números, `-` ou `_` (ex.: `devolutiva`, `workshop`) |
| `nome` | **sim** | 2 a 120 caracteres |
| `email` | **sim** | e-mail válido (letras, números e `. _ % + ' -`) |
| `consentimento` | **sim** | `true` (boolean; a string `"true"` NÃO vale) |
| `whatsapp` | não | DDD + número, com ou sem máscara. O servidor guarda só dígitos com 55 na frente |
| `aniversario` | não | `AAAA-MM-DD`, data real, de 1900 até hoje |
| `respostas_extras` | não | objeto simples (até 20 campos; valores texto, número, booleano ou lista de textos; até 6000 caracteres) |
| `origem` | não | de qual página veio (até 120 caracteres) |
| `texto_consentimento` | não | o texto exato que a pessoa aceitou (guardado como prova, até 600 caracteres) |
| `chave` | não | a chave pública acima |
| `website` | não | **campo-isca**: deixe escondido e vazio na página. Se vier preenchido, é robô: o servidor responde "ok" e não grava nada |
| `teste` | não | `true` valida tudo e **não grava** (é o "endereço de teste" para a LP-molde) |

Exemplo:

```json
{
  "chave": "faro_cad_a5db8af040e04e04a673d1d8",
  "produto": "devolutiva",
  "nome": "Maria da Silva",
  "email": "maria@exemplo.com",
  "whatsapp": "(27) 99999-8888",
  "aniversario": "1990-03-15",
  "consentimento": true,
  "texto_consentimento": "Aceito receber contato do Leandro Garozi sobre este produto.",
  "respostas_extras": { "interesse": "liderança", "turma": "B" },
  "origem": "lp-devolutiva",
  "website": ""
}
```

## Respostas

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{"ok":true}` | gravado (ou cadastro repetido atualizado) |
| 200 | `{"ok":true,"teste":true,"normalizado":{...}}` | com `teste:true`: validou e mostra como ficaria |
| 400 | `{"ok":false,"campo":"email","erro":"E-mail inválido."}` | campo inválido (`campo` diz qual) |
| 400 | `{"ok":false,"erro":"Chave do cadastro inválida."}` | chave errada |
| 403 | `{"ok":false,"erro":"Origem não permitida."}` | chamada de uma página fora de `cadastro.leandrogarozi.com.br` |
| 429 | `{"ok":false,"erro":"Muitas tentativas..."}` | limite de envios (8 por IP em 10 min; 300 no total por hora) |
| 500 | `{"ok":false,"erro":"Não foi possível salvar agora..."}` | falha no banco |

A resposta **nunca** diz se a pessoa já estava cadastrada.

Teste rápido (não grava):

```bash
curl -s -X POST https://soufaro.app.br/api/cadastro \
  -H "Content-Type: application/json" -H "Origin: https://cadastro.leandrogarozi.com.br" \
  -d '{"produto":"devolutiva","nome":"Teste","email":"teste@exemplo.com","consentimento":true,"teste":true}'
```

Na página (JavaScript):

```js
const r = await fetch(ENDERECO, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
const j = await r.json();
if (!j.ok) mostrarErro(j.campo, j.erro);
```

## O que acontece quando chega um cadastro

1. Confere o limite de envios e o campo-isca.
2. Valida e normaliza (nome limpo, e-mail em minúsculas, WhatsApp só dígitos com 55).
3. Grava em `clientes_cadastro` (RLS ligado, **sem leitura pública**). O horário do consentimento é carimbado pelo servidor.
4. **Cliente repetido** (mesmo e-mail ou mesmo WhatsApp): **não duplica**. Atualiza o mesmo registro: soma o produto em `produtos`, guarda as respostas em `respostas_extras.<produto>`, conta `envios`. Dados pessoais já guardados (nome, WhatsApp, aniversário) **não são sobrescritos** por um novo envio (a página é pública: sem isso qualquer um trocaria o telefone de outra pessoa só sabendo o e-mail); o novo envio só preenche o que estava vazio. O consentimento e a hora originais são preservados.
5. Se veio aniversário, cria a pessoa em **Aniversários** (categoria *cliente*, lembrete anual às 9h, nota "Veio do cadastro…"). Se já existe alguém com o mesmo nome na lista, **não mexe**.
6. Avisa o Leandro: caixa **Avisos** e notificação.

## Tabelas

- `clientes_cadastro`: `id`, `user_id` (dono), `criado_em`, `atualizado_em`, `produto` (último), `produtos[]` (todos), `nome`, `whatsapp`, `email`, `email_norm`, `whatsapp_norm`, `aniversario`, `consentimento`, `consentimento_em`, `consentimento_texto`, `respostas_extras` (jsonb, uma chave por produto), `origem`, `envios`, `birthday_id` (o aniversário criado a partir dele). Único por (`user_id`, `email_norm`).
- `cadastro_dono`: quem recebe os cadastros (`user_id`) e a `chave` pública.
- `cadastro_tentativas`: controle de limite por IP (guarda só um embaralhado do IP, apagado depois de 1 dia).

## Privacidade (LGPD)

- Guarda o consentimento (sim/não, quando, e o texto aceito, se a página mandar).
- **Apagar uma pessoa:** `POST /api/cadastro/apagar` (só o dono, logado no FARO) com `{ "email": "..." }` ou `{ "whatsapp": "..." }` ou `{ "id": "..." }`. Apaga **de verdade** a linha do cadastro e também o aniversário e o lembrete que ela gerou. Ainda não há botão na tela; hoje se chama por essa rota (ou pelo painel do Supabase).
- O dono vê os próprios cadastros pelo painel do Supabase ou, no futuro, por uma tela "Clientes".

## Separar do FARO (para quando outras pessoas usarem o app)

O cadastro é um pacote isolado, pensado para sair fácil:

- Código: `src/lib/cadastro/` e `src/app/api/cadastro/`. Nada do resto do app depende deles.
- **A única ponte com o FARO** é `src/lib/cadastro/sincronizar.ts` (leva o aniversário para a lista). Para desligar a ligação com Aniversários basta não chamar essa função em `processar.ts`; o cadastro continua gravando normalmente.
- Dados: três tabelas próprias (`clientes_cadastro`, `cadastro_dono`, `cadastro_tentativas`). Para remover tudo: apagar essas tabelas e as duas pastas acima.
- **Cada usuário do FARO** pode ter o próprio cadastro: basta uma linha em `cadastro_dono` por usuário, cada uma com sua `chave`. A página de cada pessoa manda a chave dela e os cadastros caem só na conta certa. Hoje há uma linha só (a do Leandro).
- O que NÃO é do cadastro e continua sendo do FARO: a lista de Aniversários, a caixa de Avisos e o push (o cadastro só escreve nelas).

## Subdomínio `cadastro.leandrogarozi.com.br`

O endpoint **não precisa** do subdomínio para funcionar: roda no endereço do FARO. O subdomínio é só onde as **páginas** (LPs) ficam, e é por isso que o CORS só aceita essa origem. Onde criar depende de onde as LPs vão ficar:

- **Páginas estáticas na Hostinger** (onde o site está): no painel da Hostinger, Domínios → `leandrogarozi.com.br` → Subdomínios → criar `cadastro` e subir os arquivos da LP nele.
- **Páginas na Vercel** (um projeto à parte, ex.: `cadastro-lps`): no projeto → Settings → Domains → adicionar `cadastro.leandrogarozi.com.br`; a Vercel mostra um registro **CNAME** (`cadastro` → `cname.vercel-dns.com`) para criar no DNS de onde o domínio está (Hostinger, se os DNS forem de lá).

Em qualquer caso, a página precisa ser servida em **HTTPS** nesse endereço, senão o endpoint recusa (CORS).

## Links por pessoa (`codigo`) e leitura das perguntas (a partir de 18/10)

Cada pessoa tem o seu link: `https://cadastro.leandrogarozi.com.br/<codigo>` (ex.: `witt-flaviana`). Os links são criados em **Cadastros** no FARO e ficam na tabela `cadastro_links`.

### Ler a configuração do link

```
GET https://soufaro.app.br/api/cadastro/config?c=<codigo>
```

Mesmo CORS do POST. Resposta:

```json
{ "ok": true, "ativo": true, "respondido": false, "eyebrow": "...", "titulo": "...", "boas_vindas": "...",
  "tamanho_texto": "m", "campos": { "nome": true, "email": true, "whatsapp": true, "aniversario": true },
  "perguntas": [ { "id": "cargo", "texto": "Qual o seu cargo?", "tipo": "texto", "opcional": false, "instrucao": "pode ser curto" } ] }
```

- Código inexistente ou desativado: `{ "ok": true, "ativo": false }` (não diz qual dos dois).
- Link que já atingiu o limite de respostas: `"respondido": true` (a página mostra "Já recebemos as suas respostas") e `perguntas` vem vazia.
- Limite de 60 consultas por IP a cada 10 minutos (`429` depois).
- `tipo` das perguntas: `texto` (resposta curta, uma linha) ou `longo` (parágrafo). As respostas são sempre frases digitadas; qualquer tipo desconhecido, trate como `texto`. `instrucao` é a observação que aparece abaixo da pergunta.
- `campos` diz o que pedir da pessoa: nome e e-mail sempre; `whatsapp` e `aniversario` podem vir `false` (a página esconde o campo). `tamanho_texto` (`p`, `m` ou `g`) é o tamanho da mensagem de boas-vindas (`boas_vindas` vazio = sem mensagem de abertura).

### Enviar as respostas

O POST de sempre, com o campo novo `codigo`; as respostas vão em `respostas_extras`, **uma chave por `id` de pergunta**:

```json
{ "codigo": "witt-flaviana", "nome": "...", "email": "...", "whatsapp": "...", "aniversario": "1988-05-20",
  "consentimento": true, "respostas_extras": { "cargo": "Gerente" }, "chave": "faro_cad_...", "website": "" }
```

- `produto` passa a ser opcional quando há `codigo` (o servidor usa o cliente do link). Páginas antigas com `produto`/`?p=` continuam iguais.
- Só valem as respostas cujo `id` é do link (o resto é descartado); pergunta obrigatória sem resposta devolve `400` com `campo` = id da pergunta.
- Link inexistente/desativado: `400 {ok:false, ativo:false}`. Link que já atingiu o limite: **`409 {ok:false, respondido:true}`**.
- `teste:true` valida tudo (inclusive o link) e não grava nem gasta a vaga do link.
- Aniversário: o cadastro **não** lança a data sozinho em Aniversários. A resposta gera UM aviso ("Novo cadastro: X", abre Clientes). Na ficha, o botão **Jogar para Aniversários** (`POST /api/cadastro/lancar-aniversario`) cria a pessoa em Aniversários como **aguardando confirmação** (`birthdays.aguardando_confirmacao`, sem lembrete anual), cria a tarefa de conferir (lembrete de hoje, `source_stage = cadastro:<id>`) e só então gera o aviso "Novo aniversariante". **Confirmar cliente** liga o lembrete das 9h.
- Gravando: a resposta fica ligada à pessoa (`clientes_cadastro.respostas_extras[<codigo>]`), o link é marcado como respondido (`respondido_em`, `respostas_count`, `cliente_id`) e a data de nascimento fica na ficha (vai para Aniversários quando o Leandro aperta "Jogar para Aniversários"). A vaga do link é reservada antes de gravar (dois envios ao mesmo tempo não passam do limite) e devolvida se a gravação falhar.

## "Não enviar"

`clientes_cadastro.nao_enviar` (padrão falso) e `nao_enviar_em`. Liga/desliga na tela **Clientes**. Todo envio do FARO confere a marca antes (`src/lib/cadastro/nao-enviar.ts`): o ponto único de saída do WhatsApp (`callWhatsAppApi`, em `src/lib/whatsapp/send.ts`) recusa o número marcado, e o botão "Mandar parabéns" de Aniversários some para a pessoa marcada. **Quem criar um envio novo (e-mail, por exemplo) precisa chamar `conferirEmail` / `conferirNumero`.** Uma resposta nova pelo site nunca desmarca.

## Planilhas (CSV) e backup

- Botão de baixar nas telas **Clientes** e **Cadastros**: todas as colunas, uma coluna por pergunta, e a marca de não enviar.
- Backup: área **CRM clientes** (liga/desliga em Configurações → Backup de aprendizado): `CRM clientes/Clientes.csv`, `Links de cadastro.csv` e `crm-clientes.json` no Drive (mesma rodada automática do Mac). O backup completo em JSON (`faro-backup-*.json`) também leva `clientes_cadastro` e `cadastro_links`.
- Restaurar: `POST /api/backup/restaurar-crm` (logado) com o conteúdo de `crm-clientes.json` ou do backup completo. Grava por `id` (rodar duas vezes não duplica) e só com o dono de quem restaura.
