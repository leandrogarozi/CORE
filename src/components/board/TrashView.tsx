"use client";

import { useBoardCtx } from "./board-context";
import { fmtShortDate, todayISO, isoAddDays } from "@/lib/date-utils";

// "hoje às 10:12", "ontem", "20 out": a data de quando foi apagado, do jeito que a pessoa fala.
function quandoApagou(deletedAt: string | null): string {
  if (!deletedAt) return "";
  const dia = deletedAt.slice(0, 10);
  const hoje = todayISO();
  if (dia === hoje) {
    const d = new Date(deletedAt);
    return Number.isNaN(d.getTime()) ? "hoje" : `hoje às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  if (dia === isoAddDays(hoje, -1)) return "ontem";
  return fmtShortDate(dia);
}

function TrashRow({
  tipo,
  title,
  deletedAt,
  onRestore,
  onPurge,
}: {
  tipo: string;
  title: string;
  deletedAt: string | null;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const { askConfirm } = useBoardCtx();

  function purge() {
    askConfirm(`Excluir "${title}" de vez? Essa ação não pode ser desfeita.`, onPurge);
  }

  return (
    <div className="trash-row">
      <span className={"trash-tipo tipo-" + tipo.toLowerCase()}>{tipo}</span>
      <div className="trash-row-info">
        <span className="trash-row-title">{title}</span>
      </div>
      <span className="trash-row-date">{quandoApagou(deletedAt)}</span>
      <div className="trash-row-actions">
        <button type="button" className="btn btn-ghost" onClick={onRestore}>
          Restaurar
        </button>
        <button type="button" className="btn btn-ghost danger-hover" onClick={purge}>
          Excluir de vez
        </button>
      </div>
    </div>
  );
}

export function TrashView({ onBack }: { onBack: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const tasks = board.state.trashedTasks;
  const reminders = board.state.trashedReminders;
  const total = tasks.length + reminders.length;

  /**
   * Uma lista só, da exclusão mais recente pra mais antiga.
   *
   * Antes eram dois blocos — todas as tarefas, depois todos os lembretes —,
   * cada um na ordem em que o estado trouxe. Quem abre a lixeira está
   * procurando o que apagou sem querer, e isso aconteceu HÁ POUCO: a ordem que
   * serve é a do tempo, não a do tipo. Separar por tipo só ajudaria quem já
   * sabe o que procura, que é justamente quem não precisa da lixeira.
   *
   * Sem data vai pro fim: linha antiga, de antes da coluna existir, não pode
   * encabeçar a lista fingindo ser a mais recente.
   */
  const itens = [
    ...tasks.map((t) => ({
      chave: `task-${t.id}`,
      tipo: "Tarefa",
      titulo: t.title,
      deletedAt: t.deletedAt,
      restaurar: () => board.restoreTask(t.id),
      apagar: () => board.purgeTask(t.id),
    })),
    ...reminders.map((r) => ({
      chave: `reminder-${r.id}`,
      tipo: "Lembrete",
      titulo: r.title,
      deletedAt: r.deletedAt,
      restaurar: () => board.restoreReminder(r.id),
      apagar: () => board.purgeReminder(r.id),
    })),
  ].sort((a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""));

  function emptyTrash() {
    askConfirm(
      `Esvaziar a lixeira? ${total} ${total === 1 ? "item vai ser excluído" : "itens vão ser excluídos"} de vez, sem volta.`,
      () => {
        tasks.forEach((t) => board.purgeTask(t.id));
        reminders.forEach((r) => board.purgeReminder(r.id));
      }
    );
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Lixeira</span>
        {total > 0 ? (
          <button type="button" className="btn btn-ghost danger-hover trash-esvaziar" onClick={emptyTrash}>
            Esvaziar lixeira
          </button>
        ) : (
          <span style={{ width: 32 }} />
        )}
      </div>

      <div className="narrow-list">
        <p className="hint-text">Do mais recente para o mais antigo. O que está aqui pode voltar.</p>
        <div className="list-card">
          {total > 0 && (
            <div className="trash-card-head">
              <strong>Apagados</strong> <span className="trash-card-n">{total}</span>
            </div>
          )}
          {total === 0 ? (
            <div className="hp-empty">Lixeira vazia.</div>
          ) : (
            itens.map((i) => (
              <TrashRow
                key={i.chave}
                tipo={i.tipo}
                title={i.titulo}
                deletedAt={i.deletedAt}
                onRestore={i.restaurar}
                onPurge={i.apagar}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
