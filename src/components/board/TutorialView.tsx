"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TUTORIAL } from "@/lib/tutorial";
import {
  ArchiveIcon,
  BellIcon,
  BoltIcon,
  BookIcon,
  BookOpenIcon,
  BookmarkIcon,
  CalendarCheckIcon,
  CarIcon,
  CartIcon,
  ChartIcon,
  CheckCircleIcon,
  ChecklistIcon,
  ChevronIcon,
  ClockIcon,
  CommentIcon,
  DownloadIcon,
  DuplicateIcon,
  EditIcon,
  ExpandHorizontalIcon,
  ExpandIcon,
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  FolderIcon,
  FollowIcon,
  GiftIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  MealIcon,
  MenuIcon,
  MicIcon,
  MoonIcon,
  PaperclipIcon,
  PillIcon,
  PlayIcon,
  RepeatIcon,
  RtQuoteIcon,
  RtThoughtIcon,
  SearchIcon,
  SendIcon,
  SettingsIcon,
  ShieldWarningIcon,
  SunIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  UsersGroupIcon,
  WeekIcon,
  WhatsAppIcon,
} from "./icons";

/** Os desenhos dos ícones ficam aqui; o texto de cada bloco está em lib/tutorial.ts. */
const ICONES_DO_TUTORIAL: Record<string, { grupo: string; itens: [ReactNode, string][] }[]> = {
  icones: [
      {
        grupo: "Na linha de uma tarefa (selos depois do título)",
        itens: [
          [<CalendarCheckIcon key="a" />, "Evento: compromisso com hora marcada."],
          [<FollowIcon key="b" />, "Rastreando: o FARO leva a tarefa para hoje todo dia até você concluir."],
          [<ShieldWarningIcon key="c" />, "Desafiadora (“dessa eu fujo”): adiar pede justificativa. O número mostra quantas vezes já foi adiada."],
          [<ChecklistIcon key="d" />, "Tópicos abertos: itens da lista da observação da tarefa que ainda não foram marcados (o número é quantos faltam). No Dashboard, o quadro “Tópicos abertos” soma todos e mostra a lista das tarefas que ainda têm pendência."],
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
          [<MenuIcon key="zm" />, "Menu: abre a lista de telas do FARO (no celular fica escondido até você tocar)."],
          [<ExpandHorizontalIcon key="zx" />, "Usar a tela toda: abre o FARO na largura inteira do computador. Toque de novo para voltar à largura normal."],
          [<WeekIcon key="zc" />, "Calendário: o mês inteiro, para ir a um dia ou semana."],
          [<SettingsIcon key="zs" />, "Configurações: painéis, notificações, WhatsApp, custos, backup, feedback."],
          [<UserIcon key="zp" />, "Perfil: seu nome, data de nascimento e WhatsApp."],
          [<InboxIcon key="r" />, "Avisos: o que o FARO quis te contar (a IA propôs algo, criou algo)."],
          [<GiftIcon key="s" />, "Aniversários: acende quando há um chegando."],
          [<SunIcon key="t" />, "Modo claro: aparece quando o app está escuro, e muda para o claro. Vale só para este aparelho."],
          [<MoonIcon key="tm" />, "Modo escuro: aparece quando o app está claro, e muda para o escuro."],
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
};

/** O ícone de cada assunto: o mesmo no atalho de cima e no cartão. */
const ICONE_DO_ASSUNTO: Record<string, ReactNode> = {
  dicas: <BoltIcon />,
  icones: <EyeIcon />,
  painel: <HomeIcon />,
  instalar: <DownloadIcon />,
  tarefas: <ChecklistIcon />,
  categorias: <TagIcon />,
  voz: <MicIcon />,
  busca: <SearchIcon />,
  semana: <WeekIcon />,
  dashboard: <ChartIcon />,
  lembretes: <ClockIcon />,
  reunioes: <UsersGroupIcon />,
  projetos: <FolderIcon />,
  metanoia: <RtQuoteIcon />,
  conhecendo: <UserIcon size={16} />,
  sinapses: <RtThoughtIcon />,
  ideias: <BookmarkIcon />,
  livros: <BookOpenIcon />,
  estudo: <BookIcon />,
  aniversarios: <GiftIcon />,
  medicamentos: <PillIcon />,
  dieta: <MealIcon />,
  manutencao: <CarIcon />,
  compras: <CartIcon />,
  checklists: <CheckCircleIcon />,
  configuracoes: <SettingsIcon />,
  notificacoes: <BellIcon />,
  backup: <ArchiveIcon />,
  ia: <CommentIcon />,
};

function resumoDe(id: string, linhas: number): string {
  // A seção de ícones é uma lista de desenhos, não de dicas: conta os desenhos.
  const icones = (ICONES_DO_TUTORIAL[id] ?? []).reduce((n, g) => n + g.itens.length, 0);
  if (icones > 0) return `${icones} ícones`;
  return linhas === 1 ? "1 dica" : `${linhas} dicas`;
}

/**
 * Tela de texto com um bloco por assunto. Chega aqui pelo item “Como usar” do menu ou pelo “?” no topo de cada
 * tela, que leva direto ao bloco dela.
 */
export function TutorialView({ onBack, secao }: { onBack: () => void; secao?: string | null }) {
  // O assunto em destaque: o que veio do "?" da tela ou o último que a pessoa tocou.
  const [ativo, setAtivo] = useState<string | null>(secao ?? null);
  const [listaAberta, setListaAberta] = useState(false);

  // Rola até o bloco do assunto. No celular a tela ainda está se montando quando o toque chega (e a troca de tela volta a página
  // ao topo), então tenta de novo algumas vezes, sem animação, até o bloco ficar no alto.
  function rolarAte(id: string) {
    const tentar = () => {
      const el = document.getElementById("tut-" + id);
      if (!el) return;
      const topo = el.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: Math.max(0, topo), behavior: "auto" });
    };
    tentar();
    [120, 350, 800].forEach((ms) => setTimeout(tentar, ms));
  }
  function ir(id: string) {
    setAtivo(id);
    setListaAberta(false);
    rolarAte(id);
    // No computador a faixa de atalhos rola de lado: mantém o escolhido à vista.
    document.getElementById("tut-chip-" + id)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  useEffect(() => {
    if (!secao) return;
    rolarAte(secao);
  }, [secao]);

  const tituloAtivo = TUTORIAL.find((t) => t.id === ativo)?.titulo ?? null;

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
        {/* Celular: um botão que abre a lista de assuntos (no lugar da faixa que rolava de lado). */}
        <div className="tut-menu">
          <button type="button" className="tut-menu-btn" aria-expanded={listaAberta} onClick={() => setListaAberta((v) => !v)}>
            <span>{tituloAtivo ? `Assunto: ${tituloAtivo}` : "Escolher o assunto"}</span>
            <ChevronIcon />
          </button>
          {listaAberta && (
            <>
              <div className="mnav-fundo tut-menu-fundo" onClick={() => setListaAberta(false)} />
              <div className="mnav-folha tut-menu-folha" role="dialog" aria-label="Assuntos do Como usar">
                <div className="mnav-folha-titulo">O que você quer aprender?</div>
                {TUTORIAL.map((t) => (
                  <button key={t.id} type="button" className={"mnav-folha-opcao" + (ativo === t.id ? " on" : "")} onClick={() => ir(t.id)}>
                    {t.titulo}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <nav className="tutorial-indice" aria-label="Assuntos do Como usar">
          {TUTORIAL.map((s) => (
            <button key={s.id} id={"tut-chip-" + s.id} type="button" className={"tut-chip" + (ativo === s.id ? " on" : "")} aria-pressed={ativo === s.id} onClick={() => ir(s.id)}>
              {ICONE_DO_ASSUNTO[s.id] ?? <BookOpenIcon />}
              <span>{s.titulo}</span>
            </button>
          ))}
        </nav>
        {TUTORIAL.map((s) => (
          <section key={s.id} id={"tut-" + s.id} className={"list-card tutorial-bloco tut-sec" + (ativo === s.id ? " sel" : "")} aria-labelledby={"tut-t-" + s.id}>
            <div className="tut-cab">
              <span className="tut-tile" aria-hidden="true">
                {ICONE_DO_ASSUNTO[s.id] ?? <BookOpenIcon />}
              </span>
              <span className="tut-nome">
                <h2 id={"tut-t-" + s.id}>{s.titulo}</h2>
                <span>{resumoDe(s.id, s.linhas.length)}</span>
              </span>
              {ativo === s.id && <span className="tut-aqui">Você está aqui</span>}
            </div>
            <ul>
              {s.linhas.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            {(ICONES_DO_TUTORIAL[s.id] ?? []).map((g) => (
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
