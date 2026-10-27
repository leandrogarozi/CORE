"use client";

import { useEffect, type ReactNode } from "react";
import {
  BellIcon,
  BoltIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  ChecklistIcon,
  CommentIcon,
  DuplicateIcon,
  EditIcon,
  ExpandIcon,
  EyeOffIcon,
  FlagIcon,
  FollowIcon,
  GiftIcon,
  HeartIcon,
  InboxIcon,
  MicIcon,
  PaperclipIcon,
  PlayIcon,
  RepeatIcon,
  SendIcon,
  ShieldWarningIcon,
  SunIcon,
  TrashIcon,
  UserIcon,
  UsersGroupIcon,
  WhatsAppIcon,
} from "./icons";

interface Secao {
  id: string;
  titulo: string;
  linhas: string[];
  /** Ícones do app com o que cada um significa (o desenho é o mesmo que aparece nas telas). */
  icones?: { grupo: string; itens: [ReactNode, string][] }[];
}

/** Um bloco curto por assunto. Quem muda uma tela do FARO muda o bloco dela aqui. */
const SECOES: Secao[] = [
  {
    id: "dicas",
    titulo: "Facilidades que passam batido",
    linhas: [
      "Falar em vez de digitar: onde houver um microfone, toque nele e fale. O texto entra no campo. Vale para tarefa, lembrete, observação, ideia, sinapse, frase da Metanoia, item de lista e mais.",
      "Falar com o cachorrinho: toque nele, toque em “Toque e fale” e diga o que quer (“marca reunião com o João amanhã às 15h e me lembra 10 min antes”). Ele entende, mostra um cartão com o que vai fazer e só faz depois do seu OK.",
      "Buscar em tudo: o campo de busca do topo procura em tarefas, lembretes, livros e na Lixeira, e acha uma tarefa pelo ID.",
      "Criar rápido: a fileira Nova tarefa, Lembrete, Reunião e Ideia, no painel, leva direto ao campo certo.",
      "Em quase todo campo de “adicionar”, escreva e aperte Enter (ou o botão de enviar). Nos Lembretes e no sininho há um botão de enviar para o celular.",
      "Tamanho das listas: arraste a borda de uma lista de tarefas para mudar o tamanho; dois cliques voltam ao tamanho original.",
      "Cada tela tem o botão “Como funciona” no canto de cima. Ele abre esta página no assunto dela.",
      "Tudo que você escreve entra no backup diário. Excluiu sem querer? Veja a Lixeira.",
    ],
  },
  {
    id: "icones",
    titulo: "Ícones: o que cada um significa",
    linhas: ["Passe o mouse (ou segure o dedo) sobre um ícone no app e aparece o nome dele. Aqui está o guia dos que mais aparecem."],
    icones: [
      {
        grupo: "Na linha de uma tarefa (selos depois do título)",
        itens: [
          [<CalendarCheckIcon key="a" />, "Evento: compromisso com hora marcada."],
          [<FollowIcon key="b" />, "Rastreando: o FARO leva a tarefa para hoje todo dia até você concluir."],
          [<ShieldWarningIcon key="c" />, "Desafiadora (“dessa eu fujo”): adiar pede justificativa. O número mostra quantas vezes já foi adiada."],
          [<ChecklistIcon key="d" />, "Tópicos abertos: itens da lista da observação que ainda não foram marcados."],
          [<UsersGroupIcon key="e" />, "Em reunião: pautas em aberto. Na tarefa sem tag: “falta a tag”, escolha Reunião ou Evento."],
          [<UserIcon key="f" />, "Cliente da tarefa (com o nome ao lado)."],
          [<BookOpenIcon key="g" />, "Sessão de um plano de estudo."],
          [<BellIcon key="h" filled />, "A tarefa tem lembrete."],
          [<WhatsAppIcon key="i" filled />, "O lembrete avisa também no WhatsApp."],
          [<CommentIcon key="j" />, "A tarefa tem observação."],
          [<PaperclipIcon key="k" />, "A tarefa tem anexo."],
          [<RepeatIcon key="l" />, "Tarefa recorrente: ela se repete."],
        ],
      },
      {
        grupo: "Nos botões da linha da tarefa",
        itens: [
          [<FlagIcon key="m" color="var(--flag-alta)" />, "Bandeira de prioridade: vermelha é alta, azul é média, verde é baixa. Toque para mudar."],
          [<BoltIcon key="n" />, "Raios de velocidade, de 1 a 3: quanto mais raios, mais rápida de fazer."],
          [<PlayIcon key="o" />, "Play: começa a contar o tempo trabalhado na tarefa."],
          [<DuplicateIcon key="p" />, "Copiar tarefa: cria uma cópia."],
          [<TrashIcon key="q" />, "Excluir: manda para a Lixeira."],
        ],
      },
      {
        grupo: "No topo e nas telas",
        itens: [
          [<InboxIcon key="r" />, "Avisos: o que o FARO quis te contar (a IA propôs algo, criou algo)."],
          [<GiftIcon key="s" />, "Aniversários: acende quando há um chegando."],
          [<SunIcon key="t" />, "Tema claro e escuro (a lua faz o contrário). Vale só para este aparelho."],
          [<MicIcon key="u" />, "Microfone: toque e fale em vez de digitar."],
          [<SendIcon key="v" />, "Enviar: adiciona o que você escreveu (útil no celular)."],
          [<BellIcon key="w" />, "Sininho do lembrete: avisa no app e no celular. O ícone do WhatsApp ao lado manda mensagem."],
          [<ExpandIcon key="x" />, "Ampliar: abre a caixa de texto maior para escrever com folga."],
          [<EditIcon key="y" />, "Editar."],
          [<HeartIcon key="z" />, "Metanoia: favorita (fica vermelho). Aparece mais vezes."],
          [<EyeOffIcon key="za" />, "Metanoia: não mostrar mais. A frase vai para “Não listadas”, e dá para voltar."],
        ],
      },
    ],
  },
  {
    id: "painel",
    titulo: "Painel do dia",
    linhas: [
      "É a tela inicial: a saudação (com aniversários e tarefas atrasadas), o Seu dia (anel de concluídas), a Agenda, as Horas, o Registro do dia e a lista de tarefas.",
      "Escreva uma tarefa no campo “Adicionar tarefa e pressionar Enter”. As setas e os dias acima mudam a data que você vê; “Semana” e o Calendário mostram mais dias.",
      "Atrasadas: toque no aviso da saudação para ver todas no Dashboard.",
      "Agenda: alterna entre Dia (o que tem hora, em ordem do relógio) e Lembretes (os do dia, até os sem hora).",
      "Registro do dia: humor (e por quê), sono, água (com a sua estratégia) e dieta (marque as refeições que cumpriu e anote o que fugiu).",
      "“Rápidas primeiro”, em cima da lista, coloca as tarefas de + raios no topo (veja Tarefas por dentro).",
      "Em Configurações > Painéis da tela principal você liga e desliga cada painel; o que está desligado some, e o que você escreveu fica guardado.",
    ],
  },
  {
    id: "tarefas",
    titulo: "Tarefas por dentro",
    linhas: [
      "Toque numa tarefa para abri-la. Dentro: título, categorias (até 2), data e hora de início e de fim, observação, anexos, lembrete, projeto, cliente e ID.",
      "Status: toque no status para trocar (A iniciar, Executando, Agendado, Aguardando, Concluída). Você cria os seus em Configurações > Tarefas.",
      "Bandeira de prioridade: toque para mudar entre alta (vermelha), média (azul) e baixa (verde). As vermelhas ficam no topo e as verdes embaixo; as médias seguem a sua ordem.",
      "Raios (⚡ de 1 a 3): quanto mais raios, mais rápida de fazer. Toque no mesmo raio para tirar. O botão “Rápidas primeiro” ordena por eles.",
      "Arrastar: puxe a tarefa para reordenar. A que tem raio ou bandeira não-média é posicionada pela regra, não pelo arrasto.",
      "Play: o cronômetro conta o tempo que você trabalhou na tarefa, dia a dia. Dá para ver o tempo de cada dia e apagar o de um dia errado.",
      "Copiar tarefa: duplica a tarefa. Copiar o ID: cola o código (6 letras e números) num lembrete ou numa anotação, e a busca acha a tarefa por ele.",
      "Evento: desligado, é uma tarefa comum que pode mudar de dia; ligado, é um compromisso com hora marcada. Sem tag, o app pede para escolher entre Reunião e Evento.",
      "Rastrear (“Faro, rastreia!”): para tarefa de vários dias. Se o dia virar e ela não estiver concluída, o FARO a leva para hoje, mantendo status e horário, sem contar como adiamento nem atrasar.",
      "Desafiadora (“Dessa eu fujo”): adiar essa tarefa pede duas respostas, o motivo e a “historinha” que você conta a si mesmo. Dá para adiar do mesmo jeito; o que não dá é adiar em silêncio. Ela mostra quantas vezes já foi adiada.",
      "Observação: um editor com microfone, lista de tarefas, destaque e botão para ampliar a caixa. Itens abertos da lista numa reunião contam como “pauta aberta”.",
      "Anexos: junte arquivos à tarefa. O FARO também guarda o texto extraído do arquivo, que você pode consultar.",
      "Os ícones pequenos na linha mostram o que a tarefa tem: lembrete, anexo, observação, recorrência, projeto, cliente, rastreio.",
    ],
  },
  {
    id: "voz",
    titulo: "Falar com o FARO",
    linhas: [
      "Microfone nos campos: toque, fale e toque de novo (ou espere um pouco em silêncio). O texto aparece no campo e você confere antes de salvar.",
      "O microfone só aparece quando o seu navegador sabe ouvir. Se não aparecer, use o microfone do teclado do celular.",
      "Cachorrinho: toque e fale uma frase só. Depois de uns 3 segundos de silêncio, ou ao tocar de novo, ele envia. Pode pedir para criar tarefa, lembrete ou reunião, marcar tarefa como feita, acrescentar na anotação de uma tarefa, anotar um gasto, cadastrar um aniversário e registrar humor, sono, água e dieta.",
      "Ele nunca faz sozinho: sempre mostra um cartão com o que vai fazer e espera o seu OK.",
      "No celular o cachorrinho fica fechado; toque nele para abrir.",
    ],
  },
  {
    id: "busca",
    titulo: "Busca",
    linhas: [
      "O campo “Buscar em tudo” (no topo) procura em Tarefas, Lembretes, Livros e Lixeira. Escolha o escopo ou deixe em “Busca total”.",
      "Digite o ID de uma tarefa (as 6 letras e números) para achá-la direto.",
      "Na Lixeira você restaura ou exclui de vez.",
    ],
  },
  {
    id: "semana",
    titulo: "Semana e Calendário",
    linhas: [
      "Semana: os 7 dias lado a lado. Você adiciona tarefa direto no dia.",
      "Calendário: o mês inteiro; toque num dia para ir até ele ou numa semana para abrir a Semana.",
    ],
  },
  {
    id: "dashboard",
    titulo: "Dashboard",
    linhas: [
      "O resumo de um período: tarefas concluídas e pendentes por dia, tempo por categoria, atrasadas. Troque o período pelas setas.",
      "Os números de cima são botões: toque para ver as tarefas por trás deles.",
    ],
  },
  {
    id: "lembretes",
    titulo: "Lembretes",
    linhas: [
      "Todo lembrete tem data e hora. Em “Aviso” você escolhe quando avisar: no horário marcado ou um tempo antes (10 min, 1 hora, 1 dia...).",
      "O sininho avisa no app e no celular (notificação). O ícone do WhatsApp manda também uma mensagem. Só sai o que você ligar.",
      "O WhatsApp gasta o crédito da sua conta. O saldo aparece em Configurações > Custo do WhatsApp.",
      "Lembretes podem se repetir (todo dia, semana, mês) ou cair em dias da semana.",
      "Escreva ou fale o nome, escolha data e hora e toque no botão de enviar (o avião).",
      "Filtros em cima: Todos, Recorrentes, Hoje, Semana, Atrasados. Os que o FARO criou sozinho (de manutenção, aniversário, dieta...) ficam em “Vindos de outras telas”.",
      "Toda tarefa também pode ter um lembrete: no campo de data da tarefa.",
    ],
  },
  {
    id: "reunioes",
    titulo: "Reuniões",
    linhas: [
      "Reunião é uma tarefa com a tag reunião, listada aqui por data (ou por cliente).",
      "Em “Nova reunião”: título, cliente, dia e hora. Escolha ali mesmo “Lembrar...” e “Avisar no WhatsApp”, e o lembrete já nasce junto, sem ir a Lembretes.",
      "Dentro da reunião você escreve a pauta e as decisões; itens abertos viram “pauta aberta”. “Só com pauta em aberto” filtra as que ainda têm pendência.",
    ],
  },
  {
    id: "projetos",
    titulo: "Projetos",
    linhas: [
      "Agrupe tarefas de um mesmo objetivo em etapas (você escolhe o nome das etapas) e dê um prazo ao projeto.",
      "Cada projeto soma o tempo trabalhado nas suas tarefas. Toque no selo de projeto de uma tarefa para abrir o projeto.",
    ],
  },
  {
    id: "metanoia",
    titulo: "Metanoia",
    linhas: [
      "Metanoia é a mudança de mente. O FARO traz até você frases e perguntas poderosas durante o dia, numa fila em ordem sorteada, que só repete depois de mostrar todas.",
      "Sua conta já vem com frases. Você pode escrever as suas, colar uma lista ou subir prints (o print é lido no seu aparelho e descartado; fica só o texto).",
      "Em “Quando o FARO me lembra” você escolhe quantas frases e perguntas por dia (de 0 a 10) e o intervalo de horas. O FARO as espalha por igual entre o começo e o fim.",
      "O coração marca uma favorita, que aparece mais vezes. O olho riscado manda a frase para “Não listadas”: não aparece mais, mas dá para voltar. Excluir de vez só no editor.",
      "Na tela inicial um cartão mostra a frase do momento, com setinhas para ver a anterior e a próxima. Em Aparência você escolhe fundo branco, fundo preto, “Cor” (qualquer cor que quiser) ou “Degradê” (de uma cor para outra); o texto ajusta sozinho para ler bem.",
      "Não quer usar? Desligue a Metanoia em Configurações > Painéis do menu.",
    ],
  },
  {
    id: "conhecendo",
    titulo: "Conhecendo você",
    linhas: [
      "A ideia do FARO é ser o seu cérebro: tudo o que você cria e anota aqui faz o FARO te conhecer melhor. Esta tela guarda o que ele sabe sobre você: valores, objetivos, preferências, decisões, projetos.",
      "Depois, o backup de tudo isso serve para a sua IA te conhecer também. Para isso você precisa conectar o FARO à sua IA.",
      "Como trazer o que a sua IA já sabe: em “Trazer o que minha IA já sabe”, 1) copie o pedido e cole numa conversa nova da sua IA (Claude, ChatGPT...); 2) traga de volta o arquivo .md que ela criou, ou cole a resposta. Você revisa item por item em “Para revisar”; nada vale até você aprovar.",
      "Como deixar a IA lendo o FARO o tempo todo: em Configurações > Conexões você gera o seu link do Conector e cola na sua IA. Daí ela lê o que você aprovou, e pode propor aprendizados e criar tarefas e lembretes (sempre com a sua confirmação).",
      "O resumo “O que o FARO sabe sobre você” junta tudo o que você aprovou.",
      "Faça os seus backups sempre (Configurações > Dados e backup) para preservar todos os seus aprendizados.",
    ],
  },
  {
    id: "sinapses",
    titulo: "Novas Sinapses",
    linhas: [
      "Uma sinapse é um aprendizado que mudou uma crença sua. Cada uma tem o que você aprendeu e a pergunta que reconecta você com ele.",
      "Escreva logo depois de aprender algo, pelo teclado ou pelo microfone. Daqui a um tempo, a pergunta traz o aprendizado de volta.",
      "Dá para baixar uma sinapse como arquivo de texto (.md).",
    ],
  },
  {
    id: "ideias",
    titulo: "Ideias e Estudos",
    linhas: [
      "Ideias são insights rápidos (escreva ou fale). Estudos são ideias com partes (aulas, encontros, módulos), cada parte com data, tipo e anotações.",
      "Filtre por tag para achar depois. Tudo isso entra no backup.",
    ],
  },
  {
    id: "livros",
    titulo: "Livros, filmes e séries",
    linhas: [
      "Três abas: Livros, Filmes e Séries, com os status Para ler/assistir, Lendo/Assistindo e Concluído. Arraste para reordenar a fila.",
      "No botão de comentário você anota o que aprendeu. Concluído e com anotações, dá para enviar para Estudos ou para uma Nova Sinapse.",
      "Dá para baixar o resumo de um item como arquivo (.md).",
    ],
  },
  {
    id: "estudo",
    titulo: "Plano de Estudo",
    linhas: ["Organize um estudo em sessões com data. O FARO gera as sessões no calendário e você reajusta quando a rotina muda."],
  },
  {
    id: "aniversarios",
    titulo: "Aniversários",
    linhas: [
      "Lista de amigos, família e clientes, com data, categoria, ano de nascimento (opcional), WhatsApp e anotação (gostos, assunto da última conversa).",
      "O lembrete anual chega às 9h do dia, e o WhatsApp é opcional (gasta crédito). Busque por nome, telefone ou anotação.",
      "Frases prontas: quatro frases por pessoa, com o nome dela no lugar certo. Escolha uma ou escreva a sua; depois que uma é enviada, a pessoa passa para a próxima da fila.",
      "O bolinho no topo acende quando há aniversário chegando.",
    ],
  },
  {
    id: "medicamentos",
    titulo: "Medicamentos",
    linhas: [
      "Cadastre remédio recorrente (horários, observação) ou um tratamento com vários remédios e duração. Em tratamento, escolha se todos tocam no mesmo horário ou cada um no seu.",
      "O FARO avisa nos horários cadastrados, e o ícone do WhatsApp liga o aviso por mensagem (10 min antes).",
    ],
  },
  {
    id: "dieta",
    titulo: "Dieta",
    linhas: [
      "Cole ou escreva o plano que você segue e cadastre as refeições com horário e dias.",
      "Em cada refeição você escreve como quer receber o texto do lembrete (só o título, as calorias, a divisão...).",
      "Durante o dia marque o que cumpriu no Registro do dia e anote o que fugiu do plano.",
    ],
  },
  {
    id: "manutencao",
    titulo: "Manutenção",
    linhas: [
      "Itens da casa e do carro que se repetem (trocar filtro, revisão). Você diz de quanto em quanto tempo, e o FARO avisa para comprar e para fazer.",
      "Para carro e moto, registre o odômetro (km). Cada item guarda o histórico de quando foi feito, onde e quanto custou.",
      "Cada item tem sininhos para escolher o que avisa dentro do app.",
    ],
  },
  {
    id: "compras",
    titulo: "Compras",
    linhas: ["Listas de compras por assunto, com links (vídeo, produto) e um lembrete de quantos dias depois relembrar de comprar. Marque o que já comprou; o que sobra fica para a próxima ida."],
  },
  {
    id: "checklists",
    titulo: "Checklists",
    linhas: [
      "Listas de passos que você repete (viagem, abertura da loja...). Marque os itens e arraste para reordenar.",
      "Um checklist também guarda os gastos (no que gastou, quanto e quando) e as anotações (reservas, endereços, links).",
    ],
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    linhas: [
      "Aparência: cor do fundo. Tarefas: tags e status. Painéis da tela principal e Painéis do menu: ligue só o que você usa.",
      "Avisos e custos: notificações no celular, WhatsApp e seu crédito, custo da IA.",
      "Dados e backup: o FARO guarda uma cópia sua todo dia, e você pode baixar a sua própria cópia quando quiser.",
      "Canal de feedback: conte um problema, uma ideia, uma dúvida ou um elogio. Também está no menu.",
      "Tema claro ou escuro: o botão da lua/sol, no topo, vale só para este aparelho.",
    ],
  },
  {
    id: "notificacoes",
    titulo: "Notificações no celular",
    linhas: [
      "No iPhone, primeiro instale o FARO na tela de início (Compartilhar > Adicionar à Tela de Início) e abra por lá. No Android e no computador, basta permitir quando o navegador perguntar.",
      "Depois vá em Configurações > Avisos e custos e ligue as notificações. Use “testar notificação” para conferir.",
      "Janela anônima do navegador não permite notificações.",
      "A caixinha de Avisos, no topo, guarda tudo o que o FARO quis te contar (a IA propôs algo, criou algo) até você ler.",
    ],
  },
  {
    id: "backup",
    titulo: "Backup",
    linhas: [
      "Todo dia o FARO tira uma cópia de tudo que é seu e guarda as últimas 14.",
      "Em Configurações > Dados e backup você também baixa uma cópia sua, em texto, para guardar onde quiser (no seu Drive, por exemplo). Uma vez por semana o FARO lembra você de baixar.",
    ],
  },
  {
    id: "ia",
    titulo: "A IA e o cachorrinho",
    linhas: [
      "O FARO foi feito para ficar ligado à sua IA. Ele guarda o que você aprende e anota; a sua IA, conectada, lê isso, passa a te conhecer e trabalha junto com você.",
      "Com a IA conectada ela pode lançar lembretes e tarefas mais rápido (por voz ou texto), resumir a sua semana, perguntar se você esqueceu alguma coisa e propor o que aprendeu sobre você, sempre pedindo o seu OK.",
      "O cachorrinho no canto da tela é o assistente dentro do app: toque para abrir e fale ou escreva. Ele depende da IA: sem IA conectada ele não funciona. Para conectar, siga o passo a passo em Conhecendo você e em Configurações > Conexões.",
      "Nesta fase de teste inicial, o cachorrinho já responde usando a IA do FARO, dentro de um limite mensal por pessoa. Mais para a frente ele passa a usar a sua própria IA, e o custo aparece em Configurações > Custo da IA.",
      "Ele também pode te puxar no meio do dia (por exemplo, para registrar o humor), no máximo duas vezes por dia.",
    ],
  },
];

