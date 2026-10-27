"use client";

import { useEffect } from "react";

interface Secao {
  id: string;
  titulo: string;
  linhas: string[];
}

/** Um bloco curto por assunto. Quem muda uma tela do FARO muda o bloco dela aqui. */
const SECOES: Secao[] = [
  {
    id: "painel",
    titulo: "Painel do dia",
    linhas: [
      "É a tela inicial: o dia de hoje, com as tarefas, as reuniões e o Registro do dia.",
      "Escreva uma tarefa no campo de cima e aperte Enter. Cada tarefa tem status (A iniciar, Executando, Concluída...), prioridade e velocidade nas bolinhas, e um play para contar o tempo.",
      "As setas ao lado das datas mudam o dia. Tarefas atrasadas aparecem num aviso; toque para ver.",
      "O Registro do dia guarda humor, sono, água e dieta. Em Configurações você liga e desliga cada painel.",
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
    ],
  },
  {
    id: "reunioes",
    titulo: "Reuniões",
    linhas: [
      "Reunião é uma tarefa com a tag reunião. Aqui elas ficam listadas por data.",
      "Use “Nova reunião” para criar com título, dia e hora. Dentro de cada uma você escreve a pauta e as decisões.",
    ],
  },
  {
    id: "metanoia",
    titulo: "Metanoia",
    linhas: [
      "Metanoia é a mudança de mente. O FARO traz até você frases e perguntas poderosas durante o dia, uma fila que passa em ordem sorteada e só repete depois de mostrar todas.",
      "Sua conta já vem com frases. Você pode escrever as suas, colar uma lista ou subir prints (o print é lido no seu aparelho e descartado; fica só o texto).",
      "Em “Quando o FARO me lembra” você escolhe quantas frases e perguntas por dia (de 0 a 10) e o intervalo de horas. O FARO as espalha por igual entre o começo e o fim.",
      "O coração marca uma favorita, que aparece mais vezes. O olho riscado manda a frase para “Não listadas”: não aparece mais, mas dá para voltar. Excluir de vez só no editor.",
      "Na tela inicial um cartão mostra a frase do momento, com setinhas para ver a anterior e a próxima. Em Aparência você escolhe fundo branco, preto ou o do app.",
      "Não quer usar? Desligue a Metanoia em Configurações > Painéis do menu.",
    ],
  },
  {
    id: "conhecendo",
    titulo: "Conhecendo você",
    linhas: [
      "É o que o FARO sabe sobre você: valores, objetivos, preferências, decisões, projetos.",
      "Quando você conversa com uma IA ligada ao FARO, ela pode propor o que aprendeu. Nada vale até você aprovar em “Para revisar”.",
      "O resumo “O que o FARO sabe sobre você” junta tudo o que você aprovou.",
    ],
  },
  {
    id: "sinapses",
    titulo: "Novas Sinapses",
    linhas: [
      "Uma sinapse é um aprendizado que mudou uma crença sua. Cada uma tem o que você aprendeu e a pergunta que reconecta você com ele.",
      "Escreva logo depois de aprender algo. Daqui a um tempo, a pergunta traz o aprendizado de volta.",
    ],
  },
  {
    id: "ideias",
    titulo: "Ideias e Estudos",
    linhas: [
      "Ideias são insights rápidos. Estudos são ideias com partes (aulas, encontros, módulos), cada parte com as suas anotações.",
      "Use tags para achar depois. Tudo isso entra no backup.",
    ],
  },
  {
    id: "livros",
    titulo: "Livros, filmes e séries",
    linhas: [
      "Três abas: Livros, Filmes e Séries, com os status Para ler/assistir, Lendo/Assistindo e Concluído.",
      "No botão de comentário você anota o que aprendeu. Concluído e com anotações, dá para enviar para Estudos ou para uma Nova Sinapse.",
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
      "Lista de amigos, família e clientes, com data, categoria e WhatsApp.",
      "O lembrete anual chega às 9h do dia, e o WhatsApp é opcional (gasta crédito).",
    ],
  },
  {
    id: "medicamentos",
    titulo: "Medicamentos",
    linhas: ["Cadastre remédio, horário e grupo. O FARO avisa na hora e você marca como tomado."],
  },
  {
    id: "dieta",
    titulo: "Dieta",
    linhas: ["Cadastre as refeições do plano. Durante o dia você marca o que cumpriu e anota o que fugiu do plano."],
  },
  {
    id: "manutencao",
    titulo: "Manutenção",
    linhas: ["Itens da casa e do carro que se repetem (trocar filtro, revisão). Você diz de quanto em quanto tempo, e o FARO avisa para comprar e para fazer."],
  },
  {
    id: "compras",
    titulo: "Compras",
    linhas: ["Listas de compras por assunto. Marque o que já comprou; o que sobra fica para a próxima ida."],
  },
  {
    id: "checklists",
    titulo: "Checklists",
    linhas: ["Listas de passos que você repete (viagem, abertura da loja...). Marque os itens e reinicie quando precisar."],
  },
  {
    id: "projetos",
    titulo: "Projetos",
    linhas: ["Agrupe tarefas de um mesmo objetivo. Dentro de cada projeto você vê o que falta e o tempo gasto."],
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    linhas: [
      "Aparência: cor do fundo. Tarefas: tags e status. Painéis da tela principal e Painéis do menu: ligue só o que você usa.",
      "Avisos e custos: notificações no celular, WhatsApp e seu crédito, custo da IA.",
      "Dados e backup: o FARO guarda uma cópia sua todo dia, e você pode baixar a sua própria cópia quando quiser.",
      "Canal de feedback: conte um problema, uma ideia, uma dúvida ou um elogio.",
    ],
  },
  {
    id: "notificacoes",
    titulo: "Notificações no celular",
    linhas: [
      "No iPhone, primeiro instale o FARO na tela de início (Compartilhar > Adicionar à Tela de Início) e abra por lá. No Android e no computador, basta permitir quando o navegador perguntar.",
      "Depois vá em Configurações > Avisos e custos e ligue as notificações. Use “testar notificação” para conferir.",
      "Janela anônima do navegador não permite notificações.",
    ],
  },
  {
    id: "backup",
    titulo: "Backup",
    linhas: [
      "Todo dia o FARO tira uma cópia de tudo que é seu e guarda as últimas 14.",
      "Em Configurações > Dados e backup você também baixa uma cópia sua, em texto, para guardar onde quiser (no seu Drive, por exemplo).",
    ],
  },
  {
    id: "ia",
    titulo: "A IA e o cachorrinho",
    linhas: [
      "O cachorrinho no canto da tela é o assistente do FARO. Toque para abrir e fale ou escreva: ele cria tarefa, lembrete e reunião, anota gasto e registra humor, sempre pedindo a sua confirmação.",
      "Se você usa uma IA (como o Claude), ela pode se conectar ao FARO pelo Conector (Configurações > Conexões) e ler o que você aprovou.",
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
          </section>
        ))}
      </div>
    </div>
  );
}
