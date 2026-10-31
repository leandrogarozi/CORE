# Vídeos do FARO: visão geral

Versão de 01/11/2026. Os **roteiros completos** (cena por cena, com tempo e narração) estão em `VIDEO-COMO-USAR.md` (neste pacote). Este arquivo é a visão: para que servem, como produzir e o que falta.

## 1. Para que servem
1. **Boas-vindas** (≈ 55 s): o que é o FARO, para quem, por que existe, e a promessa do passo a passo. Abre o site e o "Como usar" do app.
2. **12 capítulos de 30 a 40 s**, um por assunto, na ordem do menu do app. Cada capítulo mostra uma parte e termina pronto para o usuário tentar.
3. **Reaproveitamento:** os mesmos vídeos entram (a) no site, nas seções correspondentes, (b) na tela "Como usar" do app, com um botão "Ver em vídeo" em cada assunto (a fazer), (c) em convites e redes (cortes de 6 a 15 s).

## 2. Capítulos
`cap-01-hoje` · `cap-02-lembretes` · `cap-03-reunioes-e-projetos` · `cap-04-faro-por-voz` · `cap-05-anotacoes` · `cap-06-dispensa` · `cap-07-manutencao` · `cap-08-dieta-agua-medicamentos` · `cap-09-aprender` · `cap-10-livros-e-plano-de-estudo` · `cap-11-compras-checklists-aniversarios` · `cap-12-avisos-e-configuracoes`.
**Para depois:** Dashboard, Semana e Calendário, Backup e Google, Canal de feedback.

## 3. Formato e estilo
- **Vertical 9:16** (1080×1920) como principal (o app é de celular); versão 16:9 só se o site pedir.
- **Só motion graphics** com narração (sem pessoas gravadas), legenda queimada sempre ligada, ritmo de narração ≈ 150 palavras por minuto.
- **Visual:** idêntico ao app de hoje (cores, cartões flutuantes, botões redondos, sino roxo e WhatsApp verde, mascote). Ver `04-BRANDING-MAPA.md`.
- **Movimento:** suave e curto (200 a 400 ms); cartão entra de baixo; botão "liga" mudando de cinza para o degradê; sem efeito exagerado.
- **Tom da narração:** direto, caloroso, frases curtas, português do Brasil; sem jargão técnico; sem exagero ("revolucionário", "incrível").

## 4. Regras de conteúdo
- **Dados de exemplo inventados** nas telas. Nunca aparecer tarefa, cliente, telefone, remédio, e-mail ou nome real do dono.
- **Telas reais de hoje.** As pranchas de design antigas têm layouts velhos; não usar. Fonte: capturas do app em produção com uma **conta de demonstração** (a criar; ver `VIDEO-COMO-USAR.md`, seção 5) em `design/video/telas/`.
- Não prometer o que não existe (ver seção 8 do `01-FARO-VISAO-GERAL.md`).
- Cada capítulo exporta também **o texto da narração em arquivo à parte** (um por capítulo), para gerar a voz.

## 5. Pipeline sugerido
1. Dono responde às 4 perguntas de origem (documento 01, seção 7) → escrevo/ajusto a cena 3 das boas-vindas.
2. Capturar as telas reais (conta de demonstração) e montar `design/video/telas/` + `manifesto.json`.
3. Projeto de comunicação cria o **storyboard** de cada capítulo (um quadro por cena) e o dono aprova.
4. Animação (motion) em cima das capturas reais; recriar em código só elementos simples (cartão, botão, sino).
5. Voz gerada à parte; sincronizar; legendar.
6. Entregar MP4 + WebM + poster + arquivo de narração + legenda `.srt`.
7. **Manutenção:** o FARO muda toda semana. Quando uma tela mudar, refazer só o capítulo dela. O arquivo `06-NOVIDADES-DO-PRODUTO.md` diz o que mudou.

## 6. Decisões em aberto
- [ ] Voz (qual, e se é a do próprio Leandro clonada ou uma voz neutra).
- [ ] Formato final (9:16 sugerido).
- [ ] Frase "por que criei o FARO".
- [ ] OK para a conta de demonstração e as capturas.
- [ ] Música (se houver): estilo e licença.
- [ ] Onde os vídeos ficam hospedados (arquivo no site, ou serviço de vídeo).
