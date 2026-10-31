"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { AttachmentsButton } from "./AttachmentsButton";
import { CommentButton } from "./CommentButton";
import {
  BellIcon,
  CheckIcon,
  ChevronIcon,
  EraserIcon,
  ExpandIcon,
  RepeatIcon,
  TrashIcon,
  UsersGroupIcon,
  SendIcon,
  WeekIcon,
  WhatsAppIcon,
} from "./icons";
import { RichTextEditor } from "./RichTextEditor";
import { TimePicker } from "./TimePicker";
import { DAY_NAMES, fmtDayMonth, isoAddDays, todayISO } from "@/lib/date-utils";
import { useClampedPopoverPos } from "@/lib/board/use-clamped-popover-pos";
import { countOpenChecklistItems } from "@/lib/rich-text";
import { MicButton } from "./MicButton";
import { entraEmReunioes } from "@/lib/types";
import {
  REMINDER_ALERT_PRESETS,
  isReminderOverdue,
  isRecurringReminder,
  oQueFaltaNoLembrete,
  oZapVaiSair,
  reminderTargetMs,
} from "@/lib/board/reminder-alerts";
import type { Reminder, ReminderStatus, Repeat } from "@/lib/types";
import { DateField } from "./DateField";
import { TutorialLink } from "./TutorialLink";

const REPEATS: { v: Repeat; l: string }[] = [
  { v: "none", l: "Não repete" },
  { v: "daily", l: "Todo dia" },
  { v: "weekly", l: "Toda semana" },
  { v: "monthly", l: "Mensalmente" },
  { v: "yearly", l: "Anualmente" },
];

const REPEAT_SHORT: Record<Repeat, string> = {
  none: "",
  daily: "todo dia",
  weekly: "toda semana",
  monthly: "mensal",
  yearly: "anual",
};

type ReminderFilter = "todos" | "recorrentes" | "hoje" | "semana" | "atrasados";

const REMINDER_FILTERS: { v: ReminderFilter; l: string }[] = [
  { v: "todos", l: "Todos" },
  { v: "recorrentes", l: "Recorrentes" },
  { v: "hoje", l: "Hoje" },
  { v: "semana", l: "Semana" },
  { v: "atrasados", l: "Atrasados" },
];

function matchesReminderFilter(r: Reminder, filter: ReminderFilter, today: string, weekEnd: string): boolean {
  if (filter === "todos") return true;
  if (filter === "recorrentes") return isRecurringReminder(r);
  if (filter === "atrasados") return isReminderOverdue(r);
  if (filter === "hoje") return r.date === today;
  if (filter === "semana") return !!r.date && r.date >= today && r.date <= weekEnd;
  return true;
}

// Ordena pelos mais próximos primeiro (vencidos: o que venceu há mais tempo primeiro);
// sem data marcada fica sempre por último.
function sortByClosestDate(list: Reminder[]): Reminder[] {
  return [...list].sort((a, b) => {
    const ta = reminderTargetMs(a);
    const tb = reminderTargetMs(b);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });
}

export interface ReminderScheduleFields {
  date: string | null;
  time: string | null;
  repeat: Repeat;
  weekDays: number[] | null;
  alertMinutesBefore: number | null;
}