/**
 * Tela de texto com um bloco por assunto. Chega aqui pelo item “Como usar” do menu ou pelo “?” no topo de cada
 * tela, que leva direto ao bloco dela.
 */
export function TutorialView({ onBack, secao }: { onBack: () => void; secao?: string | null }) {
  useEffect(() => {
    if (!secao) return;
    const t = setTimeout(() => document.getElementById("tut-" + secao)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => clearTimeout(t);
  }, [secao]);

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Como usar o FARO</span>
        <span style={{ width: 32 }} />
      </div>
      <div className="narrow-list tutorial">
        <p className="hint-text">Um bloco curto por assunto. Toque num assunto para pular até ele. Em cada tela do FARO, o botão “Como funciona”, no canto de cima, abre esta página no assunto dela.</p>
        <div className="tutorial-indice">
          {SECOES.map((s) => (
            <button key={s.id} type="button" className="btn btn-ghost" onClick={() => document.getElementById("tut-" + s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              {s.titulo}
            </button>
          ))}
        </div>
        {SECOES.map((s) => (
          <section key={s.id} id={"tut-" + s.id} className={"list-card tutorial-bloco" + (secao === s.id ? " em-foco" : "")}>
            <h2>{s.titulo}</h2>
            <ul>
              {s.linhas.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            {s.icones?.map((g) => (
              <div key={g.grupo} className="tutorial-icones">
                <h3>{g.grupo}</h3>
                {g.itens.map(([icone, texto], i) => (
                  <div key={i} className="tutorial-icone-linha">
                    <span className="tutorial-icone">{icone}</span>
                    <span>{texto}</span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
