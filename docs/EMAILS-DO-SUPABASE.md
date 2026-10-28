# E-mails do FARO (Supabase): passo a passo

Os e-mails de criar conta, redefinir senha etc. são enviados pelo Supabase e, de fábrica, vêm em inglês, com remetente "Supabase Auth". Isso se muda no painel (não dá por código): https://supabase.com/dashboard/project/dfrqgwpujodnwpbsgdrq

## 1. Endereço do site (resolve o "página não encontrada" / localhost:3000)
Authentication → URL Configuration:
- **Site URL:** `https://soufaro.app.br`
- **Redirect URLs** (Add URL, os dois): `https://soufaro.app.br/**` e `https://core-app-seven-gamma.vercel.app/**` (o endereço antigo continua funcionando e serve de reserva).

Sem isso o link do e-mail cai em `http://localhost:3000/?error=...`.

## 2. Textos em português
Authentication → Email Templates. Em cada modelo, trocar **Subject** e **Message body** (modo código-fonte). Os links usam `/auth/confirm`, que confere o código do próprio link e funciona em qualquer navegador ou aparelho (a pessoa pode criar a conta no computador e abrir o e-mail no celular).

### Confirm signup
Subject: `Bem-vindo ao FARO! Confirme seu e-mail`
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 12px">Seja bem-vindo ao FARO</h2>
  <p>Foco, Ação, Rotina e Objetivos. Falta só um passo: confirmar que este e-mail é seu.</p>
  <p style="margin:24px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar meu e-mail</a></p>
  <p style="font-size:13px;color:#666">Se o botão não abrir, copie este endereço no navegador:<br>{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup</p>
  <p style="font-size:13px;color:#666">Se você não criou uma conta no FARO, pode ignorar este e-mail.</p>
</div>
```

### Reset password
Subject: `FARO: redefinir sua senha`
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 12px">Redefinir sua senha</h2>
  <p>Recebemos um pedido para criar uma nova senha no FARO.</p>
  <p style="margin:24px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Escolher nova senha</a></p>
  <p style="font-size:13px;color:#666">Se não foi você, ignore este e-mail: a senha atual continua valendo.</p>
</div>
```

### Magic link
Subject: `Seu link de acesso ao FARO`
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 12px">Entrar no FARO</h2>
  <p style="margin:24px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Entrar</a></p>
  <p style="font-size:13px;color:#666">Se não foi você, ignore este e-mail.</p>
</div>
```

### Change email address
Subject: `FARO: confirme seu novo e-mail`
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 12px">Confirmar novo e-mail</h2>
  <p style="margin:24px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Confirmar</a></p>
</div>
```

### Invite user
Subject: `Você foi convidado para o FARO`
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 12px">Você foi convidado para o FARO</h2>
  <p style="margin:24px 0"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Aceitar convite</a></p>
</div>
```

## 3. Envio próprio de e-mail (NECESSÁRIO para pessoas de fora) e nome do remetente ("FARO" em vez de "Supabase Auth")
O envio que vem de fábrica no Supabase só entrega para e-mails de membros do time do projeto (erro `email_address_not_authorized` para o resto) e, no painel, a edição dos modelos pode ficar travada até haver SMTP próprio. O remetente padrão também não pode ser trocado. Para aparecer "FARO <algo@seudominio>", é preciso SMTP próprio: Authentication → Emails → SMTP Settings. Opção gratuita: Resend (3.000 e-mails/mês) com um domínio verificado (por exemplo `soufaro.app.br` ou `soufaro.app.br`). Isso também tira o limite baixo de e-mails por hora do plano gratuito.

## No código
- `src/app/auth/confirm/route.ts`: confere `token_hash` + `type` e entra; falha vai para `/login?erro=link`.
- `src/app/auth/callback/route.ts`: fluxo antigo com `code` (precisa ser o mesmo navegador).
- `src/lib/supabase/middleware.ts`: `/auth/*` é público (antes o link do e-mail era barrado e mandado ao /login sem entrar).
