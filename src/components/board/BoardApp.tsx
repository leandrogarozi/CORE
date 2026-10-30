"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { BoardProvider, useBoardCtx } from "./board-context";
import { DayStrip } from "./DayStrip";
import { TaskListCard } from "./TaskListCard";
import { WeekView } from "./WeekView";
import { CalendarView } from "./CalendarView";
import { TaskSearch, type SearchResult } from "./TaskSearch";
import { ThemeButton } from "./ThemeButton";
import { Dashboard } from "./Dashboard";
import { HoursPanel } from "./HoursPanel";
import { DailyLogPanel } from "./DailyLogPanel";
import { DayAgendaPanel } from "./DayAgendaPanel";
import { DayGreeting } from "./DayGreeting";
import { DaySummary } from "./DaySummary";
import { QuickActions } from "./QuickActions";
import {
  INTENSIDADE_PADRAO,
  TOM_PADRAO,
  degradeDoFundo,
  tomPorId,
  type IntensidadeDoFundo,
} from "@/lib/board/fundo";
import { RecurringSection } from "./RecurringSection";
import { SettingsView } from "./SettingsView";
import { BooksView } from "./BooksView";
import { RemindersView, RemindersButton } from "./RemindersView";
import { SynapsesView } from "./SynapsesView";
import { IdeasView } from "./IdeasView";
import { ComprasView } from "./ComprasView";
import { BirthdaysView } from "./BirthdaysView";
import { CadastrosView } from "./CadastrosView";
import { ClientesView } from "./ClientesView";
import { ConhecendoView } from "./ConhecendoView";
import { MetanoiaView } from "./MetanoiaView";
import { TutorialView } from "./TutorialView";
import { EmBreveView } from "./EmBreveView";
import { FeedbacksView } from "./FeedbacksView";
import { FraseDoDia } from "./FraseDoDia";
import { StudyPlansView } from "./StudyPlansView";
import { MaintenanceView } from "./MaintenanceView";
import { MedicationsView } from "./MedicationsView";
import { ChecklistsView } from "./ChecklistsView";
import { DietView } from "./DietView";
import { ProjectsView } from "./ProjectsView";
import { MeetingsView } from "./MeetingsView";
import { TrashView } from "./TrashView";
import { ScopeModal } from "./ScopeModal";
import { ConfirmModal } from "./ConfirmModal";
import { FaroMascot } from "./FaroMascot";
import { AnotacoesView } from "./AnotacoesView";
import { DispensaView } from "./DispensaView";
import { DockFaro } from "./DockFaro";
import { MobileNav } from "./MobileNav";
import { WelcomeModal } from "./WelcomeModal";
import { ActiveTimerBadge } from "./TimerButton";
import { ProfileView } from "./ProfileView";
import { TimerNudges } from "./TimerNudges";
import { Sidebar, type ViewMode } from "./Sidebar";
import { AvisosButton } from "./AvisosButton";
import { AniversariosButton } from "./AniversariosButton";
import { SaveErrorToaster } from "./SaveErrorToaster";
import { StaleScreenNotice } from "./StaleScreenNotice";
import { BoltIcon, ChevronIcon, ExpandHorizontalIcon, MenuIcon, SettingsIcon, UserIcon, UsersGroupIcon, WarningIcon, WeekIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { dateFromISO, longLabel, mondayOf, todayISO } from "@/lib/date-utils";
import { countOpenChecklistItems } from "@/lib/rich-text";
import { entraEmReunioes, isFeatureEnabled, type Task } from "@/lib/types";

function BoardShell() {
  const { board, sortByQuick, setSortByQuick, setOpenProjectHandler, setOpenTaskInDayHandler, requestFocus } =
    useBoardCtx();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Lembra se ele deixou o bloco "Sem data" aberto, igual às seções de Lembretes.
  const [backlogOpen, setBacklogOpen] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem("faro-sem-data-aberto") === "1"
  );
  const { wide, toggleWide } = useWideLayout("faro-wide-layout");
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOf(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayISO());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  // Marcado quando o Dashboard é aberto pela frase de atrasadas da saudação.
  const [dashAtrasadas, setDashAtrasadas] = useState(false);

  function selectView(mode: ViewMode) {
    setDashAtrasadas(false);
    if (mode === "day") {
      setWeekAnchor(mondayOf(new Date()));
      setSelectedDate(todayISO());
    }
    if (mode === "projects") setSelectedProjectId(null);
    setViewMode(mode);
    setSidebarOpen(false);
  }

  // A notificação da Metanoia abre o app com a frase em tela cheia (?ver=metanoia); tocar fecha e deixa o painel.
  // O "?" de cada tela abre o Tutorial já no assunto dela.
  const [tutorialSecao, setTutorialSecao] = useState<string | null>(null);
  useEffect(() => {
    function abrir(e: Event) {
      setTutorialSecao(String((e as CustomEvent).detail ?? ""));
      setViewMode("tutorial");
    }
    window.addEventListener("faro:tutorial", abrir);
    return () => window.removeEventListener("faro:tutorial", abrir);
  }, []);
  // A volta do "Conectar com o Google" chega como ?google=ok (ou um erro): abre as Configurações e deixa o recado para a caixa do Google.
  useEffect(() => {
    const volta = new URLSearchParams(window.location.search).get("google");
    if (!volta) return;
    try {
      window.sessionStorage.setItem("faro:google-retorno", volta);
    } catch {
      /* sem armazenamento: abre as Configurações sem recado */
    }
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a volta do Google é lida da URL, só no navegador, uma vez
    setViewMode("settings");
    setTimeout(() => document.getElementById("cfg-conexoes")?.scrollIntoView({ block: "start" }), 400);
  }, []);
  const [metaCheia, setMetaCheia] = useState(false);
  // Frase do cartão da tela inicial que a pessoa quis abrir (ou editar) na Metanoia.
  const [metaAlvo, setMetaAlvo] = useState<{ id: string; editar: boolean } | null>(null);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("ver") === "metanoia") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o endereço da página (sistema externo) uma vez, ao abrir
      setMetaCheia(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function goToProject(projectId: string) {
    setSelectedProjectId(projectId);
    setViewMode("projects");
  }

  useEffect(() => {
    setOpenProjectHandler(() => goToProject);
    return () => setOpenProjectHandler(null);
  }, [setOpenProjectHandler]);

  // Clique numa tarefa atrasada no Dashboard: vai pro dia dela e abre a edição.
  useEffect(() => {
    function openTaskInDay(task: Task) {
      goToTask(task);
      requestFocus({ kind: "task", id: task.id });
    }
    setOpenTaskInDayHandler(() => openTaskInDay);
    return () => setOpenTaskInDayHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setOpenTaskInDayHandler, requestFocus]);

  function goToday() {
    setWeekAnchor(mondayOf(new Date()));
    setSelectedDate(todayISO());
    setViewMode("day");
  }

  function goToDate(iso: string) {
    setSelectedDate(iso);
    setWeekAnchor(mondayOf(dateFromISO(iso)));
    setViewMode("day");
  }

  function goToTask(task: Task) {
    if (task.date) {
      goToDate(task.date);
      return;
    }
    // Tarefa sem data mora no bloco "Sem data", que pode estar recolhido — e
    // recolhido ela nem é renderizada, então o atalho da busca levava pra tela
    // certa e parecia não fazer nada. Abre o bloco pra ela aparecer.
    //
    // Abre SÓ na tela, sem gravar a preferência: ele continua decidindo como o
    // bloco começa da próxima vez que entrar.
    setViewMode("day");
    setBacklogOpen(true);
  }

  function handleSearchNavigate(result: SearchResult) {
    if (result.kind === "task") {
      goToTask(result.task);
      requestFocus({ kind: "task", id: result.task.id });
    } else if (result.kind === "reminder") {
      setViewMode("reminders");
      requestFocus({ kind: "reminder", id: result.reminder.id });
    } else if (result.kind === "book") {
      setViewMode("books");
      requestFocus({ kind: "book", id: result.book.id });
    }
  }

  /**
   * Escreve a escolha de fundo dele nas duas variáveis de tema.
   *
   * O CSS tem `--fundo-claro` e `--fundo-escuro`, e o `--fundo-degrade` só
   * escolhe entre as duas conforme o `data-theme`. Por isso dá pra escrever
   * aqui UMA vez: trocar de tema depois não precisa passar por este código.
   */
  const { bgTone, bgIntensity } = board.state.settings;
  useEffect(() => {
    const tom = tomPorId(bgTone ?? TOM_PADRAO);
    const n = (bgIntensity ?? INTENSIDADE_PADRAO) as IntensidadeDoFundo;
    const raiz = document.documentElement.style;
    raiz.setProperty("--fundo-claro", degradeDoFundo(tom, n, "claro"));
    raiz.setProperty("--fundo-escuro", degradeDoFundo(tom, n, "escuro"));
  }, [bgTone, bgIntensity]);

  const weekDatesISO = useMemo(() => {
    const from = new Date(weekAnchor);
    const to = new Date(weekAnchor);
    to.setDate(to.getDate() + 6);
    return { fromISO: from.toISOString().slice(0, 10), toISO: to.toISOString().slice(0, 10) };
  }, [weekAnchor]);

  useEffect(() => {
    if (!board.loading) board.ensureOccurrencesInView(weekDatesISO.fromISO, weekDatesISO.toISO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.loading, weekDatesISO.fromISO, weekDatesISO.toISO]);

  // Avisa antes de fechar/recarregar se algum campo "+ adicionar" (tarefa, lembrete,
  // etapa de projeto...) tiver texto digitado e ainda não confirmado (Enter) — sem
  // isso, fechar a aba nesse meio tempo perde o texto sem deixar rastro nenhum.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const hasUnsavedQuickAdd = Array.from(document.querySelectorAll<HTMLInputElement>(".quickadd-input")).some(
        (el) => el.value.trim() !== ""
      );
      if (!hasUnsavedQuickAdd) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Concluída e sem data não precisa mais esperar uma data: sai da lista.
  const backlogTasks = board.state.tasks.filter((t) => !t.date && !t.done);
  // Mesma regra do card "Atrasadas" do Dashboard, pra o número bater com ele.
  const overdueTaskCount = board.state.tasks.filter((t) => !t.done && t.date && t.date < todayISO()).length;
  const dayTasks = board.state.tasks.filter((t) => t.date === selectedDate);
  // Reuniões com pauta em aberto: o número do botão "Reuniões" da home.
  const reunioesComPauta = board.state.tasks.filter((t) => entraEmReunioes(t) && countOpenChecklistItems(t.note) > 0).length;


  // Cada painel da tela principal pode ser ligado ou desligado em Configurações
  // (Painéis da tela principal). Desligado, ele some daqui e o dado fica guardado.
  const painel = (chave: string) => isFeatureEnabled(board.state.settings.featureFlags, chave);
  const dockLigado = painel("dock_faro");

  function novaTarefaPelaBarra() {
    goToday();
    // Leva o cursor para o campo de nova tarefa assim que a tela do dia aparecer.
    setTimeout(() => document.querySelector<HTMLInputElement>(".quickadd-input")?.focus(), 150);
  }

  const semDataBlock = painel("panel_semdata") ? (
    <>
  <div className="section">
    <button
      type="button"
      className="section-head backlog-toggle"
      aria-expanded={backlogOpen}
      onClick={() =>
        setBacklogOpen((v) => {
          try {
            window.localStorage.setItem("faro-sem-data-aberto", v ? "0" : "1");
          } catch {
            // Navegador sem armazenamento: só não lembra da preferência.
          }
          return !v;
        })
      }
    >
      <span className="section-pill warning">
        <WarningIcon /> Sem data<span className="count">{backlogTasks.length}</span>
      </span>
      <span className="backlog-summary">
        {backlogTasks.length === 0
          ? "nada esperando data"
          : backlogTasks.length === 1
            ? "1 tarefa esperando uma data"
            : `${backlogTasks.length} tarefas esperando uma data`}
      </span>
      <span className={"chevron" + (backlogOpen ? " open" : " collapsed")}>
        <ChevronIcon />
      </span>
    </button>
    {backlogOpen && (
      <>
        <div className="hint-text">Coloque uma data pra essas tarefas não ficarem esquecidas por aqui.</div>
        <TaskListCard bucketKey="" tasks={backlogTasks} emptyLabel="Backlog vazio." quickAddId="qa-backlog" />
      </>
    )}
  </div>
    </>
  ) : null;

  const habitosBlock =
    painel("panel_habitos") || painel("panel_diadia") ? (
      <>
  <div className={"habits-blocks-row" + (painel("panel_habitos") && painel("panel_diadia") ? "" : " solo")}>
    <div className="section">
      <div className="section-head">
        <span className="section-pill accent">Hábitos</span>
      </div>
      <div className="hint-text">
        Aperte o play pra cronometrar em tempo real, ou preencha uma duração fixa e marque o check
        manualmente.
      </div>
      <RecurringSection kind="habit" weekAnchor={weekAnchor} podeCadastrar={false} />
    </div>

    <div className="section">
      <div className="section-head">
        <span className="section-pill accent">Dia a Dia</span>
      </div>
      <div className="hint-text">
        Coisas que costumam ocupar tempo todo dia (almoço, deslocamento, academia...). Aperte o play na hora
        que for fazer, ou marque o dia manualmente pra usar uma duração fixa.
      </div>
      <RecurringSection kind="block" weekAnchor={weekAnchor} podeCadastrar={false} />
    </div>
  </div>
      </>
    ) : null;

  return (
    <div className={"wrap" + (wide ? " wide" : "")}>
      <SaveErrorToaster />
      <StaleScreenNotice />
      <Sidebar
        open={sidebarOpen}
        viewMode={viewMode}
        onSelect={selectView}
        onClose={() => setSidebarOpen(false)}
        paraRevisar={board.state.knowledgeItems.filter((k) => k.status === "pendente").length}
        aniversariosPendentes={board.state.birthdays.filter((b) => b.pending).length}
        frasesParaRevisar={board.state.metanoiaFrases.filter((f) => f.status === "pendente").length}
        modoDono={board.state.settings.featureFlags.modo_dono === true}
        flags={board.state.settings.featureFlags}
        onFeedback={() => {
          selectView("settings");
          setTimeout(() => document.getElementById("cfg-ajuda")?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
        }}
      />

      <div className="topbar">
        <button className="icon-btn menu-btn" type="button" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
          <MenuIcon />
        </button>
        <div className="brand">FARO</div>
        <TaskSearch onNavigate={handleSearchNavigate} />
        <div className="topbar-right">
          <AvisosButton onNavigate={selectView} />
          <AniversariosButton onNavigate={selectView} />
          <ActiveTimerBadge />
          <div className="today-date mono">{longLabel(todayISO())}</div>
          <button className="today-btn so-desktop" type="button" onClick={goToday}>
            Hoje
          </button>
          <ThemeButton />
          <button
            className={"icon-btn so-desktop" + (wide ? " active" : "")}
            type="button"
            aria-label={wide ? "Voltar à largura normal" : "Usar a tela toda"}
            title={wide ? "Voltar à largura normal" : "Usar a tela toda"}
            onClick={toggleWide}
          >
            <ExpandHorizontalIcon flipped={wide} />
          </button>
          <button
            className={"icon-btn" + (viewMode === "calendar" ? " active" : "")}
            type="button"
            aria-label="Abrir calendário"
            title="Calendário"
            onClick={() => setViewMode("calendar")}
          >
            <WeekIcon />
          </button>
          <button
            className={"icon-btn settings-btn" + (viewMode === "settings" ? " active" : "")}
            id="settings-btn"
            type="button"
            aria-label="Configurações"
            onClick={() => setViewMode(viewMode === "settings" ? "day" : "settings")}
          >
            <SettingsIcon />
          </button>
          <button
            className={"profile-avatar-nav-btn" + (viewMode === "profile" ? " active" : "")}
            type="button"
            aria-label="Perfil"
            title="Perfil"
            onClick={() => setViewMode(viewMode === "profile" ? "day" : "profile")}
          >
            {board.state.settings.avatarUrl ? (
              <Image src={board.state.settings.avatarUrl} alt="" fill sizes="26px" className="profile-avatar-nav-img" />
            ) : (
              <UserIcon />
            )}
          </button>
        </div>
      </div>

      <ScopeModal />
      <ConfirmModal />
      <TimerNudges />

      {viewMode === "settings" ? (
        <SettingsView onBack={() => setViewMode("day")} />
      ) : viewMode === "profile" ? (
        <ProfileView onBack={() => setViewMode("day")} />
      ) : viewMode === "books" ? (
        <BooksView onBack={() => setViewMode("day")} />
      ) : viewMode === "synapses" ? (
        <SynapsesView onBack={() => setViewMode("day")} />
      ) : viewMode === "ideias" ? (
        <IdeasView onBack={() => setViewMode("day")} />
      ) : viewMode === "tutorial" ? (
        <TutorialView onBack={() => { setTutorialSecao(null); setViewMode("day"); }} secao={tutorialSecao} />
      ) : viewMode === "feedbacks" ? (
        <FeedbacksView onBack={() => setViewMode("day")} />
      ) : viewMode === "embreve" ? (
        <EmBreveView onBack={() => setViewMode("day")} />
      ) : viewMode === "metanoia" ? (
        <MetanoiaView key={metaAlvo ? `${metaAlvo.id}-${metaAlvo.editar}` : "livre"} alvo={metaAlvo} onBack={() => { setMetaAlvo(null); setViewMode("day"); }} />
      ) : viewMode === "conhecendo" ? (
        <ConhecendoView onBack={() => setViewMode("day")} />
      ) : viewMode === "compras" ? (
        <ComprasView onBack={() => setViewMode("day")} />
      ) : viewMode === "aniversarios" ? (
        <BirthdaysView onBack={() => setViewMode("day")} />
      ) : viewMode === "cadastros" ? (
        <CadastrosView onBack={() => setViewMode("day")} />
      ) : viewMode === "clientes" ? (
        <ClientesView onBack={() => setViewMode("day")} />
      ) : viewMode === "estudo" ? (
        <StudyPlansView onBack={() => setViewMode("day")} />
      ) : viewMode === "anotacoes" ? (
        <AnotacoesView onBack={() => setViewMode("day")} />
      ) : viewMode === "dispensa" ? (
        <DispensaView onBack={() => setViewMode("day")} />
      ) : viewMode === "manutencao" ? (
        <MaintenanceView onBack={() => setViewMode("day")} />
      ) : viewMode === "reminders" ? (
        <RemindersView onBack={() => setViewMode("day")} onOpenMeetings={() => setViewMode("meetings")} />
      ) : viewMode === "medications" ? (
        <MedicationsView onBack={() => setViewMode("day")} />
      ) : viewMode === "checklists" ? (
        <ChecklistsView onBack={() => setViewMode("day")} />
      ) : viewMode === "diet" ? (
        <DietView onBack={() => setViewMode("day")} />
      ) : viewMode === "trash" ? (
        <TrashView onBack={() => setViewMode("day")} />
      ) : viewMode === "projects" ? (
        <ProjectsView
          onBack={() => setViewMode("day")}
          selectedId={selectedProjectId}
          onSelect={setSelectedProjectId}
        />
      ) : viewMode === "meetings" ? (
        <MeetingsView onBack={() => setViewMode("day")} />
      ) : viewMode === "calendar" ? (
        <CalendarView onBack={() => setViewMode("day")} onSelectWeek={() => setViewMode("week")} onSelectDay={goToDate} />
      ) : (
        <>
          {viewMode === "day" && (
            <DayGreeting
              onAtrasadas={() => {
                setDashAtrasadas(true);
                setViewMode("dashboard");
              }}
            />
          )}
          {viewMode === "day" && (
            <FraseDoDia
              onAbrir={(f) => { setMetaAlvo({ id: f.id, editar: false }); setViewMode("metanoia"); }}
              onEditar={(f) => { setMetaAlvo({ id: f.id, editar: true }); setViewMode("metanoia"); }}
            />
          )}
          {metaCheia && <FraseDoDia telaCheia onAbrir={() => setViewMode("metanoia")} onEditar={() => setViewMode("metanoia")} onFecharTelaCheia={() => setMetaCheia(false)} />}
          <div className="day-strip-wrap">
            <button
              className="strip-nav"
              type="button"
              aria-label="semana anterior"
              onClick={() => {
                const d = new Date(weekAnchor);
                d.setDate(d.getDate() - 7);
                setWeekAnchor(d);
              }}
            >
              ‹
            </button>
            <DayStrip weekAnchor={weekAnchor} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            <button
              className="strip-nav"
              type="button"
              aria-label="próxima semana"
              onClick={() => {
                const d = new Date(weekAnchor);
                d.setDate(d.getDate() + 7);
                setWeekAnchor(d);
              }}
            >
              ›
            </button>
            <div className="view-toggle">
              <button
                type="button"
                className={"view-toggle-btn" + (viewMode !== "week" && viewMode !== "dashboard" ? " active" : "")}
                onClick={goToday}
              >
                Hoje
              </button>
              <button
                type="button"
                className={"view-toggle-btn" + (viewMode === "week" ? " active" : "")}
                onClick={() => setViewMode(viewMode === "week" ? "day" : "week")}
              >
                Semana
              </button>
              <button
                type="button"
                className={"view-toggle-btn" + (viewMode === "dashboard" ? " active" : "")}
                title={overdueTaskCount > 0 ? `${overdueTaskCount} tarefa(s) atrasada(s)` : undefined}
                onClick={() => {
                  setDashAtrasadas(false);
                  setViewMode(viewMode === "dashboard" ? "day" : "dashboard");
                }}
              >
                Dashboard
                {overdueTaskCount > 0 && (
                  <span className="view-toggle-count">{overdueTaskCount > 9 ? "9+" : overdueTaskCount}</span>
                )}
              </button>
            </div>
            <div className="home-atalhos">
              <button
                type="button"
                className="reminders-btn"
                title={reunioesComPauta > 0 ? `${reunioesComPauta} reunião(ões) com pauta em aberto` : "Minhas reuniões"}
                onClick={() => setViewMode("meetings")}
              >
                <span className="reminders-btn-bell">
                  <UsersGroupIcon />
                  {reunioesComPauta > 0 && (
                    <span className="reminders-btn-count">{reunioesComPauta > 9 ? "9+" : reunioesComPauta}</span>
                  )}
                </span>
                Reuniões
              </button>
              <RemindersButton onOpenFull={() => setViewMode("reminders")} />
            </div>
          </div>

          {viewMode === "day" && <QuickActions onOpen={setViewMode} />}

          {viewMode === "dashboard" ? (
            <Dashboard key={dashAtrasadas ? "atrasadas" : "normal"} abrirAtrasadas={dashAtrasadas} onAbrirAnotacoes={() => setViewMode("anotacoes")} />
          ) : (
            <div className="day-layout">
              <div className="section">
                <div className="section-head">
                  <span className="section-pill accent">
                    {viewMode === "week" ? "Semana" : selectedDate === todayISO() ? "Hoje" : longLabel(selectedDate)}
                    <span className="count">
                      {viewMode === "week" ? board.state.tasks.filter((t) => t.date).length : dayTasks.length}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={"quicksort-btn" + (sortByQuick ? " active" : "")}
                    title="Reordena as listas colocando as tarefas mais rápidas (+++) primeiro"
                    onClick={() => setSortByQuick(!sortByQuick)}
                  >
                    <BoltIcon /> Rápidas primeiro
                  </button>
                </div>
                {viewMode === "week" ? (
                  <WeekView weekAnchor={weekAnchor} />
                ) : (
                  <TaskListCard
                    bucketKey={selectedDate}
                    tasks={dayTasks}
                    emptyLabel={`Nada marcado para ${longLabel(selectedDate)}.`}
                    quickAddId="qa-day"
                  />
                )}
              </div>
              {/* A coluna da esquerda é uma pilha: Horas é baixo e o Registro
                  do dia é alto, então sobrava um vão ao lado. A Agenda entra
                  embaixo do Horas e fecha a linha.

                  Tudo isto é da tela do DIA. Na Semana o Horas também aparecia,
                  e ele pediu pra sair: *"na aba semana, retirar o bloco horas
                  trabalhada... é só uma visão geral de como foi a semana ali de
                  tarefa"*. Sem o Horas, a linha inteira ficava vazia na Semana —
                  Agenda e Registro do dia já eram só do dia —, então a condição
                  subiu pra linha toda em vez de ficar repetida em cada bloco. */}
              {semDataBlock}
              {viewMode === "day" && (
                <>
                  {/* Faixa embaixo das tarefas: a lista de tarefas fica com a largura toda e
                      Seu dia, Horas e Agenda dividem a linha de baixo. */}
                  <div className="day-info-row">
                    {painel("panel_agenda") && (
                      <DayAgendaPanel
                        selectedDate={selectedDate}
                        // Mesma navegação da busca: leva pro dia da tarefa e
                        // acende a linha dela. Reaproveitar isso é o que faz a
                        // agenda abrir o item no lugar certo em vez de só rolar.
                        onAbrirTarefa={(task) => {
                          goToTask(task);
                          requestFocus({ kind: "task", id: task.id });
                        }}
                        onAbrirLembrete={(id) => {
                          setViewMode("reminders");
                          requestFocus({ kind: "reminder", id });
                        }}
                      />
                    )}
                    {painel("panel_horas") && <HoursPanel selectedDate={selectedDate} />}
                    {painel("panel_resumo") && <DaySummary selectedDate={selectedDate} />}
                  </div>
                  <DailyLogPanel selectedDate={selectedDate} />
                </>
              )}
              {habitosBlock}
            </div>
          )}

        </>
      )}

      <MobileNav
        viewMode={viewMode}
        onHoje={goToday}
        onSelect={selectView}
        onMenu={() => setSidebarOpen(true)}
        onFalarComFaro={() => window.dispatchEvent(new Event("faro:falar"))}
        onNovaTarefa={novaTarefaPelaBarra}
      />
      {dockLigado && (
        <DockFaro
          viewMode={viewMode}
          onHoje={goToday}
          onSelect={selectView}
          onFalarComFaro={() => window.dispatchEvent(new Event("faro:falar"))}
          onNovaTarefa={novaTarefaPelaBarra}
        />
      )}
      <FaroMascot comDock={dockLigado} />
      <WelcomeModal onAbrirConfiguracoes={() => setViewMode("settings")} />
    </div>
  );
}

export function BoardApp({ userId }: { userId: string }) {
  return (
    <BoardProvider userId={userId}>
      <BoardShell />
    </BoardProvider>
  );
}