export function ReminderDateButton({
  date,
  time,
  repeat,
  weekDays,
  alertMinutesBefore,
  onSave,
  emptyLabel = "Definir data",
  whatsapp,
  onWhatsappChange,
  sugestaoData,
  sugestaoHora,
}: ReminderScheduleFields & {
  onSave: (fields: ReminderScheduleFields & { whatsapp?: boolean }) => void;
  emptyLabel?: string;
  /** Presente quando a tela aceita o zap. `false` num lembrete que ainda não
   *  existe é o estado normal — a opção aparece desde o começo. */
  whatsapp?: boolean;
  onWhatsappChange?: (ligado: boolean) => void;
  /** Data e hora para já vir preenchido quando o lembrete ainda não tem (a da tarefa a que ele pertence). */
  sugestaoData?: string | null;
  sugestaoHora?: string | null;
}) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const open = anchorRect !== null;
  const [dateDraft, setDateDraft] = useState(date ?? "");
  const [timeDraft, setTimeDraft] = useState(time ?? "");
  const [repeatDraft, setRepeatDraft] = useState<Repeat>(repeat);
  const [weekDraft, setWeekDraft] = useState<number[]>(weekDays ?? []);
  const [alertDraft, setAlertDraft] = useState<number | null>(alertMinutesBefore);
  const [zapDraft, setZapDraft] = useState(whatsapp ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, popRef);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).closest?.(".time-picker-pop")) return;
      setAnchorRect(null);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (open) {
      setAnchorRect(null);
      return;
    }
    setDateDraft(date ?? sugestaoData ?? "");
    setTimeDraft(time ?? (date ? "" : (sugestaoHora ?? "")));
    setRepeatDraft(repeat);
    setWeekDraft(weekDays ?? []);
    setAlertDraft(alertMinutesBefore);
    setZapDraft(whatsapp ?? false);
    setErro(null);
    if (btnRef.current) {
      setAnchorRect(btnRef.current.getBoundingClientRect());
    }
  }

  function toggleWeekDay(d: number) {
    setWeekDraft((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function save() {
    const nextDate = dateDraft || null;
    const hasWeekDays = weekDraft.length > 0 && weekDraft.length < 7;

    // O zap aceso exige quando mandar. Em vez de travar o botão, cobra aqui e
    // diz o que falta — a pessoa marcou o que queria e só precisa completar.
    if (zapDraft && !nextDate && !hasWeekDays) {
      setErro("Pra avisar no WhatsApp, coloque uma data (ou marque os dias da semana).");
      return;
    }
    if (zapDraft && !timeDraft) {
      setErro("Pra avisar no WhatsApp, coloque também a hora.");
      return;
    }
    onSave({
      date: nextDate,
      time: nextDate || hasWeekDays ? timeDraft || null : null,
      repeat: hasWeekDays ? "none" : nextDate ? repeatDraft : "none",
      weekDays: hasWeekDays ? [...weekDraft].sort((a, b) => a - b) : null,
      // Zap aceso sem aviso escolhido recebe o padrão: o motor de envio só
      // olha lembrete com antecedência preenchida, e sem isso o verde que ele
      // acabou de acender não sairia.
      alertMinutesBefore:
        nextDate || hasWeekDays ? (alertDraft ?? 0) : null,
      // Só manda o campo quando ESTA tela usa a opção. Sem isso, os três outros
      // lugares que abrem este mesmo popover (a tabela de Lembretes) passariam
      // a salvar `whatsapp: false` e apagariam em silêncio o zap que ele tinha
      // acendido na coluna ao lado.
      // E sem aviso não há quando mandar, então nunca sai ligado daqui.
      ...(whatsapp !== undefined ? { whatsapp: zapDraft } : {}),
    });
    setAnchorRect(null);
  }

  const alertLabel = REMINDER_ALERT_PRESETS.find((p) => p.v === alertMinutesBefore)?.l;
  const weekLabel =
    weekDays && weekDays.length > 0 && weekDays.length < 7
      ? [...weekDays].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(",")
      : null;
  const hasSchedule = !!date || !!weekLabel;
  const label = hasSchedule
    ? [
        date ? fmtDayMonth(date) + (time ? ` às ${time}` : "") : null,
        weekLabel,
        repeat !== "none" ? REPEAT_SHORT[repeat] : null,
        alertMinutesBefore !== null && alertMinutesBefore > 0 ? `aviso ${alertLabel}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={"reminder-date-btn" + (hasSchedule ? " has-date" : "")}
        title={label ?? emptyLabel}
        onClick={toggleOpen}
      >
        <WeekIcon />
        <span className={label ? undefined : "reminder-date-empty"}>{label ?? emptyLabel}</span>
      </button>
      {open &&
        createPortal(
          <div className="daylog-popover" ref={popRef} style={{ top: pos.top, left: pos.left }}>
            <div className="reminder-datetime-row">
              <DateField
                autoFocus
                ariaLabel="Data do lembrete"
                value={dateDraft}
                onChange={setDateDraft}
                onKeyDown={(e) => e.key === "Escape" && setAnchorRect(null)}
              />
              <TimePicker
                value={timeDraft}
                disabled={!dateDraft && weekDraft.length === 0}
                onChange={setTimeDraft}
                onClear={() => setTimeDraft("")}
              />
              <button
                type="button"
                className="icon-btn reminder-clear-btn"
                disabled={!dateDraft && !timeDraft}
                title="Limpar data e hora"
                onClick={() => {
                  setDateDraft("");
                  setTimeDraft("");
                }}
              >
                <EraserIcon />
              </button>
            </div>
            <div className="edit-field">
              <span className="edit-field-label">Repete nesses dias da semana (opcional)</span>
              <div className="weekday-picker">
                {DAY_NAMES.map((label, d) => (
                  <button
                    key={d}
                    type="button"
                    className={"weekday-btn" + (weekDraft.includes(d) ? " active" : "")}
                    title={label}
                    onClick={() => toggleWeekDay(d)}
                  >
                    {label[0]}
                  </button>
                ))}
              </div>
            </div>
            <select
              className="reminder-repeat-select"
              value={weekDraft.length > 0 ? "none" : repeatDraft}
              disabled={!dateDraft || weekDraft.length > 0}
              title={weekDraft.length > 0 ? "Desativado — já repete nos dias da semana marcados acima" : undefined}
              onChange={(e) => setRepeatDraft(e.target.value as Repeat)}
            >
              {REPEATS.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.l}
                </option>
              ))}
            </select>
            <select
              className="reminder-repeat-select"
              value={alertDraft ?? 0}
              disabled={!dateDraft && weekDraft.length === 0}
              onChange={(e) => setAlertDraft(Number(e.target.value))}
            >
              {REMINDER_ALERT_PRESETS.map((p) => (
                <option key={p.l} value={p.v ?? 0}>
                  {p.l}
                </option>
              ))}
            </select>
            {/* O zap mora aqui, junto do "quando" — era um ícone solto na linha
                da tarefa e ele não achava ("ficou muito perdido"). Decidir que
                avisa e decidir por onde avisa é a mesma decisão, e agora é feita
                no mesmo lugar.
                Exige aviso marcado pela regra de sempre: sem aviso não existe
                quando mandar, e o verde não pode prometer o que não sai. */}
            {/* Sempre visível e sempre clicável. Antes ela ficava inerte sem
                aviso marcado, e ele achou que estava quebrada: "o botãozinho
                fica tipo uma bolinha, não dá pra marcar". Esconder ou travar um
                controle porque falta OUTRO campo faz a pessoa procurar defeito
                onde não tem. Acende, e quem cobra os campos é o salvar. */}
            {whatsapp !== undefined && (
              <button
                type="button"
                className={"reminder-zap-opcao" + (zapDraft ? " ativo" : "")}
                onClick={() => {
                  const novo = !zapDraft;
                  setZapDraft(novo);
                  setErro(null);
                  // Com lembrete já existente, aplica na hora; sem ele, o
                  // rascunho viaja no salvar e vale na criação.
                  onWhatsappChange?.(novo);
                }}
              >
                <WhatsAppIcon filled={zapDraft} />
                <span>Avisar no WhatsApp</span>
              </button>
            )}
            {erro && <div className="reminder-zap-erro">{erro}</div>}
            <div className="edit-actions edit-actions-split">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!dateDraft && !timeDraft && weekDraft.length === 0 && repeatDraft === "none" && alertDraft == null}
                title="Limpar data, hora, dias da semana e aviso"
                onClick={() => {
                  setDateDraft("");
                  setTimeDraft("");
                  setWeekDraft([]);
                  setRepeatDraft("none");
                  setAlertDraft(null);
                }}
              >
                <EraserIcon /> Limpar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAnchorRect(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-accent" onClick={save}>
                Salvar
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Agendados e Concluídos podem ser recolhidos pra tirar volume da tela; os
// Vencidos ficam sempre abertos de propósito, porque são o que precisa de ação.
function CollapsibleReminderSection({
  storageKey,
  label,
  labelClass,
  count,
  reminders,
  icon,
  defaultOpen = true,
  nota,
}: {
  nota?: string;
  storageKey: string;
  label: string;
  labelClass: string;
  count: number;
  reminders: Reminder[];
  icon?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return defaultOpen;
    const saved = localStorage.getItem(storageKey);
    return saved === null ? defaultOpen : saved === "1";
  });

  function toggle() {
    setOpen((v) => {
      localStorage.setItem(storageKey, v ? "0" : "1");
      return !v;
    });
  }

  return (
    <div className="list-card">
      <button
        type="button"
        className={`list-card-section-label section-toggle ${labelClass}` + (open ? " open" : "")}
        aria-expanded={open}
        onClick={toggle}
      >
        {icon}
        {label}
        <span className="meetings-group-count">{count}</span>
        <ChevronIcon />
      </button>
      {open && (
        <div className="reminder-list">
          {nota && <div className="reminder-list-nota">{nota}</div>}
          {reminders.map((r) => (
            <ReminderRow key={r.id} reminder={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderStatusMenu({
  anchorRect,
  status,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  status: ReminderStatus;
  onSelect: (status: ReminderStatus) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useClampedPopoverPos(anchorRect, ref);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [onClose]);

  return createPortal(
    <div className="status-menu" ref={ref} style={{ top: pos.top, left: pos.left }}>
      <button
        type="button"
        className={"status-menu-item" + (status === "pending" ? " active" : "")}
        onClick={() => {
          onSelect("pending");
          onClose();
        }}
      >
        <span className="status-menu-dot" style={{ background: "var(--text-faint)" }} /> Pendente
      </button>
      <button
        type="button"
        className={"status-menu-item" + (status === "waiting" ? " active" : "")}
        onClick={() => {
          onSelect("waiting");
          onClose();
        }}
      >
        <span className="status-menu-dot" style={{ background: "#D9A400" }} /> Aguardando
      </button>
      <button
        type="button"
        className={"status-menu-item" + (status === "done" ? " active" : "")}
        onClick={() => {
          onSelect("done");
          onClose();
        }}
      >
        <CheckIcon /> Concluído
      </button>
    </div>,
    document.body
  );
}

// Concluir um lembrete com anexo pergunta se o arquivo pode ir embora.
// Documento de consulta (resultado de exame, comprovante) costuma ser
// descartável — guardar tudo pra sempre só entope o armazenamento. Cancelar
// mantém o anexo: na dúvida, não apaga.
function useConcluirLembrete() {
  const { board, askConfirm } = useBoardCtx();
  return (id: string) => {
    board.completeReminder(id);
    if (!board.state.attachmentKeys.has(`reminder:${id}`)) return;
    askConfirm("Esse lembrete tem anexo. Pode descartar o arquivo junto?", () => {
      void board.discardAttachmentsOf("reminder", id);
    });
  };
}

function reminderStatus(reminder: Reminder, overdue: boolean, dueToday: boolean) {
  if (reminder.done) return { label: "Concluído", cls: "status-done" };
  if (reminder.status === "waiting") return { label: "Aguardando", cls: "status-waiting" };
  if (overdue) return { label: "Vencido", cls: "status-overdue" };
  if (dueToday) return { label: "Hoje", cls: "status-today" };
  return { label: "Pendente", cls: "status-pending" };
}

// Linha em formato de cartão (sem cabeçalho de tabela): status, texto, de onde veio, data e os ícones no fim.
const ORIGEM_DO_LEMBRETE: Record<NonNullable<Reminder["sourceKind"]>, string> = {
  maintenance: "Manutenção",
  birthday: "Aniversário",
  medication: "Medicamento",
  diet_meal: "Dieta",
  event: "Evento",
  shopping: "Compras",
};

function ReminderDetailModal({ reminder, onClose }: { reminder: Reminder; onClose: () => void }) {
  const { board } = useBoardCtx();
  const [titleDraft, setTitleDraft] = useState(reminder.title);
  const [noteDraft, setNoteDraft] = useState(reminder.note ?? "");
  const noteDraftRef = useRef(noteDraft);

  useEffect(() => {
    noteDraftRef.current = noteDraft;
  }, [noteDraft]);

  const overdue = isReminderOverdue(reminder);
  const dueToday = !reminder.done && !overdue && reminder.date === todayISO();
  const isRecurring = isRecurringReminder(reminder);
  const status = reminderStatus(reminder, overdue, dueToday);

  // Auto-save a observação a cada 30s pra não perder texto se fechar sem clicar em Salvar.
  useEffect(() => {
    const id = setInterval(() => board.updateReminder(reminder.id, { note: noteDraftRef.current || null }), 30000);
    return () => clearInterval(id);
  }, [board, reminder.id]);

  function save() {
    const trimmedTitle = titleDraft.trim();
    board.updateReminder(reminder.id, { title: trimmedTitle || reminder.title, note: noteDraft || null });
    onClose();
  }

  return createPortal(
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel reminder-detail-sheet" role="dialog" aria-label="Detalhes do lembrete">
        <div className="modal-head">
          <span className={"reminder-status-chip " + status.cls}>
            {reminder.done && <CheckIcon />}
            {status.label}
          </span>
          <span className="modal-head-actions">
            <AttachmentsButton entityType="reminder" entityId={reminder.id} ariaLabel="Anexos do lembrete" />
            <button
              type="button"
              className="icon-btn danger-hover"
              title="Excluir lembrete"
              onClick={() => {
                board.deleteReminder(reminder.id);
                onClose();
              }}
            >
              <TrashIcon />
            </button>
          </span>
        </div>
        <input
          type="text"
          className="reminder-detail-title-input"
          value={titleDraft}
          autoFocus
          onChange={(e) => setTitleDraft(e.target.value)}
        />
        <div className="reminder-detail-meta">
          {isRecurring && (
            <span className="chip chip-recurring">
              <RepeatIcon /> Recorrente
            </span>
          )}
          <ReminderDateButton
            date={reminder.date}
            time={reminder.time}
            repeat={reminder.repeat}
            weekDays={reminder.weekDays}
            alertMinutesBefore={reminder.alertMinutesBefore}
            onSave={(fields) => board.updateReminder(reminder.id, fields)}
          />
        </div>
        <label className="edit-field">
          <span className="edit-field-label">Observação</span>
          <RichTextEditor
            value={noteDraft}
            onChange={setNoteDraft}
            placeholder="Cole um texto ou escreva algo..."
          />
        </label>
        {/* O anexo já existia, mas só como ícone no topo — ninguém achava.
            Aqui ele aparece com nome, igual à edição da tarefa. */}
        <div className="edit-field">
          <span className="edit-field-label">Anexos</span>
          <AttachmentsButton
            variant="field"
            entityType="reminder"
            entityId={reminder.id}
            ariaLabel="Anexos do lembrete"
          />
        </div>
        <div className="edit-actions" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" onClick={save}>
            Salvar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export function ReminderRow({ reminder }: { reminder: Reminder }) {
  const { board, focusRequest, consumeFocusRequest } = useBoardCtx();
  const concluir = useConcluirLembrete();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [statusAnchor, setStatusAnchor] = useState<DOMRect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  // O título cresce com o texto (quebra em várias linhas) para o lembrete aparecer inteiro.
  const tituloRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = tituloRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [titleDraft, reminder.title]);

  useEffect(() => {
    if (focusRequest?.kind === "reminder" && focusRequest.id === reminder.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reagindo a um pedido de foco vindo da busca (sistema externo)
      setDetailOpen(true);
      document.querySelector(`[data-id="${reminder.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      consumeFocusRequest("reminder", reminder.id);
    }
  }, [focusRequest, consumeFocusRequest, reminder.id]);

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== reminder.title) board.updateReminder(reminder.id, { title: trimmed });
    setTitleDraft(null);
  }

  function applyStatus(status: ReminderStatus) {
    if (status === "done") concluir(reminder.id);
    else board.updateReminder(reminder.id, { done: false, status });
  }

  const today = todayISO();
  const overdue = isReminderOverdue(reminder);
  const dueToday = !reminder.done && !overdue && reminder.date === today;
  const isRecurring = isRecurringReminder(reminder);
  const status = reminderStatus(reminder, overdue, dueToday);
  // Marcado E com quando mandar. Enquanto faltar um dos dois, o ícone fica
  // apagado mesmo que a coluna esteja true — o desenho não mente.
  const zapVaiSair = oZapVaiSair(reminder);

  // De onde veio: automático (manutenção, aniversário...) ou ligado a uma tarefa (Reunião / Tarefa).
  const tarefaLigada = reminder.taskId ? board.state.tasks.find((t) => t.id === reminder.taskId) : null;
  const origem = reminder.sourceKind
    ? ORIGEM_DO_LEMBRETE[reminder.sourceKind]
    : tarefaLigada
      ? entraEmReunioes(tarefaLigada)
        ? "Reunião"
        : "Tarefa"
      : null;
  const avisaNoApp = reminder.inApp !== false;

  return (
    <div
      data-id={reminder.id}
      className={
        "reminder-card-row" +
        (reminder.done ? " done" : "") +
        (overdue ? " overdue" : "") +
        (dueToday ? " due-today" : "")
      }
    >
      <button
        ref={statusBtnRef}
        type="button"
        className={"reminder-status-chip " + status.cls}
        title="Escolher status"
        onClick={() => setStatusAnchor(statusBtnRef.current?.getBoundingClientRect() ?? null)}
      >
        {reminder.done ? <CheckIcon /> : <span className="reminder-status-dot" aria-hidden="true" />}
        {status.label}
      </button>
      {statusAnchor && (
        <ReminderStatusMenu
          anchorRect={statusAnchor}
          status={reminder.status}
          onSelect={applyStatus}
          onClose={() => setStatusAnchor(null)}
        />
      )}
      <textarea
        ref={tituloRef}
        rows={1}
        className="reminder-title-input reminder-title-area"
        value={titleDraft ?? reminder.title}
        onChange={(e) => setTitleDraft(e.target.value.replace(/\n/g, " "))}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      />
      {origem && <span className="chip chip-oneoff reminder-origem">{origem}</span>}
      {isRecurring && (
        <span className="chip chip-recurring reminder-origem">
          <RepeatIcon /> Recorrente
        </span>
      )}
      <ReminderDateButton
        date={reminder.date}
        time={reminder.time}
        repeat={reminder.repeat}
        weekDays={reminder.weekDays}
        alertMinutesBefore={reminder.alertMinutesBefore}
        onSave={(fields) => board.updateReminder(reminder.id, fields)}
      />
      <span className="reminder-icones">
        {/* Sino: avisa dentro do app (banner e Agenda). O push no celular continua chegando. */}
        <button
          type="button"
          className={"icon-btn" + (avisaNoApp ? " active" : "")}
          title={avisaNoApp ? "Avisa dentro do app. Clique pra desligar." : "Não avisa dentro do app (só no celular). Clique pra ligar."}
          onClick={() => board.updateReminder(reminder.id, { inApp: !avisaNoApp })}
        >
          <BellIcon />
        </button>
        {/* Verde quer dizer uma coisa só: ESSA mensagem vai sair. Por isso o aceso
            depende de ter data — sem data não há quando mandar. E o botão nunca
            fica travado aceso: travado e verde era o estado em que ele não
            conseguia desmarcar. Acender sem aviso marcado já põe o aviso padrão,
            senão o verde seria promessa falsa. */}
        <button
          className={"icon-btn zap-btn" + (zapVaiSair ? " active" : "")}
          type="button"
          disabled={reminder.date === null}
          title={
            reminder.date === null
              ? "Coloque uma data primeiro — sem data não há quando mandar"
              : zapVaiSair
                ? "Chega no WhatsApp. Clique pra desligar."
                : "Só avisa dentro do app. Clique pra mandar no WhatsApp também."
          }
          onClick={() =>
            board.updateReminder(
              reminder.id,
              zapVaiSair
                ? { whatsapp: false }
                : {
                    whatsapp: true,
                    alertMinutesBefore: reminder.alertMinutesBefore ?? 0,
                  }
            )
          }
        >
          <WhatsAppIcon filled={zapVaiSair} />
        </button>
        <CommentButton
          alwaysExpanded
          value={reminder.note}
          placeholder="Observação — cole um texto ou escreva algo..."
          ariaLabel="Observação do lembrete"
          onSave={(text) => board.updateReminder(reminder.id, { note: text || null })}
        />
        <button
          type="button"
          className="icon-btn reminder-abrir-btn"
          title="Abrir lembrete completo (texto e observação)"
          onClick={() => setDetailOpen(true)}
        >
          <ExpandIcon />
          <span className="reminder-abrir-rotulo">Abrir</span>
        </button>
        <button className="icon-btn danger-hover" type="button" title="Excluir" onClick={() => board.deleteReminder(reminder.id)}>
          <TrashIcon />
        </button>
      </span>
      {detailOpen && <ReminderDetailModal reminder={reminder} onClose={() => setDetailOpen(false)} />}
    </div>
  );
}

