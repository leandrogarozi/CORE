# Conectar com o Google: passo a passo no Google Cloud (Leandro, ~15 min)

Use o MESMO projeto do Google Cloud onde você já criou a conta de serviço da Agenda.

## 1. Agenda ligada
APIs e serviços > Biblioteca > "Google Calendar API" > Ativar (se já estiver ativa, ok).

## 2. Tela de permissão (Google Auth Platform)
1. Menu > **Google Auth Platform** (ou APIs e serviços > Tela de permissão OAuth). Se pedir "Começar":
   - Nome do app: **FARO**. E-mail de suporte: o seu.
   - Público-alvo: **Externo**. E-mail de contato: o seu. Aceite os termos e crie.
2. **Branding**: logo opcional. Link da página inicial `https://soufaro.app.br` (ou o da Vercel por enquanto); política de privacidade: a do FARO (`/privacidade`, se já existir) .
3. **Acesso a dados (Escopos)** > Adicionar ou remover escopos: marque
   - `.../auth/calendar.events`
   - `.../auth/calendar.calendarlist.readonly`
   Salve.
4. **Público-alvo (Audience)**: o status começa em "Em teste". **Clique em "Publicar app" (Em produção).**
   - NÃO precisa pedir a verificação agora. App em produção sem verificação funciona para até 100 pessoas, com o aviso "O Google não verificou este app" (a pessoa toca em Avançado > Acessar FARO).
   - Por que não deixar "Em teste": nesse modo a autorização de cada pessoa **vence em 7 dias** e todo mundo teria que reconectar toda semana.

## 3. Cliente OAuth
Clientes > **Criar cliente** > tipo **Aplicativo da Web** > nome "FARO web".
- **URIs de redirecionamento autorizados** (os dois, exatamente assim):
  - `https://core-app-seven-gamma.vercel.app/api/google/callback`
  - `https://soufaro.app.br/api/google/callback`
- Criar. Copie o **ID do cliente** e a **Chave secreta do cliente**.

## 4. Vercel (projeto core-app > Settings > Environment Variables, ambiente Production)
- `GOOGLE_OAUTH_CLIENT_ID` = o ID do cliente
- `GOOGLE_OAUTH_CLIENT_SECRET` = a chave secreta
Depois: Deployments > o último > Redeploy (variável nova só vale em deploy novo).

## 5. Testar
FARO > Configurações > Conexões > Agenda do Google > Conectar com o Google. Crie uma reunião com um convidado (outro e-mail seu) e confira o convite.

## Depois, para abrir ao público
Pedir a **verificação do app** (Google Auth Platform > Verification Center): exige política de privacidade, domínio próprio e vídeo mostrando o uso da agenda. Leva de dias a semanas.
