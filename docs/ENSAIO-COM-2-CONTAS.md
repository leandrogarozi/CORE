# Ensaio com 2 contas (antes de convidar os testadores)

Objetivo: ver o FARO funcionando para uma pessoa de fora, do cadastro ao backup. Tempo: ~40 min. Precisa de: a sua conta (dono), uma conta de teste nova, um celular.
Dica: para a conta de teste use um e-mail com "+" do Gmail, por exemplo `leandrogarozi+teste1@gmail.com` (chega na sua caixa, mas é uma conta nova para o FARO).

## A. Cadastro e e-mail
1. Em janela anônima (ou outro navegador), abra `https://soufaro.app.br` > **Criar conta**, e-mail de teste, senha de 8+ caracteres, aceite os termos.
2. Confira: o e-mail de confirmação chegou? Em português? Remetente "FARO" (nao-responda@mail.soufaro.app.br)? Não caiu no spam?
3. Abra o link do e-mail **no celular**. Deve entrar direto no FARO, sem "página não encontrada" nem localhost.

## B. Primeiro acesso
4. Aparece a tela de boas-vindas (teste inicial, erros possíveis, canal de feedback) e os 3 passos? Dá para pular o WhatsApp?
5. A conta já vem com frases na Metanoia (aprovadas), status das tarefas e cartão da frase na tela inicial?
6. Em **Configurações > Painéis do menu**, os 4 blocos abrem e fecham e as chaves funcionam?

## C. Uso do dia a dia
7. Crie uma tarefa com hora e **lembrete (sininho)** para daqui a 3 minutos. O aviso chegou no celular **com o app fechado**? (Instale o app antes: Tutorial > "Instalar o FARO" e ligue as notificações.)
8. Crie uma reunião com um convidado (o seu e-mail principal) **depois de conectar o Google** nesta conta (Configurações > Conexões). Apareceu o aviso "O Google não verificou este app"? Deu para seguir (Avançado > Acessar FARO)? O evento e o convite chegaram?
9. Fale com o cachorrinho: "como instalo o app?" e "marca reunião amanhã às 15h". Respondeu e pediu confirmação antes de criar?

## D. WhatsApp (só se for testar)
10. Cadastre o número do testador como destinatário no painel da Meta. Ative o aviso por WhatsApp em um lembrete e confira se chegou e se o crédito baixou.

## E. Isolamento e dono
11. Na conta de teste: **não** aparece nada seu (tarefas, frases, Conhecendo você). Não aparece a área "Particular do dono" nem o restaurador.
12. Na sua conta: nada da conta de teste aparece.

## F. Dados e segurança
13. Conta de teste: Configurações > Dados e backup > baixar o backup completo (.json). Abre? Tem as suas tarefas?
14. No dia seguinte, pedir ao Claude para conferir se a cópia diária da conta de teste foi criada (`faro_backups_internos`).
15. **Canal de feedback**: envie uma mensagem de teste. Chegou (ver em Feedback)?

## O que anotar
Para cada item: ok, ou o que deu errado (print + horário). Qualquer falha de 1 a 4 impede convidar testadores; as demais podem ser corrigidas durante o teste.