// Versão compacta (linha única, sem grid) pro popover estreito do sininho.
function ReminderCompactRow({ reminder }: { reminder: Reminder }) {
  const { board } = useBoardCtx();
  const concluir = useConcluirLembrete();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== reminder.title) board.updateReminder(reminder.id, { title: trimmed });
    setTitleDraft(null);
  }

  const today = todayISO();
  const overdue = isReminderOverdue(reminder);
  const dueToday = !reminder.done && !overdue && reminder.date === today;
  const isRecurring = isRecurringReminder(reminder);

  return (
    <div
      className={
        "reminder-row" + (reminder.done ? " done" : "") + (overdue ? " overdue" : "") + (dueToday ? " due-today" : "")
      }
    >
      <button
        type="button"
        className={"reminder-check" + (reminder.done ? " done" : "")}
        title={reminder.done ? "Marcar como não concluído" : "Marcar como concluído"}
        onClick={() =>
          reminder.done
            ? board.updateReminder(reminder.id, { done: false, status: "pending" })
            : concluir(reminder.id)
        }
      >
        {reminder.done && <CheckIcon />}
      </button>
      <input
        type="text"
        className="reminder-title-input"
        value={titleDraft ?? reminder.title}
        onChange={(e) => setTitleDraft(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      />
      {isRecurring && (
        <span className="chip chip-recurring">
          <RepeatIcon />
        </span>
      )}
      <ReminderDateButton
        date={reminder.date}
        time={reminder.time}
        repeat={reminder.repeat}
        weekDays={reminder.weekDays}
        alertMinutesBefore={reminder.alertMinutesBefore}
        onSave={(fields) => board.updateReminder(reminder.id, fields)}
      />
      <button
        className="icon-btn danger-hover"
        type="button"
        title="Excluir"
        onClick={() => board.deleteReminder(reminder.id)}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

export function RemindersButton({ onOpenFull }: { onOpenFull: () => void }) {
  const { board } = useBoardCtx();
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [faltando, setFaltando] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: MouseEvent) {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      // Ignora cliques dentro de popovers filhos (ex.: o seletor de data de um lembrete),
      // que são portais próprios pra document.body e não ficam "dentro" de popRef no DOM.
      if ((e.target as HTMLElement).closest?.(".daylog-popover")) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocPointerDown);
    return () => window.removeEventListener("mousedown", onDocPointerDown);
  }, [open]);

  const today = todayISO();
  const pending = [...board.state.reminders]
    .filter((r) => !r.done)
    .sort((a, b) => (a.date ?? "9999-99-99").localeCompare(b.date ?? "9999-99-99"));
  const overdueCount = pending.filter((r) => isReminderOverdue(r)).length;
  const dueTodayCount = pending.filter((r) => r.date === today && !isReminderOverdue(r)).length;
  const hasOverdue = overdueCount > 0;
  const hasDueToday = dueTodayCount > 0;
  const badgeCount = hasOverdue ? overdueCount : dueTodayCount;

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  async function handleAdd(cobrando = true) {
    const title = newTitle.trim();
    if (!title) return;
    // Mesma regra da tela cheia: esta é a OUTRA porta de criação, e deixar ela
    // criar lembrete sem data faria a trava valer só metade das vezes.
    const falta = oQueFaltaNoLembrete(newDate, newTime);
    if (falta) {
      if (cobrando) setFaltando(falta);
      return;
    }
    setFaltando(null);
    setNewTitle("");
    const ok = await board.addReminder(title, newDate, newTime);
    if (!ok) setNewTitle(title);
    else {
      setNewDate("");
      setNewTime("");
    }
  }

  return (
    <>
      <button ref={btnRef} type="button" className="reminders-btn" onClick={toggleOpen}>
        <span className={"reminders-btn-bell" + (hasOverdue ? " overdue" : hasDueToday ? " due-today" : "")}>
          <BellIcon filled={hasOverdue || hasDueToday} />
          {badgeCount > 0 && <span className="reminders-btn-count">{badgeCount > 9 ? "9+" : badgeCount}</span>}
        </span>
        Lembretes
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="reminders-popover" ref={popRef} style={{ top: pos.top, right: pos.right }}>
            <div className="reminders-popover-head">
              <span>Lembretes</span>
              <button
                type="button"
                className="reminders-popover-viewall"
                onClick={() => {
                  setOpen(false);
                  onOpenFull();
                }}
              >
                Ver todos
              </button>
            </div>
            <div className="quickadd-row">
              <span className="quickadd-plus" aria-hidden="true">
                +
              </span>
              <input
                type="text"
                className="quickadd-input"
                placeholder="Adicionar lembrete"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            {/* Data e hora em linha própria: o popover tem 340px e os três
                campos lado a lado ficariam apertados demais pra acertar. */}
            <div className="reminders-pop-quando">
              <DateField
                className="budget-input"
                ariaLabel="Data do lembrete"
                value={newDate}
                onChange={(iso) => {
                  setNewDate(iso);
                  setFaltando(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <TimePicker
                value={newTime}
                onChange={(v) => {
                  setNewTime(v);
                  setFaltando(null);
                }}
                onClear={() => setNewTime("")}
              />
              <button
              type="button"
              className="quickadd-enviar"
              aria-label="Adicionar o lembrete"
              title="Adicionar o lembrete"
              // Sem isto o clique tira o foco do título antes de enviar e o teclado do celular fecha no meio.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd()}
            >
              <SendIcon />
            </button>
            </div>
            {faltando && <div className="reminder-zap-erro">{faltando}</div>}
            {pending.length === 0 ? (
              <div className="hp-empty">Nenhum lembrete pendente.</div>
            ) : (
              <div className="reminders-popover-list">
                {pending.map((r) => (
                  <ReminderCompactRow key={r.id} reminder={r} />
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export function RemindersView({ onBack, onOpenMeetings }: { onBack: () => void; onOpenMeetings?: () => void }) {
  const { board } = useBoardCtx();
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<ReminderFilter>("todos");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  // Como avisar este lembrete novo: quanto antes, no app (sininho, ligado) e no WhatsApp (desligado até a pessoa pedir).
  const [newAntes, setNewAntes] = useState(0);
  const [newZap, setNewZap] = useState(false);
  const [newSino, setNewSino] = useState(true);
  const [faltando, setFaltando] = useState<string | null>(null);
  const openMeetingsCount = board.state.tasks.filter(
    (t) => entraEmReunioes(t) && countOpenChecklistItems(t.note) > 0
  ).length;

  async function handleAdd(cobrando = true) {
    const title = newTitle.trim();
    if (!title) return;

    // Data e hora são obrigatórias pra nascer.
    //
    // Antes o Enter salvava só com o título e o lembrete nascia sem quando —
    // e lembrete sem quando não avisa nada, não entra na agenda e não dá pra
    // atrasar: é uma linha morta que ele ia ter que caçar depois pra arrumar.
    // A trava é no criar, não no editar: os lembretes antigos sem data
    // continuam editáveis e o "Limpar" do editor continua existindo.
    const falta = oQueFaltaNoLembrete(newDate, newTime);
    if (falta) {
      // Só o Enter cobra. No `blur` ficaria chato: clicar no campo de data pra
      // preencher tira o foco do título e levaria uma bronca por não ter
      // preenchido ainda o campo que ele acabou de abrir pra preencher.
      if (cobrando) setFaltando(falta);
      return;
    }

    setFaltando(null);
    setNewTitle("");
    const ok = await board.addReminder(title, newDate, newTime, { alertMinutesBefore: newAntes, whatsapp: newZap, inApp: newSino });
    if (!ok) setNewTitle(title);
    else {
      setNewDate("");
      setNewTime("");
    }
  }

  const today = todayISO();
  const weekEnd = isoAddDays(today, 7);
  const filtered = board.state.reminders.filter((r) => matchesReminderFilter(r, filter, today, weekEnd));
  const notDone = filtered.filter((r) => !r.done);

  /**
   * Lembrete que o FARO criou sozinho fica em seção separada.
   *
   * Acender o zap num remédio, numa refeição ou numa manutenção cria um
   * lembrete de verdade — é assim que o disparo, o teto de gasto e o registro
   * de entrega são os mesmos pra tudo. Só que eles apareciam no meio da lista
   * dele: *"eu gostaria que lá onde eu marquei já ficasse pronto pra disparar...
   * para não se misturar com os que já estão aqui, eu não gostei disso"*.
   *
   * Sumir com eles seria pior: ele perderia a visão do que vai ser enviado, e
   * um lembrete que existe e não aparece em lugar nenhum é pior que um fora de
   * lugar. Então ficam, recolhidos por padrão, embaixo dos dele. Quem manda
   * neles continua sendo o ícone da tela de origem.
   */
  const meus = notDone.filter((r) => !r.sourceKind);
  const automaticos = sortByClosestDate(notDone.filter((r) => !!r.sourceKind));

  const overdue = sortByClosestDate(meus.filter((r) => isReminderOverdue(r)));
  const hojeLista = sortByClosestDate(meus.filter((r) => !isReminderOverdue(r) && r.date === today));
  const proximos = sortByClosestDate(meus.filter((r) => !isReminderOverdue(r) && r.date !== today));
  const done = filtered.filter((r) => r.done);

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Lembretes</span>
        <TutorialLink secao="lembretes" />
      </div>

      <div className="narrow-list reminders-wide">
        {openMeetingsCount > 0 && (
          <button type="button" className="meetings-pautas-banner" onClick={onOpenMeetings}>
            <UsersGroupIcon />
            <span>
              {openMeetingsCount} reunião{openMeetingsCount > 1 ? "ões" : ""} com pauta em aberto — clique pra ver
              em Reuniões
            </span>
          </button>
        )}
        <div className="list-quickadd-card">
          <div className="quickadd-row">
            <span className="quickadd-plus" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              className="quickadd-input"
              placeholder="Adicionar lembrete e pressionar Enter"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              onBlur={() => handleAdd(false)}
            />
            {/* Data e hora aqui na criação: antes o lembrete nascia sem data e
                ele tinha que procurar a linha no fim da lista pra preencher. */}
            <DateField
              className="budget-input reminder-new-date"
              ariaLabel="Data do lembrete"
              value={newDate}
              onChange={(iso) => {
                setNewDate(iso);
                setFaltando(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            {/* O mesmo seletor de hora do resto do app. Aqui era um
                `input type="time"` cru — o único que sobrou no FARO: desenho
                diferente de todos os outros campos de hora e sem o "Limpar"
                que eles têm. */}
            <TimePicker
              value={newTime}
              className="reminder-new-time"
              onChange={(v) => {
                setNewTime(v);
                setFaltando(null);
              }}
              onClear={() => setNewTime("")}
            />
            <MicButton onText={(t) => setNewTitle((v) => (v ? `${v} ${t}` : t))} ariaLabel="Ditar o lembrete" />
            <button
              type="button"
              className="quickadd-enviar"
              aria-label="Adicionar o lembrete"
              title="Adicionar o lembrete"
              // Sem isto o clique tira o foco do título antes de enviar e o teclado do celular fecha no meio.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAdd()}
            >
              <SendIcon />
            </button>
          </div>
          <div className="reminder-novo-avisos">
            <span className="reminder-novo-rotulo">Avisar</span>
            <select aria-label="Quando avisar" className="aviso-select" value={newAntes} onChange={(e) => setNewAntes(Number(e.target.value))}>
              {REMINDER_ALERT_PRESETS.map((p) => (
                <option key={p.l} value={p.v ?? 0}>
                  {p.l}
                </option>
              ))}
            </select>
            {/* Os mesmos dois ícones que cada lembrete da lista tem: sininho (dentro do app) e WhatsApp. */}
            <span className="reminder-icones">
              <button
                type="button"
                className={"icon-btn" + (newSino ? " active" : "")}
                aria-pressed={newSino}
                title={newSino ? "Avisa dentro do app. Clique pra desligar." : "Não avisa dentro do app. Clique pra ligar."}
                onClick={() => setNewSino((v) => !v)}
              >
                <BellIcon filled={newSino} />
              </button>
              <button
                type="button"
                className={"icon-btn zap-btn" + (newZap ? " active" : "")}
                aria-pressed={newZap}
                title={newZap ? "Também chega no WhatsApp. Clique pra desligar." : "Só avisa no app. Clique pra mandar no WhatsApp também."}
                onClick={() => setNewZap((v) => !v)}
              >
                <WhatsAppIcon filled={newZap} />
              </button>
            </span>
            <span className="reminder-novo-estado">{newSino && newZap ? "no app e no WhatsApp" : newZap ? "no WhatsApp" : newSino ? "no app" : "só o push do celular"}</span>
          </div>
          {faltando && <div className="reminder-zap-erro">{faltando}</div>}
        </div>

        <div className="reminder-filter-bar">
          <span className="reminder-filter-label">Filtrar por:</span>
          <div className="view-toggle reminder-filter-row">
            {REMINDER_FILTERS.map((f) => (
              <button
                key={f.v}
                type="button"
                className={"view-toggle-btn" + (filter === f.v ? " active" : "")}
                onClick={() => setFilter(f.v)}
              >
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {overdue.length === 0 && hojeLista.length === 0 && proximos.length === 0 && done.length === 0 && automaticos.length === 0 && (
          <div className="list-card">
            <div className="hp-empty">
              {filter === "todos" ? "Nenhum lembrete ainda." : "Nenhum lembrete encontrado com esse filtro."}
            </div>
          </div>
        )}

        {overdue.length > 0 && (
          <CollapsibleReminderSection
            storageKey="faro-lembretes-atrasados"
            label="Atrasados"
            labelClass="overdue-label"
            count={overdue.length}
            reminders={overdue}
          />
        )}

        {hojeLista.length > 0 && (
          <CollapsibleReminderSection
            storageKey="faro-lembretes-hoje"
            label="Hoje"
            labelClass="pending-label"
            count={hojeLista.length}
            reminders={hojeLista}
          />
        )}

        {proximos.length > 0 && (
          <CollapsibleReminderSection
            storageKey="faro-lembretes-proximos"
            label="Próximos"
            labelClass="pending-label"
            count={proximos.length}
            reminders={proximos}
          />
        )}

        {automaticos.length > 0 && (
          <CollapsibleReminderSection
            storageKey="faro-lembretes-automaticos"
            label="Vindos de outras telas"
            nota="Lembretes criados por Manutenção, Aniversários, Medicamentos e Dieta ficam separados dos seus, para não misturar."
            labelClass="pending-label"
            count={automaticos.length}
            defaultOpen={false}
            reminders={automaticos}
          />
        )}

        {done.length > 0 && (
          <CollapsibleReminderSection
            storageKey="faro-lembretes-concluidos"
            label="Concluídos"
            labelClass="done-label"
            count={done.length}
            defaultOpen={false}
            reminders={done}
            icon={<CheckIcon />}
          />
        )}
      </div>
    </div>
  );
}
