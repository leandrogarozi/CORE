"use client";

import { useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";
import { TaskRow } from "./TaskRow";
import { TimePicker } from "./TimePicker";
import { SearchIcon, UsersGroupIcon } from "./icons";
import { countOpenChecklistItems } from "@/lib/rich-text";
import { agruparReunioes, dataDaReuniao } from "@/lib/board/reunioes";
import { todayISO } from "@/lib/date-utils";
import { entraEmReunioes, type Task } from "@/lib/types";

const NO_CLIENT_LABEL = "Sem cliente";

type Modo = "data" | "cliente";

interface MeetingGroup {
  client: string;
  items: { task: Task; open: number }[];
  openCount: number;
}

export function MeetingsView({ onBack }: { onBack: () => void }) {
  const { board, columns } = useBoardCtx();
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  // Padrão por data (a mais recente em cima); "por cliente" continua disponível.
  const [modo, setModo] = useState<Modo>("data");

  // Nova reunião
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [data, setData] = useState(() => todayISO());
  const [hora, setHora] = useState("");
  const [criada, setCriada] = useState("");

  const hoje = todayISO();
  const meetingTasks = board.state.tasks.filter((t) => entraEmReunioes(t));
  const clientesConhecidos = useMemo(
    () =>
      Array.from(
        new Set(board.state.tasks.map((t) => t.client?.trim()).filter((c): c is string => !!c))
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [board.state.tasks]
  );

  function criarReuniao() {
    if (!titulo.trim() || !data) return;
    const id = board.addMeeting({ title: titulo, client: cliente.trim() || null, date: data, time: hora || null });
    if (!id) return;
    setCriada(`Reunião criada para ${dataDaReuniao(data)}${hora ? ` às ${hora}` : ""}. Ela já aparece na lista de tarefas desse dia.`);
    setTitulo("");
    setHora("");
  }

  const termo = search.trim().toLowerCase();
  const visiveis = meetingTasks
    .filter(
      (t) =>
        !termo ||
        (t.client ?? "").toLowerCase().includes(termo) ||
        t.title.toLowerCase().includes(termo)
    )
    .filter((t) => !onlyPending || countOpenChecklistItems(t.note) > 0);

  const gruposPorData = useMemo(
    () => agruparReunioes(visiveis, hoje),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board.state.tasks, termo, onlyPending, hoje]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    visiveis.forEach((t) => {
      const key = t.client?.trim() || NO_CLIENT_LABEL;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    const entries: MeetingGroup[] = Array.from(map.entries()).map(([client, tasks]) => {
      const items = tasks
        .map((task) => ({ task, open: countOpenChecklistItems(task.note) }))
        .sort((a, b) => (b.task.date || "").localeCompare(a.task.date || "") || (b.task.time || "").localeCompare(a.task.time || ""));
      return { client, items, openCount: items.filter((x) => x.open > 0).length };
    });
    entries.sort((a, b) => {
      if (a.client === NO_CLIENT_LABEL) return 1;
      if (b.client === NO_CLIENT_LABEL) return -1;
      return a.client.localeCompare(b.client);
    });
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.state.tasks, termo, onlyPending]);

  const totalMeetings = meetingTasks.length;
  const totalPending = meetingTasks.filter((t) => countOpenChecklistItems(t.note) > 0).length;

  // Função e não componente: definir um componente aqui dentro o remontaria a cada
  // digitação e fecharia a reunião que estivesse aberta.
  function renderLinha(task: Task) {
    return (
      <div className="meeting-line" key={task.id}>
        <span className={"meeting-date mono" + (task.date === hoje ? " hoje" : "")}>{dataDaReuniao(task.date)}</span>
        <div className="meeting-line-row">
          <TaskRow task={task} draggable={false} gridTemplate={columns.gridTemplate} />
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Reuniões</span>
        <span style={{ width: 32 }} />
      </div>

      <div className="narrow-list project-wide">
        <div className="list-quickadd-card meeting-new">
          <div className="meeting-new-title">
            <UsersGroupIcon /> Nova reunião
          </div>
          <div className="meeting-new-row">
            <input
              type="text"
              className="meeting-new-nome"
              placeholder="Nome da reunião (ex.: Alinhamento do relatório)"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setCriada("");
              }}
              onKeyDown={(e) => e.key === "Enter" && criarReuniao()}
            />
            <input
              type="text"
              list="meetings-client-options"
              placeholder="Cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarReuniao()}
            />
            <datalist id="meetings-client-options">
              {clientesConhecidos.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input type="date" value={data} aria-label="Dia da reunião" onChange={(e) => setData(e.target.value)} />
            <TimePicker value={hora} onChange={setHora} onClear={() => setHora("")} placeholder="hora" />
            <button type="button" className="btn btn-accent" disabled={!titulo.trim() || !data} onClick={criarReuniao}>
              Criar reunião
            </button>
          </div>
          {criada && <div className="meeting-new-ok">{criada}</div>}
        </div>

        <div className="list-quickadd-card meetings-toolbar">
          <div className="meetings-search-row">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar por cliente ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="meeting-modo" role="group" aria-label="Ordem da lista">
            <button type="button" className={"meeting-modo-btn" + (modo === "data" ? " ativo" : "")} onClick={() => setModo("data")}>
              Por data
            </button>
            <button type="button" className={"meeting-modo-btn" + (modo === "cliente" ? " ativo" : "")} onClick={() => setModo("cliente")}>
              Por cliente
            </button>
          </div>
          <label className="meetings-pending-toggle">
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
            Só com pauta em aberto{totalPending > 0 && ` (${totalPending})`}
          </label>
        </div>

        {!totalMeetings && <div className="hp-empty">Nenhuma reunião registrada ainda.</div>}
        {!!totalMeetings && !visiveis.length && <div className="hp-empty">Nenhuma reunião encontrada.</div>}

        {modo === "data" &&
          gruposPorData.map((g) => (
            <div className="list-card" key={g.chave}>
              <div className={"list-card-section-label" + (g.chave === "proximas" ? " active-label" : "")}>
                {g.rotulo}
                <span className="meetings-group-count">
                  {g.itens.length} {g.itens.length === 1 ? "reunião" : "reuniões"}
                </span>
              </div>
              <div className="task-table-scroll">
                {g.itens.map(renderLinha)}
              </div>
            </div>
          ))}

        {modo === "cliente" &&
          groups.map((g) => (
            <div className="list-card" key={g.client}>
              <div className={"list-card-section-label" + (g.openCount > 0 ? " pending-label" : " active-label")}>
                <UsersGroupIcon /> {g.client}
                <span className="meetings-group-count">
                  {g.items.length} {g.items.length === 1 ? "reunião" : "reuniões"}
                  {g.openCount > 0 && ` · ${g.openCount} com pauta em aberto`}
                </span>
              </div>
              <div className="task-table-scroll">
                {g.items.map(({ task }) => renderLinha(task))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
