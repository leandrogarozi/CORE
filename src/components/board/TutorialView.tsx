"use client";

import { useEffect, type ReactNode } from "react";
import { TUTORIAL } from "@/lib/tutorial";
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
  ExpandHorizontalIcon,
  InboxIcon,
  MenuIcon,
  MoonIcon,
  SettingsIcon,
  WeekIcon,
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
          {TUTORIAL.map((s) => (
            <button key={s.id} type="button" className="btn btn-ghost" onClick={() => document.getElementById("tut-" + s.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              {s.titulo}
            </button>
          ))}
        </div>
        {TUTORIAL.map((s) => (
          <section key={s.id} id={"tut-" + s.id} className={"list-card tutorial-bloco" + (secao === s.id ? " em-foco" : "")}>
            <h2>{s.titulo}</h2>
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
