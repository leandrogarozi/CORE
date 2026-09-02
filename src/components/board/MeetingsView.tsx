"use client";

import { useMemo, useState } from "react";
import { useBoardCtx } from "./board-context";
import { TaskRow } from "./TaskRow";
import { SearchIcon, UsersGroupIcon } from "./icons";
import { countOpenChecklistItems } from "@/lib/rich-text";
import { isMeetingTask, type Task } from "@/lib/types";

const NO_CLIENT_LABEL = "Sem cliente";

interface MeetingGroup {
  client: string;
  items: { task: Task; open: number }[];
  openCount: number;
}

export function MeetingsView({ onBack }: { onBack: () => void }) {
  const { board, columns } = useBoardCtx();
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const meetingTasks = board.state.tasks.filter((t) => isMeetingTask(t));

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    meetingTasks.forEach((t) => {
      const key = t.client?.trim() || NO_CLIENT_LABEL;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    const entries: MeetingGroup[] = Array.from(map.entries()).map(([client, tasks]) => {
      const items = tasks
        .map((task) => ({ task, open: countOpenChecklistItems(task.note) }))
        .sort((a, b) => {
          if (a.open > 0 !== b.open > 0) return a.open > 0 ? -1 : 1;
          return (b.task.date || "").localeCompare(a.task.date || "");
        });
      const openCount = items.filter((x) => x.open > 0).length;
      return { client, items, openCount };
    });
    entries.sort((a, b) => {
      if (a.client === NO_CLIENT_LABEL) return 1;
      if (b.client === NO_CLIENT_LABEL) return -1;
      return a.client.localeCompare(b.client);
    });
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.state.tasks]);

  const filtered = groups
    .filter((g) => !search.trim() || g.client.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((g) => !onlyPending || g.openCount > 0);

  const totalMeetings = meetingTasks.length;
  const totalPending = groups.reduce((sum, g) => sum + g.openCount, 0);

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Reuniões</span>
        <span style={{ width: 30 }} />
      </div>

      <div className="narrow-list project-wide">
        <div className="list-quickadd-card meetings-toolbar">
          <div className="meetings-search-row">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="meetings-pending-toggle">
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
            Só com pauta em aberto{totalPending > 0 && ` (${totalPending})`}
          </label>
        </div>

        {!totalMeetings && <div className="hp-empty">Nenhuma reunião registrada ainda.</div>}
        {!!totalMeetings && !filtered.length && <div className="hp-empty">Nenhum cliente encontrado.</div>}

        {filtered.map((g) => (
          <div className="list-card" key={g.client}>
            <div className={"list-card-section-label" + (g.openCount > 0 ? " pending-label" : " active-label")}>
              <UsersGroupIcon /> {g.client}
              <span className="meetings-group-count">
                {g.items.length} {g.items.length === 1 ? "reunião" : "reuniões"}
                {g.openCount > 0 && ` · ${g.openCount} com pauta em aberto`}
              </span>
            </div>
            <div className="task-table-scroll">
              {g.items.map(({ task }) => (
                <TaskRow key={task.id} task={task} draggable={false} gridTemplate={columns.gridTemplate} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
