"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TablesUpdate } from "@/lib/database.types";
import {
  attachmentToInsertRow,
  bookToInsertRow,
  bookToUpdateRow,
  buildRecurring,
  checklistToInsertRow,
  checklistToUpdateRow,
  dietMealToInsertRow,
  dietMealToUpdateRow,
  medicationGroupToInsertRow,
  medicationGroupToUpdateRow,
  medicationToInsertRow,
  medicationToUpdateRow,
  projectToInsertRow,
  projectToUpdateRow,
  reminderToInsertRow,
  reminderToUpdateRow,
  rowToActiveTimer,
  rowToBook,
  rowToSynapse,
  rowToShoppingItem,
  rowToShoppingList,
  rowToKnowledgeItem,
  shoppingToInsertRow,
  shoppingToUpdateRow,
  synapseToInsertRow,
  rowToChecklist,
  rowToTaskTimeEntry,
  rowToStudyPlan,
  rowToTaskPostponement,
  rowToMaintenanceAsset,
  rowToOdometerReading,
  rowToMaintenanceItem,
  rowToMaintenanceService,
  maintenanceItemToUpdateRow,
  studyPlanToInsertRow,
  studyPlanToUpdateRow,
  rowToDailyLog,
  rowToDietMeal,
  rowToMedication,
  rowToMedicationGroup,
  rowToAttachment,
  rowToProject,
  rowToReminder,
  rowToSeries,
  rowToSettings,
  rowToTask,
  rowToTaskStatus,
  seriesToInsertRow,
  seriesToUpdateRow,
  taskStatusToInsertRow,
  taskStatusToUpdateRow,
  taskToInsertRow,
  taskToRow,
} from "@/lib/board/mappers";
import { isoAddDays, occurrenceDates, todayISO } from "@/lib/date-utils";
import { studyDatesInRange } from "@/lib/board/study-plan";
import { lembreteDaMedicacao, lembreteDaRefeicao, lembretesDaManutencao } from "@/lib/board/zap-engine";
import { aoMarcarComprado, lembreteDaCompra } from "@/lib/board/compras";
import { maintenanceStatus } from "@/lib/board/maintenance";
import {
  isRecurringReminder,
  nextReminderOccurrenceDate,
  oQueFaltaNoLembrete,
} from "@/lib/board/reminder-alerts";
import { reportSaveError } from "@/lib/board/error-toast";

const TIMER_ENTRY_NOTE = "Cronômetro";
import type {
  ActiveTimer,
  Attachment,
  AttachmentEntityType,
  Book,
  BoardState,
  Category,
  Checklist,
  ChecklistItem,
  TaskTimeEntry,
  StudyPlan,
  TaskPostponement,
  MaintenanceAsset,
  MaintenanceItem,
  MaintenanceService,
  OdometerReading,
  DailyLog,
  DayLog,
  DayLogEntry,
  DietMeal,
  Medication,
  MedicationGroup,
  Priority,
  Project,
  Repeat,
  RecurringItem,
  Reminder,
  ScopeChoice,
  Settings,
  Synapse,
  ShoppingItem,
  ShoppingList,
  KnowledgeItem,
  Task,
  TaskSeries,
  TaskStatus,
  TimerKind,
} from "@/lib/types";
import { DEFAULT_TAG_COLORS, isMeetingTask } from "@/lib/types";

const EMPTY_STATE: BoardState = {
  tasks: [],
  taskTimeEntries: [],
  studyPlans: [],
  taskPostponements: [],
  maintenanceAssets: [],
  odometerReadings: [],
  maintenanceItems: [],
  maintenanceServices: [],
  trashedTasks: [],
  projects: [],
  habits: [],
  fixedBlocks: [],
  dietMeals: [],
  taskSeries: [],
  taskStatuses: [],
  books: [],
  synapses: [],
  shoppingItems: [],
  shoppingLists: [],
  knowledgeItems: [],
  reminders: [],
  trashedReminders: [],
  medications: [],
  medicationGroups: [],
  checklists: [],
  settings: {
    whatsappMsgCostUsd: 0.0068,
    iaMonthlyCapBrl: 20,
    whatsappMonthlyCapBrl: 20,
    whatsappUsdBrl: 5.1,
    bgTone: null,
    bgIntensity: null,
    backupAreas: null,
    backupName: null,
    tagColors: DEFAULT_TAG_COLORS,
    dailyBudgetHours: 12,
    waterGoalMl: 2000,
    featureFlags: {},
    avatarUrl: null,
    preferredName: null,
    birthDate: null,
    notifyPhone: null,
    timezone: null,
    waterStrategies: null,
    dietPlan: null,
    dietAppOptIn: true,
    dietWhatsappOptIn: false,
  },
  activeTimers: [],
  dailyLogs: {},
  attachmentKeys: new Set(),
};

export interface TaskEditFields {
  title: string;
  category: Category;
  category2: Category | null;
  priority: Priority;
  date: string | null;
  time: string;
  endDate: string | null;
  endTime: string | null;
  durationMin: number | null;
  note: string;
  repeat: Repeat;
  projectId: string | null;
  client: string | null;
}

function uid(): string {
  return crypto.randomUUID();
}

// Mesmo alfabeto do default do banco (public.faro_task_code): sem 0/O/1/I/L, pra
// não dar dúvida na hora de ler o código na tela ou digitar de novo na busca.
const TASK_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomTaskCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += TASK_CODE_ALPHABET[Math.floor(Math.random() * TASK_CODE_ALPHABET.length)];
  }
  return out;
}

const ATTACHMENT_EXTRACTABLE_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function bucketOf(t: Pick<Task, "date">): string {
  return t.date || "";
}

export function useBoard(userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<BoardState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const stateRef = useRef(state);

  const apply = useCallback((producer: (s: BoardState) => BoardState) => {
    const next = producer(stateRef.current);
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [
      tasksRes,
      taskTimeEntriesRes,
      studyPlansRes,
      postponementsRes,
      maintAssetsRes,
      odometerRes,
      maintItemsRes,
      maintServicesRes,
      trashedTasksRes,
      projectsRes,
      habitsRes,
      blocksRes,
      habitLogsRes,
      blockLogsRes,
      blockLogEntriesRes,
      seriesRes,
      taskStatusesRes,
      booksRes,
      synapsesRes,
      shoppingRes,
      shoppingListsRes,
      knowledgeRes,
      remindersRes,
      trashedRemindersRes,
      medicationsRes,
      medicationGroupsRes,
      checklistsRes,
      dietMealsRes,
      settingsRes,
      timerRes,
      dailyLogsRes,
      attachmentKeysRes,
    ] = await Promise.all([
      supabase.from("tasks").select("*").is("deleted_at", null).order("sort_order"),
      supabase.from("task_time_entries").select("*").order("log_date"),
      supabase.from("study_plans").select("*").is("deleted_at", null).order("created_at"),
      supabase.from("task_postponements").select("*").order("created_at", { ascending: false }),
      supabase.from("maintenance_assets").select("*").is("deleted_at", null).order("sort_order"),
      supabase.from("maintenance_odometer_readings").select("*").order("read_on"),
      supabase.from("maintenance_items").select("*").is("deleted_at", null).order("sort_order"),
      supabase.from("maintenance_services").select("*").order("done_on", { ascending: false }),
      supabase.from("tasks").select("*").not("deleted_at", "is", null),
      supabase.from("projects").select("*").order("created_at"),
      supabase.from("habits").select("*").order("sort_order"),
      supabase.from("fixed_blocks").select("*").order("sort_order"),
      supabase.from("habit_logs").select("*"),
      supabase.from("fixed_block_logs").select("*"),
      supabase.from("fixed_block_log_entries").select("*"),
      supabase.from("task_series").select("*"),
      supabase.from("task_statuses").select("*").order("sort_order"),
      supabase.from("books").select("*").order("created_at"),
      supabase.from("synapses").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("shopping_items").select("*").is("deleted_at", null).order("sort_order"),
      supabase.from("shopping_lists").select("*").is("deleted_at", null).order("sort_order"),
      supabase.from("knowledge_items").select("*").is("deleted_at", null).order("created_at"),
      supabase.from("reminders").select("*").is("deleted_at", null).order("created_at"),
      supabase.from("reminders").select("*").not("deleted_at", "is", null),
      supabase.from("medications").select("*").order("created_at"),
      supabase.from("medication_groups").select("*").order("created_at"),
      // Pela ordem manual, não pela criação: é ele quem decide qual checklist
      // fica no topo. `nullsFirst: false` manda linha sem ordem (salva antes
      // desta coluna existir) pro fim, em vez de pro começo.
      supabase.from("checklists").select("*").order("sort_order", { ascending: true, nullsFirst: false }),
      supabase.from("diet_meals").select("*").order("meal_time"),
      supabase.from("settings").select("*").maybeSingle(),
      supabase.from("active_timer").select("*"),
      supabase.from("daily_logs").select("*"),
      supabase.from("attachments").select("entity_type, entity_id"),
    ]);

    const dailyLogs: Record<string, DailyLog> = {};
    (dailyLogsRes.data ?? []).forEach((row) => {
      dailyLogs[row.log_date] = rowToDailyLog(row);
    });

    const next: BoardState = {
      tasks: (tasksRes.data ?? []).map(rowToTask),
      taskTimeEntries: (taskTimeEntriesRes.data ?? []).map(rowToTaskTimeEntry),
      studyPlans: (studyPlansRes.data ?? []).map(rowToStudyPlan),
      taskPostponements: (postponementsRes.data ?? []).map(rowToTaskPostponement),
      maintenanceAssets: (maintAssetsRes.data ?? []).map(rowToMaintenanceAsset),
      odometerReadings: (odometerRes.data ?? []).map(rowToOdometerReading),
      maintenanceItems: (maintItemsRes.data ?? []).map(rowToMaintenanceItem),
      maintenanceServices: (maintServicesRes.data ?? []).map(rowToMaintenanceService),
      trashedTasks: (trashedTasksRes.data ?? []).map(rowToTask),
      projects: (projectsRes.data ?? []).map(rowToProject),
      habits: buildRecurring(habitsRes.data ?? [], habitLogsRes.data ?? [], "habit_id"),
      fixedBlocks: buildRecurring(blocksRes.data ?? [], blockLogsRes.data ?? [], "block_id", blockLogEntriesRes.data ?? []),
      taskSeries: (seriesRes.data ?? []).map(rowToSeries),
      taskStatuses: (taskStatusesRes.data ?? []).map(rowToTaskStatus),
      books: (booksRes.data ?? []).map(rowToBook),
      synapses: (synapsesRes.data ?? []).map(rowToSynapse),
      shoppingItems: (shoppingRes.data ?? []).map(rowToShoppingItem),
      shoppingLists: (shoppingListsRes.data ?? []).map(rowToShoppingList),
      knowledgeItems: (knowledgeRes.data ?? []).map(rowToKnowledgeItem),
      reminders: (remindersRes.data ?? []).map(rowToReminder),
      trashedReminders: (trashedRemindersRes.data ?? []).map(rowToReminder),
      medications: (medicationsRes.data ?? []).map(rowToMedication),
      medicationGroups: (medicationGroupsRes.data ?? []).map(rowToMedicationGroup),
      checklists: (checklistsRes.data ?? []).map(rowToChecklist),
      dietMeals: (dietMealsRes.data ?? []).map(rowToDietMeal),
      settings: rowToSettings(settingsRes.data ?? null),
      activeTimers: (timerRes.data ?? []).map(rowToActiveTimer),
      dailyLogs,
      attachmentKeys: new Set((attachmentKeysRes.data ?? []).map((r) => `${r.entity_type}:${r.entity_id}`)),
    };

    const today = todayISO();
    const isExpired = (startDate: string | null, durationDays: number | null) =>
      !!startDate && !!durationDays && today >= isoAddDays(startDate, durationDays);

    const expiredMeds = next.medications.filter((m) => m.active && isExpired(m.startDate, m.durationDays));
    if (expiredMeds.length > 0) {
      next.medications = next.medications.map((m) =>
        expiredMeds.some((e) => e.id === m.id) ? { ...m, active: false } : m
      );
      expiredMeds.forEach((m) => {
        supabase.from("medications").update({ active: false }).eq("id", m.id).then(({ error }) => {
          if (error) reportSaveError("auto-deactivate medication", error);
        });
      });
    }

    const expiredGroups = next.medicationGroups.filter((g) => g.active && isExpired(g.startDate, g.durationDays));
    if (expiredGroups.length > 0) {
      next.medicationGroups = next.medicationGroups.map((g) =>
        expiredGroups.some((e) => e.id === g.id) ? { ...g, active: false } : g
      );
      expiredGroups.forEach((g) => {
        supabase.from("medication_groups").update({ active: false }).eq("id", g.id).then(({ error }) => {
          if (error) reportSaveError("auto-deactivate medication group", error);
        });
      });
    }

    // "Rastrear": a tarefa aberta que ficou pra trás passa pra hoje. O banco
    // já faz isso de 10 em 10 minutos (faro_jobs.rolar_tarefas_que_seguem); aqui
    // é o mesmo gesto na hora de abrir, pra tela já nascer certa em vez de
    // mostrar a data velha até a próxima rodada. Escreve direto, sem passar pelo
    // registro de adiamentos: seguir não é adiar.
    const seguem = next.tasks.filter((t) => t.follows && !t.done && !t.deletedAt && t.date && t.date < today);
    if (seguem.length > 0) {
      const ids = new Set(seguem.map((t) => t.id));
      next.tasks = next.tasks.map((t) =>
        ids.has(t.id) ? { ...t, date: today, endDate: t.endDate && t.endDate < today ? null : t.endDate } : t
      );
      seguem.forEach((t) => {
        const fimAntes = !!t.endDate && t.endDate < today;
        supabase
          .from("tasks")
          .update(fimAntes ? { date: today, end_date: null } : { date: today })
          .eq("id", t.id)
          .then(({ error }) => {
            if (error) reportSaveError("task follows rollover", error);
          });
      });
    }

    stateRef.current = next;
    setState(next);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async data load, setState happens after awaits
    void load();
  }, [load]);

  // ---------- tasks ----------
  const defaultStatusId = useCallback(() => {
    const statuses = stateRef.current.taskStatuses;
    // O "agendado" fica de fora: tarefa nova nasce no primeiro status de
    // trabalho, não agendada.
    const notDone = statuses.filter((s) => !s.isDone && !s.isScheduled).sort((a, b) => a.order - b.order);
    return notDone[0]?.id ?? statuses.filter((s) => !s.isDone)[0]?.id ?? statuses[0]?.id ?? null;
  }, []);

  const scheduledStatusId = useCallback(
    () => stateRef.current.taskStatuses.find((s) => s.isScheduled)?.id ?? null,
    []
  );

  // Sorteia um código que ainda não está em uso (contando a Lixeira: uma tarefa
  // restaurada não pode colidir com outra criada depois). O banco tem índice
  // único como rede de segurança.
  const newTaskCode = useCallback(() => {
    const usados = new Set([
      ...stateRef.current.tasks.map((t) => t.code),
      ...stateRef.current.trashedTasks.map((t) => t.code),
    ]);
    for (let i = 0; i < 50; i++) {
      const code = randomTaskCode();
      if (!usados.has(code)) return code;
    }
    return randomTaskCode();
  }, []);

  const nextOrder = useCallback((bucketKey: string) => {
    const xs = stateRef.current.tasks.filter((t) => bucketOf(t) === bucketKey);
    if (!xs.length) return 0;
    return Math.max(...xs.map((t) => t.order || 0)) + 1;
  }, []);

  // Retorna se salvou de verdade — quem chama usa isso pra só limpar o campo de
  // "+ adicionar" em caso de sucesso; se falhar, desfaz o item otimista e devolve
  // false, pra quem chamou poder recolocar o texto digitado de volta no campo
  // (em vez do item sumir silenciosamente no próximo refresh, como aconteceu
  // em 03/09 por causa de uma constraint desatualizada no banco).
  const addTask = useCallback(
    async (
      bucketKey: string,
      title: string,
      // Campos que já nascem preenchidos quando a tarefa vem de um pedido por
      // voz ou texto ("amanhã às 10, prioridade alta"). Sem eles, o padrão de sempre.
      extras?: { time?: string; priority?: Priority; note?: string }
    ): Promise<boolean> => {
      if (!userId || !title.trim()) return false;
      const t: Task = {
        id: uid(),
        code: newTaskCode(),
        title: title.trim(),
        category: "sem_categoria",
        category2: null,
        priority: extras?.priority ?? "media",
        date: bucketKey || null,
        time: extras?.time ?? "",
        endDate: null,
        endTime: null,
        durationMin: null,
        expectedDurationMin: null,
        note: extras?.note ?? "",
        done: false,
        order: nextOrder(bucketKey),
        seriesId: null,
        studyPlanId: null,
        challenging: false,
        follows: false,
        isEvent: false,
        trackedSeconds: 0,
        quick: 0,
        statusId: defaultStatusId(),
        deletedAt: null,
        projectId: null,
        client: null,
      };
      apply((s) => ({ ...s, tasks: [...s.tasks, t] }));
      const { error } = await supabase.from("tasks").insert(taskToInsertRow(t, userId));
      if (error) {
        reportSaveError("addTask", error);
        apply((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) }));
        return false;
      }
      return true;
    },
    [apply, defaultStatusId, newTaskCode, nextOrder, supabase, userId]
  );

  const setTaskStatus = useCallback(
    (id: string, statusId: string) => {
      const status = stateRef.current.taskStatuses.find((s) => s.id === statusId);
      if (!status) return;
      const done = status.isDone;
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, statusId, done } : x)) }));
      supabase.from("tasks").update({ status_id: statusId, done }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setTaskStatus", error);
      });
    },
    [apply, supabase]
  );

  const setQuick = useCallback(
    (id: string, quick: 0 | 1 | 2 | 3) => {
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, quick } : x)) }));
      supabase.from("tasks").update({ quick }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setQuick", error);
      });
    },
    [apply, supabase]
  );

  const setPriority = useCallback(
    (id: string, priority: Priority) => {
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, priority } : x)) }));
      supabase.from("tasks").update({ priority }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setPriority", error);
      });
    },
    [apply, supabase]
  );

  const setCategory = useCallback(
    (id: string, category: Category, category2: Category | null) => {
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, category, category2 } : x)) }));
      supabase.from("tasks").update({ category, category2 }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setCategory", error);
      });
    },
    [apply, supabase]
  );

  const updateTaskNote = useCallback(
    (id: string, note: string) => {
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, note } : x)) }));
      supabase.from("tasks").update({ note }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateTaskNote", error);
      });
    },
    [apply, supabase]
  );

  const updateTaskTitle = useCallback(
    (id: string, title: string) => {
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, title } : x)) }));
      supabase.from("tasks").update({ title }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateTaskTitle", error);
      });
    },
    [apply, supabase]
  );

  const reorderBucket = useCallback(
    (bucketKey: string, orderedIds: string[]) => {
      apply((s) => ({
        ...s,
        tasks: s.tasks.map((t) => {
          const idx = orderedIds.indexOf(t.id);
          return idx === -1 ? t : { ...t, order: idx };
        }),
      }));
      orderedIds.forEach((id, idx) => {
        supabase.from("tasks").update({ sort_order: idx }).eq("id", id).then(({ error }) => {
          if (error) reportSaveError("reorderBucket", error);
        });
      });
    },
    [apply, supabase]
  );

  const duplicateTask = useCallback(
    (id: string) => {
      if (!userId) return;
      const t = stateRef.current.tasks.find((x) => x.id === id);
      if (!t) return;
      const myBucket = bucketOf(t);
      const myOrder = t.order || 0;
      const bumped = stateRef.current.tasks.map((x) =>
        bucketOf(x) === myBucket && (x.order || 0) > myOrder ? { ...x, order: (x.order || 0) + 1 } : x
      );
      const clone: Task = {
        ...t,
        id: uid(),
        // Cópia é outra tarefa: código novo, senão duas tarefas responderiam à
        // mesma busca (e o banco recusaria o segundo insert).
        code: newTaskCode(),
        done: false,
        order: myOrder + 1,
        durationMin: null,
        trackedSeconds: 0,
        seriesId: null,
        statusId: defaultStatusId(),
        deletedAt: null,
      };
      apply((s) => ({ ...s, tasks: [...bumped, clone] }));
      bumped
        .filter((x) => bucketOf(x) === myBucket && x.id !== t.id && (x.order || 0) > myOrder)
        .forEach((x) => {
          supabase.from("tasks").update({ sort_order: x.order }).eq("id", x.id).then(({ error }) => {
            if (error) reportSaveError("reordenar tarefas", error);
          });
        });
      supabase.from("tasks").insert(taskToInsertRow(clone, userId)).then(({ error }) => {
        if (error) reportSaveError("duplicateTask", error);
      });
    },
    [apply, defaultStatusId, newTaskCode, supabase, userId]
  );

  /**
   * Apagar a reunião/tarefa leva o lembrete dela junto pra lixeira.
   *
   * Sem isto o lembrete fica órfão e VIVO: ele não aparece mais vinculado a
   * nada, mas o motor do WhatsApp continua olhando só pro `deleted_at` dele e
   * dispara. Foi o que aconteceu com a "Reunião: Reuniao" — ele apagou a
   * reunião às 23:02 e a mensagem chegou às 01:50, quase três horas depois.
   *
   * O carimbo é o MESMO instante da tarefa, de propósito: é ele que diz, na
   * hora de restaurar, qual lembrete desceu junto e qual ele já tinha apagado
   * à mão antes — restaurar a reunião não pode ressuscitar um lembrete que ele
   * jogou fora por conta própria.
   */
  const levarLembretesJunto = useCallback(
    (taskIds: string[], nowIso: string) => {
      const alvos = stateRef.current.reminders.filter((r) => r.taskId && taskIds.includes(r.taskId));
      if (!alvos.length) return;
      const ids = alvos.map((r) => r.id);
      apply((s) => ({
        ...s,
        reminders: s.reminders.filter((r) => !ids.includes(r.id)),
        trashedReminders: [...s.trashedReminders, ...alvos.map((r) => ({ ...r, deletedAt: nowIso }))],
      }));
      supabase
        .from("reminders")
        .update({ deleted_at: nowIso })
        .in("id", ids)
        .then(({ error }) => {
          if (error) reportSaveError("apagar lembrete da tarefa", error);
        });
    },
    [apply, supabase]
  );

  const deleteTask = useCallback(
    (id: string, scope: ScopeChoice | null) => {
      const t = stateRef.current.tasks.find((x) => x.id === id);
      if (!t) return;

      const runningTimer = stateRef.current.activeTimers.find((at) => at.kind === "task" && at.itemId === id);
      if (runningTimer) {
        apply((s) => ({ ...s, activeTimers: s.activeTimers.filter((at) => at.id !== runningTimer.id) }));
        supabase.from("active_timer").delete().eq("id", runningTimer.id).then(({ error }) => {
          if (error) reportSaveError("parar cronômetro", error);
        });
      }

      const nowIso = new Date().toISOString();

      if (!t.seriesId || scope === "esta" || !scope) {
        apply((s) => ({
          ...s,
          tasks: s.tasks.filter((x) => x.id !== id),
          trashedTasks: [...s.trashedTasks, { ...t, deletedAt: nowIso }],
        }));
        supabase.from("tasks").update({ deleted_at: nowIso }).eq("id", id).then(({ error }) => {
          if (error) reportSaveError("deleteTask", error);
        });
        levarLembretesJunto([id], nowIso);
        if (t.seriesId) {
          const series = stateRef.current.taskSeries.find((sr) => sr.id === t.seriesId);
          if (series) {
            const skipped = [...series.skippedDates, t.date!].filter(Boolean) as string[];
            apply((s) => ({
              ...s,
              taskSeries: s.taskSeries.map((sr) => (sr.id === series.id ? { ...sr, skippedDates: skipped } : sr)),
            }));
            supabase
              .from("task_series")
              .update({ skipped_dates: skipped })
              .eq("id", series.id)
              .then(({ error }) => {
                if (error) reportSaveError("deleteTask skip", error);
              });
          }
        }
        return;
      }

      const today = todayISO();
      const seriesId = t.seriesId;
      const toDelete = stateRef.current.tasks
        .filter((x) => x.seriesId === seriesId && !x.done)
        .filter((x) => {
          if (x.id === id) return true;
          if (scope === "todas") return true;
          if (scope === "proximas" && x.date && x.date > today) return true;
          return false;
        });
      const toDeleteIds = toDelete.map((x) => x.id);

      apply((s) => ({
        ...s,
        tasks: s.tasks.filter((x) => !toDeleteIds.includes(x.id)),
        trashedTasks: [...s.trashedTasks, ...toDelete.map((x) => ({ ...x, deletedAt: nowIso }))],
      }));
      supabase.from("tasks").update({ deleted_at: nowIso }).in("id", toDeleteIds).then(({ error }) => {
        if (error) reportSaveError("deleteTask bulk", error);
      });
      levarLembretesJunto(toDeleteIds, nowIso);
      apply((s) => ({
        ...s,
        taskSeries: s.taskSeries.map((sr) => (sr.id === seriesId ? { ...sr, repeat: "none" } : sr)),
      }));
      supabase.from("task_series").update({ repeat: "none" }).eq("id", seriesId).then(({ error }) => {
        if (error) reportSaveError("deleteTask stop series", error);
      });
    },
    [apply, supabase, levarLembretesJunto]
  );

  const restoreTask = useCallback(
    (id: string) => {
      const t = stateRef.current.trashedTasks.find((x) => x.id === id);
      if (!t) return;
      apply((s) => ({
        ...s,
        trashedTasks: s.trashedTasks.filter((x) => x.id !== id),
        tasks: [...s.tasks, { ...t, deletedAt: null }],
      }));
      supabase.from("tasks").update({ deleted_at: null }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("restoreTask", error);
      });

      // Só os que desceram NESTE delete, reconhecidos pelo carimbo igual ao da
      // tarefa. Um lembrete que ele apagou à mão antes tem outro instante e
      // fica onde está.
      const voltam = stateRef.current.trashedReminders.filter(
        (r) => r.taskId === id && r.deletedAt && r.deletedAt === t.deletedAt
      );
      if (!voltam.length) return;
      const ids = voltam.map((r) => r.id);
      apply((s) => ({
        ...s,
        trashedReminders: s.trashedReminders.filter((r) => !ids.includes(r.id)),
        reminders: [...s.reminders, ...voltam.map((r) => ({ ...r, deletedAt: null }))],
      }));
      supabase
        .from("reminders")
        .update({ deleted_at: null })
        .in("id", ids)
        .then(({ error }) => {
          if (error) reportSaveError("restaurar lembrete da tarefa", error);
        });
    },
    [apply, supabase]
  );

  const purgeTask = useCallback(
    (id: string) => {
      // apagar de vez a tarefa também apaga (cascade no banco) o lembrete vinculado a ela, se tiver.
      apply((s) => ({
        ...s,
        trashedTasks: s.trashedTasks.filter((x) => x.id !== id),
        reminders: s.reminders.filter((r) => r.taskId !== id),
        trashedReminders: s.trashedReminders.filter((r) => r.taskId !== id),
      }));
      supabase.from("tasks").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("purgeTask", error);
      });
    },
    [apply, supabase]
  );

  const saveTaskEdit = useCallback(
    (id: string, vals: TaskEditFields, scope: ScopeChoice | null) => {
      if (!userId) return;
      const t = stateRef.current.tasks.find((x) => x.id === id);
      if (!t) return;
      const newBucket = vals.date || "";
      const oldBucket = bucketOf(t);
      const order = newBucket !== oldBucket ? nextOrder(newBucket) : t.order;

      if (!t.seriesId) {
        const updated: Task = {
          ...t,
          title: vals.title,
          category: vals.category,
          category2: vals.category2,
          priority: vals.priority,
          date: vals.date,
          time: vals.time,
          endDate: vals.endDate,
          endTime: vals.endTime,
          durationMin: vals.durationMin,
          note: vals.note,
          projectId: vals.projectId,
          client: vals.client,
          order,
        };

        if (vals.repeat !== "none") {
          const series: TaskSeries = {
            id: uid(),
            title: vals.title,
            category: vals.category,
            category2: vals.category2,
            priority: vals.priority,
            note: vals.note,
            time: vals.time,
            repeat: vals.repeat,
            startDate: vals.date || todayISO(),
            skippedDates: [],
          };
          updated.seriesId = series.id;
          apply((s) => ({
            ...s,
            tasks: s.tasks.map((x) => (x.id === id ? updated : x)),
            taskSeries: [...s.taskSeries, series],
          }));
          supabase.from("task_series").insert(seriesToInsertRow(series, userId)).then(({ error }) => {
            if (error) reportSaveError("saveTaskEdit series insert", error);
          });
        } else {
          apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? updated : x)) }));
        }
        supabase
          .from("tasks")
          .update(taskToRow(updated, userId))
          .eq("id", id)
          .then(({ error }) => {
            if (error) reportSaveError("saveTaskEdit", error);
          });
        return;
      }

      // belongs to a series already
      const updated: Task = {
        ...t,
        title: vals.title,
        category: vals.category,
        category2: vals.category2,
        priority: vals.priority,
        date: vals.date,
        time: vals.time,
        endDate: vals.endDate,
        endTime: vals.endTime,
        durationMin: vals.durationMin,
        note: vals.note,
        projectId: vals.projectId,
        client: vals.client,
        order,
      };
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? updated : x)) }));
      supabase
        .from("tasks")
        .update(taskToRow(updated, userId))
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("saveTaskEdit occurrence", error);
        });

      if (scope === "esta" || !scope) return;

      const seriesId = t.seriesId;
      const seriesPatch = {
        title: vals.title,
        category: vals.category,
        category2: vals.category2,
        priority: vals.priority,
        note: vals.note,
        time: vals.time,
        repeat: vals.repeat,
      };
      apply((s) => ({
        ...s,
        taskSeries: s.taskSeries.map((sr) => (sr.id === seriesId ? { ...sr, ...seriesPatch } : sr)),
      }));
      supabase.from("task_series").update(seriesToUpdateRow(seriesPatch)).eq("id", seriesId).then(({ error }) => {
        if (error) reportSaveError("saveTaskEdit series update", error);
      });

      const today = todayISO();
      const siblingIds: string[] = [];
      apply((s) => ({
        ...s,
        tasks: s.tasks.map((x) => {
          if (x.seriesId !== seriesId || x.id === id || x.done) return x;
          if (scope === "proximas" && !(x.date && x.date > today)) return x;
          siblingIds.push(x.id);
          return {
            ...x,
            title: vals.title,
            category: vals.category,
            category2: vals.category2,
            priority: vals.priority,
            time: vals.time,
            note: vals.note,
          };
        }),
      }));
      siblingIds.forEach((sid) => {
        supabase
          .from("tasks")
          .update({
            title: vals.title,
            category: vals.category,
            category2: vals.category2,
            priority: vals.priority,
            time: vals.time || null,
            note: vals.note,
          })
          .eq("id", sid)
          .then(({ error }) => {
            if (error) reportSaveError("saveTaskEdit sibling", error);
          });
      });
    },
    [apply, nextOrder, supabase, userId]
  );

  const ensureOccurrencesInView = useCallback(
    (fromISO: string, toISO: string) => {
      if (!userId) return;
      const created: Task[] = [];
      stateRef.current.taskSeries.forEach((series) => {
        if (!series.repeat || series.repeat === "none") return;
        occurrenceDates(series, fromISO, toISO).forEach((iso) => {
          if (series.skippedDates.includes(iso)) return;
          const exists = stateRef.current.tasks.some((t) => t.seriesId === series.id && t.date === iso);
          const alreadyQueued = created.some((t) => t.seriesId === series.id && t.date === iso);
          if (exists || alreadyQueued) return;
          created.push({
            id: uid(),
            code: newTaskCode(),
            title: series.title,
            category: series.category,
            category2: series.category2,
            priority: series.priority,
            date: iso,
            time: series.time || "",
            endDate: null,
            endTime: null,
            durationMin: null,
            expectedDurationMin: null,
            note: series.note || "",
            done: false,
            order: nextOrder(iso),
            seriesId: series.id,
            studyPlanId: null,
            challenging: false,
            follows: false,
            isEvent: false,
            trackedSeconds: 0,
            quick: 0,
            statusId: defaultStatusId(),
            deletedAt: null,
            projectId: null,
            client: null,
          });
        });
      });
      if (!created.length) return;
      apply((s) => ({ ...s, tasks: [...s.tasks, ...created] }));
      supabase
        .from("tasks")
        .insert(created.map((t) => taskToInsertRow(t, userId)))
        .then(({ error }) => {
          if (error) reportSaveError("ensureOccurrencesInView", error);
        });
    },
    [apply, defaultStatusId, newTaskCode, nextOrder, supabase, userId]
  );

  // ---------- task statuses ----------
  const addTaskStatus = useCallback(
    (label: string, color: string) => {
      if (!userId || !label.trim()) return;
      const order = stateRef.current.taskStatuses.length
        ? Math.max(...stateRef.current.taskStatuses.map((s) => s.order)) + 1
        : 0;
      const status: TaskStatus = { id: uid(), label: label.trim(), color, isDone: false, isScheduled: false, order };
      apply((s) => ({ ...s, taskStatuses: [...s.taskStatuses, status] }));
      supabase.from("task_statuses").insert(taskStatusToInsertRow(status, userId)).then(({ error }) => {
        if (error) reportSaveError("addTaskStatus", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateTaskStatus = useCallback(
    (id: string, patch: Partial<Pick<TaskStatus, "label" | "color" | "isDone">>) => {
      apply((s) => ({ ...s, taskStatuses: s.taskStatuses.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      supabase.from("task_statuses").update(taskStatusToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateTaskStatus", error);
      });
      if (patch.isDone === undefined) return;
      const isDone = patch.isDone;
      const affectedIds = stateRef.current.tasks.filter((t) => t.statusId === id && t.done !== isDone).map((t) => t.id);
      if (!affectedIds.length) return;
      apply((s) => ({ ...s, tasks: s.tasks.map((t) => (t.statusId === id ? { ...t, done: isDone } : t)) }));
      supabase.from("tasks").update({ done: isDone }).in("id", affectedIds).then(({ error }) => {
        if (error) reportSaveError("updateTaskStatus sync done", error);
      });
    },
    [apply, supabase]
  );

  const deleteTaskStatus = useCallback(
    (id: string) => {
      const remaining = stateRef.current.taskStatuses.filter((s) => s.id !== id);
      if (!remaining.length) return; // always keep at least one status
      const fallback = remaining.find((s) => !s.isDone) ?? remaining[0];
      const affectedIds = stateRef.current.tasks.filter((t) => t.statusId === id).map((t) => t.id);
      apply((s) => ({
        ...s,
        taskStatuses: remaining,
        tasks: s.tasks.map((t) => (t.statusId === id ? { ...t, statusId: fallback.id, done: fallback.isDone } : t)),
      }));
      supabase.from("task_statuses").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteTaskStatus", error);
      });
      if (affectedIds.length) {
        supabase
          .from("tasks")
          .update({ status_id: fallback.id, done: fallback.isDone })
          .in("id", affectedIds)
          .then(({ error }) => {
            if (error) reportSaveError("deleteTaskStatus reassign", error);
          });
      }
    },
    [apply, supabase]
  );

  const reorderTaskStatuses = useCallback(
    (orderedIds: string[]) => {
      apply((s) => ({
        ...s,
        taskStatuses: s.taskStatuses.map((st) => {
          const idx = orderedIds.indexOf(st.id);
          return idx === -1 ? st : { ...st, order: idx };
        }),
      }));
      orderedIds.forEach((id, idx) => {
        supabase.from("task_statuses").update({ sort_order: idx }).eq("id", id).then(({ error }) => {
          if (error) reportSaveError("reordenar status", error);
        });
      });
    },
    [apply, supabase]
  );

  // ---------- books ----------
  // ---------- novas sinapses ----------
  const addSynapse = useCallback(
    async (
      title: string,
      extra: { kind?: Synapse["kind"]; learning?: string; source?: string | null; titleAuto?: boolean } = {}
    ): Promise<string | null> => {
      if (!userId || !title.trim()) return null;
      const sy: Synapse = {
        id: uid(),
        title: title.trim(),
        learning: extra.learning ?? "",
        questions: "",
        source: extra.source ?? null,
        createdAt: new Date().toISOString(),
        kind: extra.kind ?? "sinapse",
        titleAuto: extra.titleAuto ?? false,
      };
      apply((s) => ({ ...s, synapses: [sy, ...s.synapses] }));
      const { error } = await supabase.from("synapses").insert(synapseToInsertRow(sy, userId));
      if (error) {
        reportSaveError("addSynapse", error);
        apply((s) => ({ ...s, synapses: s.synapses.filter((x) => x.id !== sy.id) }));
        return null;
      }
      return sy.id;
    },
    [apply, supabase, userId]
  );

  const updateSynapse = useCallback(
    (id: string, patch: Partial<Pick<Synapse, "title" | "learning" | "questions" | "source">>) => {
      // Quem edita o título à mão assume o título: deixa de ser "dado pelo FARO".
      const comMarca = patch.title !== undefined ? { ...patch, titleAuto: false } : patch;
      apply((s) => ({ ...s, synapses: s.synapses.map((x) => (x.id === id ? { ...x, ...comMarca } : x)) }));
      supabase
        .from("synapses")
        .update({
          ...patch,
          ...(patch.title !== undefined ? { title_auto: false } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("updateSynapse", error);
        });
    },
    [apply, supabase]
  );

  // Soft delete, igual tarefas e lembretes — nada some do banco de verdade.
  const deleteSynapse = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, synapses: s.synapses.filter((x) => x.id !== id) }));
      supabase
        .from("synapses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("deleteSynapse", error);
        });
    },
    [apply, supabase]
  );

  const addBook = useCallback(
    (title: string) => {
      if (!userId || !title.trim()) return;
      const siblings = stateRef.current.books.filter((b) => b.status === "para_ler");
      const order = siblings.length ? Math.max(...siblings.map((b) => b.order || 0)) + 1 : 0;
      const b: Book = { id: uid(), title: title.trim(), status: "para_ler", priority: "media", insights: null, startedAt: null, order };
      apply((s) => ({ ...s, books: [...s.books, b] }));
      supabase.from("books").insert(bookToInsertRow(b, userId)).then(({ error }) => {
        if (error) reportSaveError("addBook", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateBook = useCallback(
    (id: string, patch: Partial<Pick<Book, "title" | "status" | "priority" | "insights" | "startedAt">>) => {
      apply((s) => ({ ...s, books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
      supabase.from("books").update(bookToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateBook", error);
      });
    },
    [apply, supabase]
  );

  const deleteBook = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));
      supabase.from("books").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteBook", error);
      });
    },
    [apply, supabase]
  );

  // Reordena a fila de leitura (arrastar dentro de um grupo, ex.: "Para ler").
  const reorderBooks = useCallback(
    (orderedIds: string[]) => {
      apply((s) => ({
        ...s,
        books: s.books.map((b) => {
          const idx = orderedIds.indexOf(b.id);
          return idx === -1 ? b : { ...b, order: idx };
        }),
      }));
      orderedIds.forEach((id, idx) => {
        supabase.from("books").update({ sort_order: idx }).eq("id", id).then(({ error }) => {
          if (error) reportSaveError("reorderBooks", error);
        });
      });
    },
    [apply, supabase]
  );

  // ---------- projetos (PDA) ----------
  const addProject = useCallback(
    (name: string) => {
      if (!userId || !name.trim()) return;
      const p: Project = {
        id: uid(),
        name: name.trim(),
        description: "",
        status: "active",
        createdAt: todayISO(),
        defaultCategory: null,
        defaultCategory2: null,
        namingTemplate: null,
      };
      apply((s) => ({ ...s, projects: [...s.projects, p] }));
      supabase.from("projects").insert(projectToInsertRow(p, userId)).then(({ error }) => {
        if (error) reportSaveError("addProject", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateProject = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<Project, "name" | "description" | "status" | "defaultCategory" | "defaultCategory2" | "namingTemplate">
      >
    ) => {
      apply((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      supabase.from("projects").update(projectToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateProject", error);
      });
    },
    [apply, supabase]
  );

  // Cancelar projeto arrasta junto as tarefas dele: antes elas continuavam soltas
  // na lista "sem data" mesmo com o projeto cancelado. Vão pra Lixeira (dá pra
  // restaurar); as já concluídas ficam, pra não sumir do histórico de horas.
  const cancelProject = useCallback(
    (id: string) => {
      const nowIso = new Date().toISOString();
      const related = stateRef.current.tasks.filter((t) => t.projectId === id && !t.done);
      const ids = related.map((t) => t.id);
      apply((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p)),
        tasks: s.tasks.filter((t) => !ids.includes(t.id)),
        trashedTasks: [...s.trashedTasks, ...related.map((t) => ({ ...t, deletedAt: nowIso }))],
      }));
      supabase
        .from("projects")
        .update(projectToUpdateRow({ status: "cancelled" }))
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("cancelProject", error);
        });
      if (ids.length) {
        supabase
          .from("tasks")
          .update({ deleted_at: nowIso })
          .in("id", ids)
          .then(({ error }) => {
            if (error) reportSaveError("cancelProject tasks", error);
          });
      }
    },
    [apply, supabase]
  );

  const deleteProject = useCallback(
    (id: string) => {
      apply((s) => ({
        ...s,
        projects: s.projects.filter((p) => p.id !== id),
        tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
      }));
      supabase.from("projects").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteProject", error);
      });
    },
    [apply, supabase]
  );

  const addTaskToProject = useCallback(
    async (projectId: string, title: string): Promise<boolean> => {
      if (!userId || !title.trim()) return false;
      // Ordem própria por projeto (não a do backlog geral), pra sempre entrar no
      // fim da lista de etapas desse projeto, na ordem em que foram digitadas.
      const siblings = stateRef.current.tasks.filter((x) => x.projectId === projectId);
      const order = siblings.length ? Math.max(...siblings.map((x) => x.order || 0)) + 1 : 0;
      const project = stateRef.current.projects.find((p) => p.id === projectId);
      const t: Task = {
        id: uid(),
        code: newTaskCode(),
        title: title.trim(),
        category: project?.defaultCategory ?? "sem_categoria",
        category2: project?.defaultCategory2 ?? null,
        priority: "media",
        date: null,
        time: "",
        endDate: null,
        endTime: null,
        durationMin: null,
        expectedDurationMin: null,
        note: "",
        done: false,
        order,
        seriesId: null,
        studyPlanId: null,
        challenging: false,
        follows: false,
        isEvent: false,
        trackedSeconds: 0,
        quick: 0,
        statusId: defaultStatusId(),
        deletedAt: null,
        projectId,
        client: null,
      };
      apply((s) => ({ ...s, tasks: [...s.tasks, t] }));
      const { error } = await supabase.from("tasks").insert(taskToInsertRow(t, userId));
      if (error) {
        reportSaveError("addTaskToProject", error);
        apply((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== t.id) }));
        return false;
      }
      return true;
    },
    [apply, defaultStatusId, newTaskCode, supabase, userId]
  );

  // ---------- reminders ----------
  const addReminder = useCallback(
    // Data e hora entram já na criação: antes o lembrete nascia sem data e ele
    // tinha que caçar a linha no fim da lista pra preencher depois.
    async (title: string, date: string | null = null, time: string | null = null): Promise<boolean> => {
      if (!userId || !title.trim()) return false;
      // A trava de verdade mora aqui, não só na tela: é por esta função que
      // TODO lembrete nasce, então nenhuma tela nova consegue criar um sem
      // quando avisar sem antes decidir o que fazer com essa regra.
      if (oQueFaltaNoLembrete(date, time)) return false;
      const r: Reminder = {
        id: uid(),
        title: title.trim(),
        date: date || null,
        time: time || null,
        repeat: "none",
        weekDays: null,
        alertMinutesBefore: null,
        note: null,
        done: false,
        status: "pending",
        deletedAt: null,
        taskId: null,
        sourceKind: null,
        sourceId: null,
        whatsapp: true,
      };
      apply((s) => ({ ...s, reminders: [...s.reminders, r] }));
      const { error } = await supabase.from("reminders").insert(reminderToInsertRow(r, userId));
      if (error) {
        reportSaveError("addReminder", error);
        apply((s) => ({ ...s, reminders: s.reminders.filter((x) => x.id !== r.id) }));
        return false;
      }
      return true;
    },
    [apply, supabase, userId]
  );

  const updateReminder = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Reminder,
          | "title"
          | "date"
          | "time"
          | "repeat"
          | "weekDays"
          | "alertMinutesBefore"
          | "note"
          | "done"
          | "status"
          | "whatsapp"
        >
      >
    ) => {
      apply((s) => ({ ...s, reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
      supabase.from("reminders").update(reminderToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateReminder", error);
      });
    },
    [apply, supabase]
  );

  const deleteReminder = useCallback(
    (id: string) => {
      const r = stateRef.current.reminders.find((x) => x.id === id);
      if (!r) return;
      const nowIso = new Date().toISOString();
      apply((s) => ({
        ...s,
        reminders: s.reminders.filter((x) => x.id !== id),
        trashedReminders: [...s.trashedReminders, { ...r, deletedAt: nowIso }],
      }));
      supabase.from("reminders").update({ deleted_at: nowIso }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteReminder", error);
      });
    },
    [apply, supabase]
  );

  const restoreReminder = useCallback(
    (id: string) => {
      const r = stateRef.current.trashedReminders.find((x) => x.id === id);
      if (!r) return;
      apply((s) => ({
        ...s,
        trashedReminders: s.trashedReminders.filter((x) => x.id !== id),
        reminders: [...s.reminders, { ...r, deletedAt: null }],
      }));
      supabase.from("reminders").update({ deleted_at: null }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("restoreReminder", error);
      });
    },
    [apply, supabase]
  );

  const purgeReminder = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, trashedReminders: s.trashedReminders.filter((x) => x.id !== id) }));
      supabase.from("reminders").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("purgeReminder", error);
      });
    },
    [apply, supabase]
  );

  // Cria/atualiza/remove o lembrete vinculado a uma tarefa (campo "Lembrete" na edição).
  // Reunião ganha título próprio: "Lembrete para executar a tarefa: Alinhamento
  // com o Bruno" lê mal no WhatsApp, onde a mensagem vira o título + a hora.
  // "Reunião: Alinhamento com o Bruno — 01/10 às 15:00" diz a mesma coisa do
  // jeito que se fala, e segue a forma de "Manutenção:" e "Refeição:".
  // Reaproveita a mesma estrutura
  // de Reminder de sempre (data/hora/repetição/dias/aviso), só com taskId apontando de volta.
  const setTaskReminder = useCallback(
    (
      taskId: string,
      fields: {
        date: string | null;
        time: string | null;
        repeat: Repeat;
        weekDays: number[] | null;
        alertMinutesBefore: number | null;
        // Vem do próprio popover de data. Antes o lembrete da tarefa nascia
        // sempre com whatsapp: true — herança de quando a coluna tinha default
        // true, que foi justamente o erro que fez ele receber verde em tudo.
        whatsapp?: boolean;
      }
    ) => {
      if (!userId) return;
      const task = stateRef.current.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const existing = stateRef.current.reminders.find((r) => r.taskId === taskId);
      if (!fields.date) {
        if (existing) deleteReminder(existing.id);
        return;
      }
      if (existing) {
        updateReminder(existing.id, fields);
        return;
      }
      const r: Reminder = {
        id: uid(),
        title: isMeetingTask(task)
          ? `Reunião: ${task.title}`
          : `Lembrete para executar a tarefa: ${task.title}`,
        date: fields.date,
        time: fields.time,
        repeat: fields.repeat,
        weekDays: fields.weekDays,
        alertMinutesBefore: fields.alertMinutesBefore,
        note: null,
        done: false,
        status: "pending",
        deletedAt: null,
        taskId,
        sourceKind: null,
        sourceId: null,
        // Quem decide é a opção que ele marcou no mesmo popover. Sem marcação,
        // nasce apagado — a regra do app é que ele acende o que quer.
        whatsapp: fields.whatsapp ?? false,
      };
      apply((s) => ({ ...s, reminders: [...s.reminders, r] }));
      supabase.from("reminders").insert(reminderToInsertRow(r, userId)).then(({ error }) => {
        if (error) reportSaveError("setTaskReminder", error);
      });
    },
    [apply, deleteReminder, supabase, updateReminder, userId]
  );

  // Marca um lembrete como concluído; se ele for recorrente, gera automaticamente
  // um novo lembrete pra próxima ocorrência (o concluído fica como está, histórico).
  const completeReminder = useCallback(
    (id: string) => {
      if (!userId) return;
      const r = stateRef.current.reminders.find((x) => x.id === id);
      if (!r) return;
      updateReminder(id, { done: true, status: "done" });
      if (!isRecurringReminder(r)) return;
      const nextDate = nextReminderOccurrenceDate(r);
      if (!nextDate) return;
      const next: Reminder = {
        id: uid(),
        title: r.title,
        date: nextDate,
        time: r.time,
        repeat: r.repeat,
        weekDays: r.weekDays,
        alertMinutesBefore: r.alertMinutesBefore,
        note: null,
        // A continuação herda a origem: se o primeiro veio de um remédio, o
        // próximo também é daquele remédio.
        sourceKind: r.sourceKind,
        sourceId: r.sourceId,
        whatsapp: r.whatsapp,
        done: false,
        status: "pending",
        deletedAt: null,
        taskId: r.taskId,
      };
      apply((s) => ({ ...s, reminders: [...s.reminders, next] }));
      supabase.from("reminders").insert(reminderToInsertRow(next, userId)).then(({ error }) => {
        if (error) reportSaveError("completeReminder", error);
      });
    },
    [apply, supabase, updateReminder, userId]
  );

  // ---------- medications ----------
  const addMedication = useCallback(
    (name: string, groupId: string | null) => {
      if (!userId || !name.trim()) return;
      const m: Medication = {
        id: uid(),
        groupId,
        name: name.trim(),
        time: null,
        notes: null,
        startDate: null,
        durationDays: null,
        weekDays: null,
        active: true,
        whatsapp: false,
      };
      apply((s) => ({ ...s, medications: [...s.medications, m] }));
      supabase.from("medications").insert(medicationToInsertRow(m, userId)).then(({ error }) => {
        if (error) reportSaveError("addMedication", error);
      });
    },
    [apply, supabase, userId]
  );

  // ---------- motor do ícone do zap ----------
  /**
   * Põe o lembrete de um remédio em dia com o que o remédio diz hoje.
   *
   * É o coração da regra "zap aceso = chega no WhatsApp": a tela da Medicação
   * não envia nada por conta própria, ela só acende o ícone. Quem envia é o
   * motor de lembretes que já existe — e que já tem trava de gasto, livro-caixa
   * e, desde esta noite, confirmação de entrega.
   *
   * Chamar isto é sempre seguro: a função olha o estado atual e decide criar,
   * atualizar ou apagar. Por isso ela é chamada depois de QUALQUER mudança no
   * remédio ou no tratamento — mudou o horário, o lembrete acompanha; acabou o
   * tratamento, o lembrete some em vez de ficar tocando pra sempre.
   */
  const sincronizarZapDaMedicacao = useCallback(
    (medId: string) => {
      if (!userId) return;
      const atual = stateRef.current;
      const med = atual.medications.find((m) => m.id === medId) ?? null;
      const existente = atual.reminders.find(
        (r) => r.sourceKind === "medication" && r.sourceId === medId && !r.deletedAt
      );
      const grupo = med?.groupId ? atual.medicationGroups.find((g) => g.id === med.groupId) ?? null : null;

      // Remédio apagado, desligado, inativo, sem horário ou com tratamento
      // encerrado: não há o que lembrar.
      const campos =
        med && med.whatsapp && med.active && (!grupo || grupo.active)
          ? lembreteDaMedicacao(med, grupo, todayISO())
          : null;

      if (!campos) {
        if (existente) deleteReminder(existente.id);
        return;
      }
      if (existente) {
        updateReminder(existente.id, campos);
        return;
      }
      const r: Reminder = {
        id: uid(),
        ...campos,
        note: null,
        done: false,
        status: "pending",
        deletedAt: null,
        taskId: null,
        sourceKind: "medication",
        sourceId: medId,
        // Nasceu do ícone do zap: ligado é o que ele significa.
        whatsapp: true,
      };
      apply((s) => ({ ...s, reminders: [...s.reminders, r] }));
      supabase.from("reminders").insert(reminderToInsertRow(r, userId)).then(({ error }) => {
        if (error) reportSaveError("sincronizarZapDaMedicacao", error);
      });
    },
    [apply, deleteReminder, supabase, updateReminder, userId]
  );

  /** Acende ou apaga o ícone do zap de um remédio. */
  const setMedicationWhatsapp = useCallback(
    (id: string, ligado: boolean) => {
      apply((s) => ({
        ...s,
        medications: s.medications.map((m) => (m.id === id ? { ...m, whatsapp: ligado } : m)),
      }));
      supabase.from("medications").update({ whatsapp: ligado }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setMedicationWhatsapp", error);
      });
      sincronizarZapDaMedicacao(id);
    },
    [apply, sincronizarZapDaMedicacao, supabase]
  );

  const updateMedication = useCallback(
    (id: string, patch: Partial<Pick<Medication, "name" | "time" | "notes" | "startDate" | "durationDays" | "weekDays" | "active">>) => {
      apply((s) => ({ ...s, medications: s.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
      supabase.from("medications").update(medicationToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateMedication", error);
      });
      // Mudou horário, dias ou duração: o lembrete do zap acompanha sozinho.
      sincronizarZapDaMedicacao(id);
    },
    [apply, sincronizarZapDaMedicacao, supabase]
  );

  const deleteMedication = useCallback(
    (id: string) => {
      // O lembrete sai ANTES: depois que o remédio some do estado, a sincronia
      // não teria mais como saber que ele existiu.
      const orfao = stateRef.current.reminders.find(
        (r) => r.sourceKind === "medication" && r.sourceId === id && !r.deletedAt
      );
      if (orfao) deleteReminder(orfao.id);
      apply((s) => ({ ...s, medications: s.medications.filter((m) => m.id !== id) }));
      supabase.from("medications").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteMedication", error);
      });
    },
    [apply, deleteReminder, supabase]
  );

  // ---------- medication groups (tratamentos temporários) ----------
  const addMedicationGroup = useCallback(
    (name: string) => {
      if (!userId || !name.trim()) return;
      const g: MedicationGroup = {
        id: uid(),
        name: name.trim(),
        notes: null,
        timeMode: "shared",
        sharedTime: null,
        startDate: null,
        durationDays: null,
        active: true,
      };
      apply((s) => ({ ...s, medicationGroups: [...s.medicationGroups, g] }));
      supabase.from("medication_groups").insert(medicationGroupToInsertRow(g, userId)).then(({ error }) => {
        if (error) reportSaveError("addMedicationGroup", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateMedicationGroup = useCallback(
    (
      id: string,
      patch: Partial<Pick<MedicationGroup, "name" | "notes" | "timeMode" | "sharedTime" | "startDate" | "durationDays" | "active">>
    ) => {
      apply((s) => ({ ...s, medicationGroups: s.medicationGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
      supabase.from("medication_groups").update(medicationGroupToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateMedicationGroup", error);
      });
      // Horário compartilhado, duração ou "ativo" do tratamento mexem no
      // lembrete de cada remédio que pertence a ele.
      stateRef.current.medications
        .filter((m) => m.groupId === id && m.whatsapp)
        .forEach((m) => sincronizarZapDaMedicacao(m.id));
    },
    [apply, sincronizarZapDaMedicacao, supabase]
  );

  const deleteMedicationGroup = useCallback(
    (id: string) => {
      apply((s) => ({
        ...s,
        medicationGroups: s.medicationGroups.filter((g) => g.id !== id),
        medications: s.medications.filter((m) => m.groupId !== id),
      }));
      supabase.from("medication_groups").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteMedicationGroup", error);
      });
    },
    [apply, supabase]
  );

  // ---------- manutenção ----------
  const addMaintenanceAsset = useCallback(
    async (name: string, kind: MaintenanceAsset["kind"]): Promise<string | null> => {
      if (!userId || !name.trim()) return null;
      const asset: MaintenanceAsset = {
        id: uid(),
        name: name.trim(),
        kind,
        tracksOdometer: kind === "veiculo",
        odometerUnit: "km",
        odometerReminderDays: kind === "veiculo" ? 30 : null,
        order: stateRef.current.maintenanceAssets.length,
      };
      apply((st) => ({ ...st, maintenanceAssets: [...st.maintenanceAssets, asset] }));
      const { error } = await supabase.from("maintenance_assets").insert({
        id: asset.id,
        user_id: userId,
        name: asset.name,
        kind: asset.kind,
        tracks_odometer: asset.tracksOdometer,
        odometer_unit: asset.odometerUnit,
        odometer_reminder_days: asset.odometerReminderDays,
        sort_order: asset.order,
      });
      if (error) {
        reportSaveError("addMaintenanceAsset", error);
        apply((st) => ({ ...st, maintenanceAssets: st.maintenanceAssets.filter((a) => a.id !== asset.id) }));
        return null;
      }
      return asset.id;
    },
    [apply, supabase, userId]
  );

  const updateMaintenanceAsset = useCallback(
    (id: string, patch: Partial<MaintenanceAsset>) => {
      apply((st) => ({
        ...st,
        maintenanceAssets: st.maintenanceAssets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }));
      const row: TablesUpdate<"maintenance_assets"> = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.tracksOdometer !== undefined) row.tracks_odometer = patch.tracksOdometer;
      if (patch.odometerReminderDays !== undefined) row.odometer_reminder_days = patch.odometerReminderDays;
      supabase.from("maintenance_assets").update(row).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateMaintenanceAsset", error);
      });
    },
    [apply, supabase]
  );

  const deleteMaintenanceAsset = useCallback(
    (id: string) => {
      const agora = new Date().toISOString();
      apply((st) => ({
        ...st,
        maintenanceAssets: st.maintenanceAssets.filter((a) => a.id !== id),
        maintenanceItems: st.maintenanceItems.filter((i) => i.assetId !== id),
      }));
      supabase.from("maintenance_assets").update({ deleted_at: agora }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteMaintenanceAsset", error);
      });
    },
    [apply, supabase]
  );

  // Anota o odômetro num dia. Regravar o mesmo dia substitui a leitura em vez de
  // duplicar — corrigir um número digitado errado tem que ser simples.
  const addOdometerReading = useCallback(
    (assetId: string, reading: number, readOn: string) => {
      if (!userId || !Number.isFinite(reading) || reading < 0) return;
      const existente = stateRef.current.odometerReadings.find(
        (r) => r.assetId === assetId && r.readOn === readOn
      );
      const nova: OdometerReading = { id: existente?.id ?? uid(), assetId, reading: Math.round(reading), readOn };
      apply((st) => ({
        ...st,
        odometerReadings: existente
          ? st.odometerReadings.map((r) => (r.id === existente.id ? nova : r))
          : [...st.odometerReadings, nova],
      }));
      supabase
        .from("maintenance_odometer_readings")
        .upsert(
          { id: nova.id, user_id: userId, asset_id: assetId, reading: nova.reading, read_on: readOn },
          { onConflict: "asset_id,read_on" }
        )
        .then(({ error }) => {
          if (error) reportSaveError("addOdometerReading", error);
        });
    },
    [apply, supabase, userId]
  );

  const addMaintenanceItem = useCallback(
    async (
      assetId: string,
      name: string,
      intervalMonths: number | null,
      intervalDistance: number | null
    ): Promise<string | null> => {
      if (!userId || !name.trim()) return null;
      const item: MaintenanceItem = {
        id: uid(),
        assetId,
        name: name.trim(),
        intervalMonths,
        intervalDistance,
        alertDaysBefore: 15,
        alertDistanceBefore: 500,
        lastDoneOn: null,
        lastDoneOdometer: null,
        note: "",
        active: true,
        whatsapp: false,
        buyDaysBefore: null,
        boughtOn: null,
        whatsappBuy: false,
        whatsappOverdue: false,
        appBuy: true,
        appDo: true,
        appOverdue: true,
        overdueFrom: null,
        order: stateRef.current.maintenanceItems.filter((i) => i.assetId === assetId).length,
      };
      apply((st) => ({ ...st, maintenanceItems: [...st.maintenanceItems, item] }));
      const { error } = await supabase.from("maintenance_items").insert({
        id: item.id,
        user_id: userId,
        asset_id: assetId,
        name: item.name,
        interval_months: intervalMonths,
        interval_distance: intervalDistance,
        sort_order: item.order,
      });
      if (error) {
        reportSaveError("addMaintenanceItem", error);
        apply((st) => ({ ...st, maintenanceItems: st.maintenanceItems.filter((i) => i.id !== item.id) }));
        return null;
      }
      return item.id;
    },
    [apply, supabase, userId]
  );

  // ---------- avisos da manutenção ----------
  /**
   * Os avisos de uma manutenção (comprar, antes, hoje, vencido x3) viram
   * lembretes de verdade, um por etapa. O push chega sempre; o zap de cada
   * momento escolhe se vai também pro WhatsApp. A data de vencimento vem do
   * `maintenanceStatus`, que junta "vence em 12 meses" com "vence em 16.000 km".
   *
   * É idempotente: compara o que existe com o que deveria existir e só mexe na
   * diferença. Chamada a cada mudança do item, ao registrar "Feito", ao ler o
   * odômetro e uma vez na abertura do app.
   */
  const sincronizarAvisosDaManutencao = useCallback(
    (itemId: string) => {
      if (!userId) return;
      const atual = stateRef.current;
      const item = atual.maintenanceItems.find((i) => i.id === itemId) ?? null;
      const asset = item ? atual.maintenanceAssets.find((a) => a.id === item.assetId) ?? null : null;
      const doItem = atual.reminders.filter(
        (r) => r.sourceKind === "maintenance" && r.sourceId === itemId && !r.deletedAt
      );

      let desejados: ReturnType<typeof lembretesDaManutencao> = [];
      if (item && item.active && asset) {
        const leituras = atual.odometerReadings.filter((l) => l.assetId === asset.id);
        const status = maintenanceStatus(item, asset, leituras);
        desejados = lembretesDaManutencao(item, status.dueDate, todayISO());
      }

      // Um por etapa. Sobra (duplicata de duas abas abertas) e lembrete do
      // desenho antigo, sem etapa, saem.
      const porEtapa = new Map<string, Reminder>();
      const apagar: Reminder[] = [];
      for (const r of doItem) {
        if (!r.sourceStage || porEtapa.has(r.sourceStage)) apagar.push(r);
        else porEtapa.set(r.sourceStage, r);
      }
      const querEtapas = new Set(desejados.map((d) => d.etapa as string));
      for (const [etapa, r] of porEtapa) {
        if (!querEtapas.has(etapa)) {
          apagar.push(r);
          porEtapa.delete(etapa);
        }
      }

      const novos: Reminder[] = [];
      const mudancas = new Map<string, Partial<Reminder>>();
      for (const d of desejados) {
        const ja = porEtapa.get(d.etapa);
        if (!ja) {
          novos.push({
            id: uid(),
            ...d.campos,
            note: null,
            done: false,
            status: "pending",
            deletedAt: null,
            taskId: null,
            sourceKind: "maintenance",
            sourceId: itemId,
            sourceStage: d.etapa,
            whatsapp: d.whatsapp,
            inApp: d.inApp,
          });
          continue;
        }
        const novaData = ja.date !== d.campos.date || ja.time !== d.campos.time;
        if (
          novaData ||
          ja.title !== d.campos.title ||
          ja.whatsapp !== d.whatsapp ||
          (ja.inApp ?? true) !== d.inApp
        ) {
          mudancas.set(ja.id, {
            title: d.campos.title,
            date: d.campos.date,
            time: d.campos.time,
            alertMinutesBefore: d.campos.alertMinutesBefore,
            whatsapp: d.whatsapp,
            inApp: d.inApp,
            // Outra data é outra ocorrência: tem que poder avisar de novo.
            ...(novaData ? { done: false, status: "pending" as const } : {}),
          });
        }
      }

      if (!apagar.length && !novos.length && mudancas.size === 0) return;

      const idsApagar = new Set(apagar.map((r) => r.id));
      apply((st) => ({
        ...st,
        reminders: [
          ...st.reminders
            .filter((r) => !idsApagar.has(r.id))
            .map((r) => (mudancas.has(r.id) ? { ...r, ...mudancas.get(r.id)! } : r)),
          ...novos,
        ],
      }));

      // Apaga de vez: o lembrete foi o FARO que criou, e mandar 6 por item pra
      // Lixeira só encheria ela.
      if (idsApagar.size) {
        supabase.from("reminders").delete().in("id", [...idsApagar]).then(({ error }) => {
          if (error) reportSaveError("avisos da manutenção: apagar", error);
        });
      }
      if (novos.length) {
        supabase.from("reminders").insert(novos.map((r) => reminderToInsertRow(r, userId))).then(({ error }) => {
          if (error) reportSaveError("avisos da manutenção: criar", error);
        });
      }
      for (const [id, patch] of mudancas) {
        const linha = reminderToUpdateRow(patch);
        const reativa = patch.date !== undefined && atual.reminders.some((r) => r.id === id && r.date !== patch.date);
        supabase
          .from("reminders")
          .update(reativa ? { ...linha, whatsapp_notified_at: null, push_sent_for: null } : linha)
          .eq("id", id)
          .then(({ error }) => {
            if (error) reportSaveError("avisos da manutenção: atualizar", error);
          });
      }
    },
    [apply, supabase, userId]
  );

  // Na abertura, garante que todo item ativo tenha seus avisos — é o que cria
  // os lembretes dos itens que já existiam antes dos três momentos.
  const avisosDaManutencaoJaSincronizados = useRef(false);
  useEffect(() => {
    if (loading || !userId || avisosDaManutencaoJaSincronizados.current) return;
    avisosDaManutencaoJaSincronizados.current = true;
    for (const item of stateRef.current.maintenanceItems) sincronizarAvisosDaManutencao(item.id);
  }, [loading, userId, sincronizarAvisosDaManutencao]);

  // Uma leitura nova do odômetro muda o ritmo de rodagem, e com ele a data em
  // que cada item do veículo vence por uso.
  const addOdometerReadingEAvisos = useCallback(
    (assetId: string, reading: number, readOn: string) => {
      addOdometerReading(assetId, reading, readOn);
      for (const i of stateRef.current.maintenanceItems) {
        if (i.assetId === assetId) sincronizarAvisosDaManutencao(i.id);
      }
    },
    [addOdometerReading, sincronizarAvisosDaManutencao]
  );

  /** Acende ou apaga o ícone do zap de um item de manutenção. */
  const setMaintenanceWhatsapp = useCallback(
    (id: string, ligado: boolean) => {
      apply((st) => ({
        ...st,
        maintenanceItems: st.maintenanceItems.map((i) => (i.id === id ? { ...i, whatsapp: ligado } : i)),
      }));
      supabase.from("maintenance_items").update({ whatsapp: ligado }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setMaintenanceWhatsapp", error);
      });
      sincronizarAvisosDaManutencao(id);
    },
    [apply, sincronizarAvisosDaManutencao, supabase]
  );

  const updateMaintenanceItem = useCallback(
    (id: string, patch: Partial<MaintenanceItem>) => {
      apply((st) => ({
        ...st,
        maintenanceItems: st.maintenanceItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }));
      supabase.from("maintenance_items").update(maintenanceItemToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateMaintenanceItem", error);
      });
      // Sincroniza em qualquer mudança do item: intervalo, última troca e
      // antecedência mexem na data de vencimento, e a anotação É o texto que
      // chega no WhatsApp. Qualquer um dos quatro muda o lembrete.
      sincronizarAvisosDaManutencao(id);
    },
    [apply, sincronizarAvisosDaManutencao, supabase]
  );

  const deleteMaintenanceItem = useCallback(
    (id: string) => {
      apply((st) => ({ ...st, maintenanceItems: st.maintenanceItems.filter((i) => i.id !== id) }));
      supabase.from("maintenance_items").update({ deleted_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteMaintenanceItem", error);
      });
      // Item apagado não avisa mais: sem o item, os avisos dele saem.
      sincronizarAvisosDaManutencao(id);
    },
    [apply, sincronizarAvisosDaManutencao, supabase]
  );

  // "Fiz hoje": guarda no histórico E move o item pra frente. O próximo
  // vencimento não é gravado — é calculado a partir daqui (ver maintenance.ts),
  // pra não existirem duas verdades sobre a mesma coisa.
  const registerMaintenanceService = useCallback(
    (itemId: string, doneOn: string, odometer: number | null, costCents: number | null, note: string) => {
      if (!userId) return;
      const servico = {
        id: uid(),
        itemId,
        doneOn,
        odometer: odometer !== null && Number.isFinite(odometer) ? Math.round(odometer) : null,
        costCents: costCents !== null && Number.isFinite(costCents) ? Math.round(costCents) : null,
        note: note.trim(),
      };
      apply((st) => ({
        ...st,
        maintenanceServices: [servico, ...st.maintenanceServices],
        maintenanceItems: st.maintenanceItems.map((i) =>
          i.id === itemId
            ? { ...i, lastDoneOn: doneOn, lastDoneOdometer: servico.odometer, boughtOn: null, overdueFrom: null }
            : i
        ),
      }));
      supabase
        .from("maintenance_services")
        .insert({
          id: servico.id,
          user_id: userId,
          item_id: itemId,
          done_on: doneOn,
          odometer: servico.odometer,
          cost_cents: servico.costCents,
          note: servico.note,
        })
        .then(({ error }) => {
          if (error) reportSaveError("registrar serviço", error);
        });
      supabase
        .from("maintenance_items")
        .update({ last_done_on: doneOn, last_done_odometer: servico.odometer, bought_on: null, overdue_from: null })
        .eq("id", itemId)
        .then(({ error }) => {
          if (error) reportSaveError("atualizar item de manutenção", error);
        });

      // Fazer o serviço também é uma leitura do odômetro: aproveita pra manter
      // o ritmo de rodagem atualizado sem pedir o número duas vezes.
      const item = stateRef.current.maintenanceItems.find((i) => i.id === itemId);
      if (item && servico.odometer !== null) addOdometerReading(item.assetId, servico.odometer, doneOn);
      // Nova data de vencimento: os avisos do ciclo anterior saem e os do novo entram.
      sincronizarAvisosDaManutencao(itemId);
      if (item && servico.odometer !== null) {
        for (const irmao of stateRef.current.maintenanceItems) {
          if (irmao.assetId === item.assetId && irmao.id !== itemId) sincronizarAvisosDaManutencao(irmao.id);
        }
      }
    },
    [addOdometerReading, apply, sincronizarAvisosDaManutencao, supabase, userId]
  );

  // O último serviço de um item é quem manda em "feito em" e no km: se ele foi
  // editado ou apagado, o item se recalcula a partir do que sobrou, e a data de
  // vencimento e os avisos acompanham.
  const aplicarUltimoServico = useCallback(
    (itemId: string) => {
      const ultimo =
        [...stateRef.current.maintenanceServices]
          .filter((s) => s.itemId === itemId)
          .sort((a, b) => b.doneOn.localeCompare(a.doneOn))[0] ?? null;
      const doneOn = ultimo?.doneOn ?? null;
      const odometer = ultimo?.odometer ?? null;
      apply((st) => ({
        ...st,
        maintenanceItems: st.maintenanceItems.map((i) =>
          i.id === itemId ? { ...i, lastDoneOn: doneOn, lastDoneOdometer: odometer } : i
        ),
      }));
      supabase
        .from("maintenance_items")
        .update({ last_done_on: doneOn, last_done_odometer: odometer })
        .eq("id", itemId)
        .then(({ error }) => {
          if (error) reportSaveError("atualizar item de manutenção", error);
        });
      sincronizarAvisosDaManutencao(itemId);
    },
    [apply, sincronizarAvisosDaManutencao, supabase]
  );

  /** Corrige um serviço já registrado (data, km, custo, observação) sem criar outro. */
  const updateMaintenanceService = useCallback(
    (
      id: string,
      patch: Partial<Pick<MaintenanceService, "doneOn" | "odometer" | "costCents" | "note">>
    ) => {
      const atual = stateRef.current.maintenanceServices.find((s) => s.id === id);
      if (!atual) return;
      const novo = { ...atual, ...patch };
      apply((st) => ({
        ...st,
        maintenanceServices: st.maintenanceServices.map((s) => (s.id === id ? novo : s)),
      }));
      supabase
        .from("maintenance_services")
        .update({ done_on: novo.doneOn, odometer: novo.odometer, cost_cents: novo.costCents, note: novo.note })
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("atualizar serviço de manutenção", error);
        });
      // Corrigir o km do serviço também corrige a leitura do odômetro daquele dia.
      const item = stateRef.current.maintenanceItems.find((i) => i.id === atual.itemId);
      if (item && novo.odometer !== null && (patch.odometer !== undefined || patch.doneOn !== undefined)) {
        addOdometerReading(item.assetId, novo.odometer, novo.doneOn);
      }
      aplicarUltimoServico(atual.itemId);
    },
    [addOdometerReading, aplicarUltimoServico, apply, supabase]
  );

  const deleteMaintenanceService = useCallback(
    (id: string) => {
      const atual = stateRef.current.maintenanceServices.find((s) => s.id === id);
      if (!atual) return;
      apply((st) => ({ ...st, maintenanceServices: st.maintenanceServices.filter((s) => s.id !== id) }));
      supabase.from("maintenance_services").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("apagar serviço de manutenção", error);
      });
      aplicarUltimoServico(atual.itemId);
    },
    [aplicarUltimoServico, apply, supabase]
  );

  // ---------- lista de compras e lista de desejos ----------
  // O lembrete do item (data própria, ou o "comprar de novo") é um lembrete comum:
  // push sempre, sininho = dentro do app, zap = WhatsApp. Um por item.
  const sincronizarLembreteDaCompra = useCallback(
    (itemId: string) => {
      if (!userId) return;
      const atual = stateRef.current;
      const item = atual.shoppingItems.find((i) => i.id === itemId) ?? null;
      const existentes = atual.reminders.filter(
        (r) => r.sourceKind === "shopping" && r.sourceId === itemId && !r.deletedAt
      );
      const campos = item ? lembreteDaCompra(item, todayISO()) : null;
      const [ja, ...sobras] = existentes;

      if (!campos) {
        const apagar = existentes.map((r) => r.id);
        if (!apagar.length) return;
        apply((st) => ({ ...st, reminders: st.reminders.filter((r) => !apagar.includes(r.id)) }));
        supabase.from("reminders").delete().in("id", apagar).then(({ error }) => {
          if (error) reportSaveError("lembrete da compra: apagar", error);
        });
        return;
      }
      if (sobras.length) {
        const ids = sobras.map((r) => r.id);
        apply((st) => ({ ...st, reminders: st.reminders.filter((r) => !ids.includes(r.id)) }));
        supabase.from("reminders").delete().in("id", ids).then(() => {});
      }
      const comum = {
        title: campos.title,
        date: campos.date,
        time: campos.time,
        whatsapp: item!.whatsapp,
        inApp: item!.inApp,
      };
      if (ja) {
        const mudouQuando = ja.date !== comum.date || ja.time !== comum.time;
        const mudou =
          mudouQuando || ja.title !== comum.title || ja.whatsapp !== comum.whatsapp || (ja.inApp ?? true) !== comum.inApp;
        if (!mudou) return;
        apply((st) => ({
          ...st,
          reminders: st.reminders.map((r) =>
            r.id === ja.id ? { ...r, ...comum, ...(mudouQuando ? { done: false, status: "pending" as const } : {}) } : r
          ),
        }));
        supabase
          .from("reminders")
          .update({
            ...reminderToUpdateRow({ ...comum }),
            ...(mudouQuando ? { done: false, status: "pending", whatsapp_notified_at: null, push_sent_for: null } : {}),
          })
          .eq("id", ja.id)
          .then(({ error }) => {
            if (error) reportSaveError("lembrete da compra: atualizar", error);
          });
        return;
      }
      const r: Reminder = {
        id: uid(),
        ...comum,
        repeat: "none",
        weekDays: null,
        alertMinutesBefore: 10,
        note: null,
        done: false,
        status: "pending",
        deletedAt: null,
        taskId: null,
        sourceKind: "shopping",
        sourceId: itemId,
        sourceStage: "item",
      };
      apply((st) => ({ ...st, reminders: [...st.reminders, r] }));
      supabase.from("reminders").insert(reminderToInsertRow(r, userId)).then(({ error }) => {
        if (error) reportSaveError("lembrete da compra: criar", error);
      });
    },
    [apply, supabase, userId]
  );

  const addShoppingItem = useCallback(
    async (kind: ShoppingItem["kind"], name: string, listId: string | null): Promise<string | null> => {
      if (!userId || !name.trim()) return null;
      const item: ShoppingItem = {
        id: uid(),
        listId,
        kind,
        name: name.trim(),
        note: "",
        links: [],
        done: false,
        doneOn: null,
        repeatDays: null,
        remindOn: null,
        remindTime: "09:00",
        whatsapp: false,
        inApp: true,
        order: stateRef.current.shoppingItems.length,
        createdAt: new Date().toISOString(),
      };
      apply((st) => ({ ...st, shoppingItems: [...st.shoppingItems, item] }));
      const { error } = await supabase.from("shopping_items").insert(shoppingToInsertRow(item, userId));
      if (error) {
        reportSaveError("addShoppingItem", error);
        apply((st) => ({ ...st, shoppingItems: st.shoppingItems.filter((i) => i.id !== item.id) }));
        return null;
      }
      return item.id;
    },
    [apply, supabase, userId]
  );

  const updateShoppingItem = useCallback(
    (id: string, patch: Partial<ShoppingItem>) => {
      apply((st) => ({
        ...st,
        shoppingItems: st.shoppingItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      }));
      supabase.from("shopping_items").update(shoppingToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateShoppingItem", error);
      });
      sincronizarLembreteDaCompra(id);
    },
    [apply, sincronizarLembreteDaCompra, supabase]
  );

  /** "Comprei" (ou desfazer). Com "relembrar em X dias", a próxima data nasce de hoje. */
  const toggleShoppingBought = useCallback(
    (id: string, comprou: boolean) => {
      const item = stateRef.current.shoppingItems.find((i) => i.id === id);
      if (!item) return;
      updateShoppingItem(id, aoMarcarComprado(item, todayISO(), comprou));
    },
    [updateShoppingItem]
  );

  // ---------- conhecendo você ----------
  /**
   * Grava de uma vez o que veio colado da IA. Repetidos (mesmo tipo e título de
   * um item que já existe e não foi descartado) ficam de fora: colar a mesma
   * parte duas vezes não duplica nada. Devolve quantos entraram e quantos não.
   */
  const importKnowledge = useCallback(
    async (
      itens: { tipo: string; titulo: string; conteudo: string; data: string | null; origem: string | null; tags: string[] }[],
      fonte: KnowledgeItem["fonte"] = "importacao",
      status: KnowledgeItem["status"] = "pendente"
    ): Promise<{ novos: number; repetidos: number }> => {
      if (!userId || !itens.length) return { novos: 0, repetidos: 0 };
      const norm = (t: string, tit: string) =>
        `${t}|${tit.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()}`;
      const ja = new Set(
        stateRef.current.knowledgeItems.filter((k) => k.status !== "descartado").map((k) => norm(k.tipo, k.titulo))
      );
      const lote = new Date().toISOString();
      const novos: KnowledgeItem[] = [];
      for (const i of itens) {
        const chave = norm(i.tipo, i.titulo);
        if (ja.has(chave)) continue;
        ja.add(chave);
        novos.push({
          id: uid(),
          tipo: i.tipo,
          titulo: i.titulo.slice(0, 300),
          conteudo: i.conteudo,
          dataRef: i.data,
          origem: i.origem,
          tags: i.tags,
          status,
          fonte,
          lote,
          createdAt: lote,
        });
      }
      if (!novos.length) return { novos: 0, repetidos: itens.length };
      apply((st) => ({ ...st, knowledgeItems: [...st.knowledgeItems, ...novos] }));
      // Em lotes de 50: a importação de uma IA pode ter centenas de itens longos, e
      // um envio só ficaria grande demais. Lote que falha volta atrás sozinho.
      const linhas = novos.map((k) => ({
        id: k.id,
        user_id: userId,
        tipo: k.tipo,
        titulo: k.titulo,
        conteudo: k.conteudo,
        data_ref: k.dataRef,
        origem: k.origem,
        tags: k.tags,
        status: k.status,
        fonte: k.fonte,
        lote: k.lote,
      }));
      let salvos = 0;
      for (let ini = 0; ini < linhas.length; ini += 50) {
        const parte = linhas.slice(ini, ini + 50);
        const { error } = await supabase.from("knowledge_items").insert(parte);
        if (error) {
          reportSaveError("importar conhecimento", error);
          const ids = new Set(linhas.slice(ini).map((k) => k.id));
          apply((st) => ({ ...st, knowledgeItems: st.knowledgeItems.filter((k) => !ids.has(k.id)) }));
          return { novos: salvos, repetidos: itens.length - novos.length };
        }
        salvos += parte.length;
      }
      return { novos: novos.length, repetidos: itens.length - novos.length };
    },
    [apply, supabase, userId]
  );

  const updateKnowledge = useCallback(
    (id: string, patch: Partial<Pick<KnowledgeItem, "tipo" | "titulo" | "conteudo" | "status" | "tags" | "dataRef">>) => {
      apply((st) => ({ ...st, knowledgeItems: st.knowledgeItems.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
      const row: TablesUpdate<"knowledge_items"> = { updated_at: new Date().toISOString() };
      if (patch.tipo !== undefined) row.tipo = patch.tipo;
      if (patch.titulo !== undefined) row.titulo = patch.titulo;
      if (patch.conteudo !== undefined) row.conteudo = patch.conteudo;
      if (patch.status !== undefined) row.status = patch.status;
      if (patch.tags !== undefined) row.tags = patch.tags;
      if (patch.dataRef !== undefined) row.data_ref = patch.dataRef;
      supabase.from("knowledge_items").update(row).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateKnowledge", error);
      });
    },
    [apply, supabase]
  );

  /** Muda o status de vários de uma vez (ex.: aprovar todos os que estão em revisão). */
  const setKnowledgeStatus = useCallback(
    (ids: string[], status: KnowledgeItem["status"]) => {
      if (!ids.length) return;
      const alvo = new Set(ids);
      apply((st) => ({ ...st, knowledgeItems: st.knowledgeItems.map((k) => (alvo.has(k.id) ? { ...k, status } : k)) }));
      supabase
        .from("knowledge_items")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", ids)
        .then(({ error }) => {
          if (error) reportSaveError("setKnowledgeStatus", error);
        });
    },
    [apply, supabase]
  );

  const deleteKnowledge = useCallback(
    (id: string) => {
      apply((st) => ({ ...st, knowledgeItems: st.knowledgeItems.filter((k) => k.id !== id) }));
      supabase.from("knowledge_items").update({ deleted_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteKnowledge", error);
      });
    },
    [apply, supabase]
  );

  const addShoppingList = useCallback(
    async (kind: ShoppingList["kind"], name: string): Promise<string | null> => {
      if (!userId || !name.trim()) return null;
      const lista: ShoppingList = {
        id: uid(),
        kind,
        name: name.trim(),
        order: stateRef.current.shoppingLists.length,
      };
      apply((st) => ({ ...st, shoppingLists: [...st.shoppingLists, lista] }));
      const { error } = await supabase
        .from("shopping_lists")
        .insert({ id: lista.id, user_id: userId, kind, name: lista.name, sort_order: lista.order });
      if (error) {
        reportSaveError("addShoppingList", error);
        apply((st) => ({ ...st, shoppingLists: st.shoppingLists.filter((l) => l.id !== lista.id) }));
        return null;
      }
      return lista.id;
    },
    [apply, supabase, userId]
  );

  const renameShoppingList = useCallback(
    (id: string, name: string) => {
      const n = name.trim();
      if (!n) return;
      apply((st) => ({ ...st, shoppingLists: st.shoppingLists.map((l) => (l.id === id ? { ...l, name: n } : l)) }));
      supabase.from("shopping_lists").update({ name: n }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("renameShoppingList", error);
      });
    },
    [apply, supabase]
  );

  /** Apaga a lista e os itens dela (apagar suave, como no resto do app). */
  const deleteShoppingList = useCallback(
    (id: string) => {
      const itens = stateRef.current.shoppingItems.filter((i) => i.listId === id);
      const agora = new Date().toISOString();
      apply((st) => ({
        ...st,
        shoppingLists: st.shoppingLists.filter((l) => l.id !== id),
        shoppingItems: st.shoppingItems.filter((i) => i.listId !== id),
      }));
      supabase.from("shopping_lists").update({ deleted_at: agora }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteShoppingList", error);
      });
      supabase.from("shopping_items").update({ deleted_at: agora }).eq("list_id", id).then(({ error }) => {
        if (error) reportSaveError("deleteShoppingList: itens", error);
      });
      // Os lembretes dos itens apagados saem junto.
      for (const i of itens) sincronizarLembreteDaCompra(i.id);
    },
    [apply, sincronizarLembreteDaCompra, supabase]
  );

  const deleteShoppingItem = useCallback(
    (id: string) => {
      apply((st) => ({ ...st, shoppingItems: st.shoppingItems.filter((i) => i.id !== id) }));
      supabase.from("shopping_items").update({ deleted_at: new Date().toISOString() }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteShoppingItem", error);
      });
      sincronizarLembreteDaCompra(id);
    },
    [apply, sincronizarLembreteDaCompra, supabase]
  );

  // ---------- tarefa desafiadora e adiamentos ----------
  // Marcar como evento leva a tarefa pro status "Agendado" — mas SÓ se ela
  // ainda estiver no primeiro status (ninguém começou). Tarefa que já está em
  // andamento, aguardando ou concluída não é mexida: status é fluxo de
  // trabalho, e sobrescrever apagaria onde a tarefa realmente está.
  // Desmarcar faz o caminho inverso, e também só a partir do "Agendado".
  const setIsEvent = useCallback(
    (id: string, isEvent: boolean) => {
      const tarefa = stateRef.current.tasks.find((t) => t.id === id);
      const agendado = scheduledStatusId();
      const inicial = defaultStatusId();

      let statusId = tarefa?.statusId ?? null;
      if (isEvent && agendado && statusId === inicial) statusId = agendado;
      else if (!isEvent && agendado && statusId === agendado) statusId = inicial;

      const mudouStatus = statusId !== (tarefa?.statusId ?? null);
      apply((st) => ({
        ...st,
        tasks: st.tasks.map((t) => (t.id === id ? { ...t, isEvent, statusId } : t)),
      }));
      supabase
        .from("tasks")
        .update(mudouStatus ? { is_event: isEvent, status_id: statusId } : { is_event: isEvent })
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("setIsEvent", error);
        });
    },
    [apply, defaultStatusId, scheduledStatusId, supabase]
  );

  const setChallenging = useCallback(
    (id: string, challenging: boolean) => {
      apply((st) => ({ ...st, tasks: st.tasks.map((t) => (t.id === id ? { ...t, challenging } : t)) }));
      supabase.from("tasks").update({ challenging }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setChallenging", error);
      });
    },
    [apply, supabase]
  );

  const setFollows = useCallback(
    (id: string, follows: boolean) => {
      apply((st) => ({ ...st, tasks: st.tasks.map((t) => (t.id === id ? { ...t, follows } : t)) }));
      supabase.from("tasks").update({ follows }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("setFollows", error);
      });
    },
    [apply, supabase]
  );

  // Adiar é empurrar pra frente OU tirar a data (mandar pro limbo do "sem
  // data", que é o jeito mais silencioso de fugir de uma tarefa). Antecipar
  // não é adiamento e não entra no histórico.
  const logPostponement = useCallback(
    (taskId: string, fromDate: string | null, toDate: string | null, reason: string | null) => {
      if (!userId || !fromDate) return;
      const adiou = toDate === null || toDate > fromDate;
      if (!adiou) return;
      const registro: TaskPostponement = {
        id: uid(),
        taskId,
        fromDate,
        toDate,
        reason: reason?.trim() || null,
        createdAt: new Date().toISOString(),
      };
      apply((st) => ({ ...st, taskPostponements: [registro, ...st.taskPostponements] }));
      supabase
        .from("task_postponements")
        .insert({
          id: registro.id,
          user_id: userId,
          task_id: taskId,
          from_date: fromDate,
          to_date: toDate,
          reason: registro.reason,
        })
        .then(({ error }) => {
          if (error) reportSaveError("registrar adiamento", error);
        });
    },
    [apply, supabase, userId]
  );

  // ---------- planos de estudo ----------
  const addStudyPlan = useCallback(
    async (name: string): Promise<string | null> => {
      if (!userId || !name.trim()) return null;
      const plan: StudyPlan = {
        id: uid(),
        name: name.trim(),
        description: "",
        totalMinutes: null,
        sessionMinutes: 45,
        weekDays: [1, 2, 3, 4, 5],
        startDate: todayISO(),
        deadline: null,
        status: "ativo",
        category: "estudo",
        // Segunda tag "pessoal" por padrão, como ele pediu: estudo é
        // desenvolvimento pessoal e conta nos dois relatórios.
        category2: "pessoal",
        createdAt: todayISO(),
      };
      apply((st) => ({ ...st, studyPlans: [...st.studyPlans, plan] }));
      const { error } = await supabase.from("study_plans").insert(studyPlanToInsertRow(plan, userId));
      if (error) {
        reportSaveError("addStudyPlan", error);
        apply((st) => ({ ...st, studyPlans: st.studyPlans.filter((x) => x.id !== plan.id) }));
        return null;
      }
      return plan.id;
    },
    [apply, supabase, userId]
  );

  const updateStudyPlan = useCallback(
    (id: string, patch: Partial<StudyPlan>) => {
      apply((st) => ({ ...st, studyPlans: st.studyPlans.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      supabase.from("study_plans").update(studyPlanToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateStudyPlan", error);
      });
    },
    [apply, supabase]
  );

  // Excluir o plano manda as sessões AINDA EM ABERTO pra Lixeira; as já feitas
  // ficam, porque são histórico de estudo que aconteceu de verdade. Mesma regra
  // do cancelar projeto.
  const deleteStudyPlan = useCallback(
    (id: string) => {
      const agora = new Date().toISOString();
      const emAberto = stateRef.current.tasks.filter((t) => t.studyPlanId === id && !t.done);
      apply((st) => ({
        ...st,
        studyPlans: st.studyPlans.filter((p) => p.id !== id),
        tasks: st.tasks.filter((t) => !(t.studyPlanId === id && !t.done)),
        trashedTasks: [...st.trashedTasks, ...emAberto.map((t) => ({ ...t, deletedAt: agora }))],
      }));
      supabase.from("study_plans").update({ deleted_at: agora }).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteStudyPlan", error);
      });
      if (emAberto.length) {
        supabase
          .from("tasks")
          .update({ deleted_at: agora })
          .in("id", emAberto.map((t) => t.id))
          .then(({ error }) => {
            if (error) reportSaveError("deleteStudyPlan sessões", error);
          });
      }
    },
    [apply, supabase]
  );

  /**
   * Monta (ou REFAZ) o calendário de sessões do plano.
   *
   * Antes isto só ACRESCENTAVA o que faltava, e foi o que estragou o plano da
   * mentoria dele: ele gerou uma vez, depois mudou a data de início e os dias
   * da semana, gerou de novo — e as sessões da primeira rodada continuaram lá,
   * embaralhadas com as novas. O resultado ficou com a "sessão 1" caindo DEPOIS
   * da sessão 6, porque a numeração vinha da ordem de criação, não da data.
   *
   * Agora recriar substitui: as sessões ainda não feitas são apagadas e o
   * calendário é remontado do zero, numerado por DATA.
   *
   * O que foi feito NÃO é tocado — é histórico, e tem tempo cronometrado
   * pendurado nele. As novas continuam a numeração de onde as feitas pararam.
   */
  const generateStudySessions = useCallback(
    async (planId: string): Promise<number> => {
      if (!userId) return 0;
      const plan = stateRef.current.studyPlans.find((p) => p.id === planId);
      if (!plan || !plan.weekDays.length) return 0;

      const hoje = todayISO();
      const inicio = plan.startDate && plan.startDate > hoje ? plan.startDate : hoje;

      const doPlano = stateRef.current.tasks.filter((t) => t.studyPlanId === planId);
      const feitas = doPlano.filter((t) => t.done);
      const aDescartar = doPlano.filter((t) => !t.done);

      // Fora as feitas, nada sobrevive: o calendário é remontado inteiro.
      if (aDescartar.length) {
        const agora = new Date().toISOString();
        const ids = aDescartar.map((t) => t.id);
        apply((st) => ({
          ...st,
          tasks: st.tasks.filter((t) => !ids.includes(t.id)),
          trashedTasks: [...st.trashedTasks, ...aDescartar.map((t) => ({ ...t, deletedAt: agora }))],
        }));
        const { error } = await supabase.from("tasks").update({ deleted_at: agora }).in("id", ids);
        if (error) {
          reportSaveError("refazer plano de estudo", error);
          return 0;
        }
      }

      const diasOcupados = new Set(feitas.map((t) => t.date));

      // Com tamanho total, o alvo é cobrir o estudo inteiro. Sem tamanho, gera
      // as próximas 4 semanas — dá ritmo sem prometer um fim que não se sabe.
      const alvo = plan.totalMinutes
        ? Math.ceil(plan.totalMinutes / Math.max(1, plan.sessionMinutes))
        : studyDatesInRange(inicio, isoAddDays(inicio, 28), plan.weekDays).length;
      const faltamCriar = Math.max(0, alvo - feitas.length);
      if (faltamCriar === 0) return 0;

      const limite = plan.deadline && plan.deadline > inicio ? plan.deadline : isoAddDays(inicio, 730);
      const datas = studyDatesInRange(inicio, limite, plan.weekDays)
        .filter((d) => !diasOcupados.has(d))
        .slice(0, faltamCriar);
      if (!datas.length) return 0;

      const novas: Task[] = datas.map((date, i) => ({
        id: uid(),
        code: newTaskCode(),
        title: `${plan.name} — sessão ${feitas.length + i + 1}`,
        category: plan.category,
        category2: plan.category2,
        priority: "media",
        date,
        time: "",
        endDate: null,
        endTime: null,
        // Nasce com a DURAÇÃO preenchida, não só a prevista: ele definiu 30 min
        // por dia e quer ver 30 min na tarefa. Isso também faz a sessão entrar
        // no Painel de Horas assim que for concluída — o tempo digitado só
        // conta quando a tarefa está feita e não tem cronômetro lançado, então
        // preencher agora não infla número nenhum antes da hora.
        durationMin: plan.sessionMinutes,
        expectedDurationMin: plan.sessionMinutes,
        note: "",
        done: false,
        order: nextOrder(date) + i,
        seriesId: null,
        studyPlanId: plan.id,
        challenging: false,
        follows: false,
        isEvent: false,
        trackedSeconds: 0,
        quick: 0,
        statusId: defaultStatusId(),
        deletedAt: null,
        projectId: null,
        client: null,
      }));

      apply((st) => ({ ...st, tasks: [...st.tasks, ...novas] }));
      const { error } = await supabase.from("tasks").insert(novas.map((t) => taskToInsertRow(t, userId)));
      if (error) {
        reportSaveError("generateStudySessions", error);
        const ids = new Set(novas.map((t) => t.id));
        apply((st) => ({ ...st, tasks: st.tasks.filter((t) => !ids.has(t.id)) }));
        return 0;
      }
      return novas.length;
    },
    [apply, defaultStatusId, newTaskCode, nextOrder, supabase, userId]
  );

  // ---------- checklists ----------
  const addChecklist = useCallback(
    (title: string, type: string) => {
      if (!userId || !title.trim()) return;
      const c: Checklist = {
        id: uid(),
        title: title.trim(),
        type: type.trim() || "viagem",
        items: [],
        createdAt: todayISO(),
        expensesEnabled: false,
        expenses: [],
        notes: "",
        budgetCents: null,
        // Nasce no fim da lista. Ele arrasta pro topo o que vem primeiro — quem
        // decide a ordem é ele, não a hora em que criou.
        order: stateRef.current.checklists.length,
      };
      apply((s) => ({ ...s, checklists: [...s.checklists, c] }));
      supabase.from("checklists").insert(checklistToInsertRow(c, userId)).then(({ error }) => {
        if (error) reportSaveError("addChecklist", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateChecklist = useCallback(
    (
      id: string,
      patch: Partial<Pick<Checklist, "title" | "type" | "items" | "expensesEnabled" | "expenses" | "budgetCents" | "notes">>
    ) => {
      apply((s) => ({ ...s, checklists: s.checklists.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      supabase.from("checklists").update(checklistToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateChecklist", error);
      });
    },
    [apply, supabase]
  );

  const deleteChecklist = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, checklists: s.checklists.filter((c) => c.id !== id) }));
      supabase.from("checklists").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteChecklist", error);
      });
    },
    [apply, supabase]
  );

  /**
   * Nova ordem dos checklists, na sequência que ele deixou na tela.
   *
   * Mesmo desenho do `reorderBooks`: grava a posição de cada um pelo índice.
   * Reescrever todas as posições (em vez de só as que mudaram) é o que mantém a
   * numeração sem buraco e sem empate — e empate aqui voltaria a dar ordem
   * indefinida, que é justamente o que ele quer resolver.
   */
  const reorderChecklists = useCallback(
    (orderedIds: string[]) => {
      apply((s) => ({
        ...s,
        checklists: s.checklists.map((c) => {
          const idx = orderedIds.indexOf(c.id);
          return idx === -1 ? c : { ...c, order: idx };
        }),
      }));
      orderedIds.forEach((id, idx) => {
        supabase.from("checklists").update({ sort_order: idx }).eq("id", id).then(({ error }) => {
          if (error) reportSaveError("reorderChecklists", error);
        });
      });
    },
    [apply, supabase]
  );

  const duplicateChecklist = useCallback(
    (id: string) => {
      if (!userId) return;
      const src = stateRef.current.checklists.find((c) => c.id === id);
      if (!src) return;
      const copy: Checklist = {
        id: uid(),
        title: src.title,
        type: src.type,
        items: src.items.map((i): ChecklistItem => ({ id: uid(), text: i.text, checked: false, toBuy: false })),
        createdAt: todayISO(),
        // Copiar um checklist é preparar a próxima viagem: mantém a aba de gastos
        // ligada e o quanto planejou gastar, mas começa sem gasto nenhum.
        expensesEnabled: src.expensesEnabled,
        expenses: [],
        notes: src.notes,
        budgetCents: src.budgetCents,
        order: stateRef.current.checklists.length,
      };
      apply((s) => ({ ...s, checklists: [...s.checklists, copy] }));
      supabase.from("checklists").insert(checklistToInsertRow(copy, userId)).then(({ error }) => {
        if (error) reportSaveError("duplicateChecklist", error);
      });
    },
    [apply, supabase, userId]
  );

  // ---------- recurring (habits / fixed blocks) ----------
  const tableFor = (kind: "habit" | "block") => (kind === "habit" ? "habits" : "fixed_blocks");
  const listKeyFor = (kind: "habit" | "block"): "habits" | "fixedBlocks" =>
    kind === "habit" ? "habits" : "fixedBlocks";

  const addRecurring = useCallback(
    (kind: "habit" | "block", name: string, durationMin: number | null) => {
      if (!userId || !name.trim()) return;
      const listKey = listKeyFor(kind);
      const order = stateRef.current[listKey].length
        ? Math.max(...stateRef.current[listKey].map((x) => x.order)) + 1
        : 0;
      const item: RecurringItem = { id: uid(), name: name.trim(), durationMin, order, logs: {}, category: null };
      apply((s) => ({ ...s, [listKey]: [...s[listKey], item] }));
      supabase
        .from(tableFor(kind))
        .insert({ id: item.id, user_id: userId, name: item.name, duration_minutes: durationMin, sort_order: order })
        .then(({ error }) => {
          if (error) reportSaveError("addRecurring", error);
        });
    },
    [apply, supabase, userId]
  );

  const updateRecurring = useCallback(
    (kind: "habit" | "block", id: string, name: string, durationMin: number | null) => {
      const listKey = listKeyFor(kind);
      apply((s) => ({
        ...s,
        [listKey]: s[listKey].map((x) => (x.id === id ? { ...x, name, durationMin } : x)),
      }));
      supabase
        .from(tableFor(kind))
        .update({ name, duration_minutes: durationMin })
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("updateRecurring", error);
        });
    },
    [apply, supabase]
  );

  /**
   * A tag do hábito ou bloco fixo.
   *
   * Com tag, o tempo do bloco soma na categoria no relatório em vez de virar
   * fatia própria — foi o que ele pediu olhando o "Lazer": na cabeça dele
   * aquilo é tempo de família, e aparecia como uma terceira coisa ao lado.
   * Sem tag, nada muda: "Crossfit" não é categoria de tarefa nenhuma e continua
   * com fatia própria.
   */
  const setRecurringCategory = useCallback(
    (kind: "habit" | "block", id: string, category: Category | null) => {
      const listKey = listKeyFor(kind);
      apply((s) => ({
        ...s,
        [listKey]: s[listKey].map((x) => (x.id === id ? { ...x, category } : x)),
      }));
      supabase
        .from(tableFor(kind))
        .update({ category })
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("setRecurringCategory", error);
        });
    },
    [apply, supabase]
  );

  const updateRecurringNoteOptions = useCallback(
    (kind: "habit" | "block", id: string, noteOptions: string[]) => {
      const listKey = listKeyFor(kind);
      apply((s) => ({
        ...s,
        [listKey]: s[listKey].map((x) => (x.id === id ? { ...x, noteOptions } : x)),
      }));
      supabase
        .from(tableFor(kind))
        .update({ note_options: noteOptions })
        .eq("id", id)
        .then(({ error }) => {
          if (error) reportSaveError("updateRecurringNoteOptions", error);
        });
    },
    [apply, supabase]
  );

  const deleteRecurringItem = useCallback(
    (kind: "habit" | "block", id: string) => {
      const listKey = listKeyFor(kind);
      const runningTimer = stateRef.current.activeTimers.find((at) => at.kind === kind && at.itemId === id);
      if (runningTimer) {
        apply((s) => ({ ...s, activeTimers: s.activeTimers.filter((at) => at.id !== runningTimer.id) }));
        supabase.from("active_timer").delete().eq("id", runningTimer.id).then(({ error }) => {
          if (error) reportSaveError("parar cronômetro", error);
        });
      }
      apply((s) => ({ ...s, [listKey]: s[listKey].filter((x) => x.id !== id) }));
      supabase.from(tableFor(kind)).delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteRecurringItem", error);
      });
    },
    [apply, supabase]
  );

  const deleteRecurringLog = useCallback(
    (kind: "habit" | "block", id: string, iso: string) => {
      const query =
        kind === "habit"
          ? supabase.from("habit_logs").delete().eq("habit_id", id).eq("log_date", iso)
          : supabase.from("fixed_block_logs").delete().eq("block_id", id).eq("log_date", iso);
      query.then(({ error }) => {
        if (error) reportSaveError("deleteRecurringLog", error);
      });
    },
    [supabase]
  );

  const upsertRecurringLog = useCallback(
    (kind: "habit" | "block", id: string, iso: string, trackedSeconds: number, userId: string, note?: string | null) => {
      // `note` is only included in the upsert payload when the caller explicitly
      // passes it, so an omitted note (e.g. from the timer auto-stop path) never
      // clobbers a note the user already typed for that day.
      const noteField = note !== undefined ? { note: note || null } : {};
      const query =
        kind === "habit"
          ? supabase
              .from("habit_logs")
              .upsert(
                { user_id: userId, habit_id: id, log_date: iso, checked: true, tracked_seconds: trackedSeconds, ...noteField },
                { onConflict: "habit_id,log_date" }
              )
          : supabase
              .from("fixed_block_logs")
              .upsert(
                { user_id: userId, block_id: id, log_date: iso, checked: true, tracked_seconds: trackedSeconds, ...noteField },
                { onConflict: "block_id,log_date" }
              );
      query.then(({ error }) => {
        if (error) reportSaveError("upsertRecurringLog", error);
      });
    },
    [supabase]
  );

  const clearRecurringDay = useCallback(
    (kind: "habit" | "block", id: string, iso: string) => {
      const listKey = listKeyFor(kind);
      apply((s) => ({
        ...s,
        [listKey]: s[listKey].map((x) => {
          if (x.id !== id) return x;
          const logs = { ...x.logs };
          delete logs[iso];
          return { ...x, logs };
        }),
      }));
      deleteRecurringLog(kind, id, iso);
    },
    [apply, deleteRecurringLog]
  );

  const commitRecurringDay = useCallback(
    (kind: "habit" | "block", id: string, iso: string, minutes: number, note?: string) => {
      if (!userId) return;
      const listKey = listKeyFor(kind);
      const trackedSeconds = Math.max(0, minutes) * 60;
      const log: DayLog = { checked: true, trackedSeconds, note: note?.trim() || null };
      apply((s) => ({
        ...s,
        [listKey]: s[listKey].map((x) => (x.id === id ? { ...x, logs: { ...x.logs, [iso]: log } } : x)),
      }));
      upsertRecurringLog(kind, id, iso, trackedSeconds, userId, log.note);
    },
    [apply, upsertRecurringLog, userId]
  );

  // fixed blocks with noteOptions: multiple marked entries (type + minutes) per day,
  // kept in sync with a summary row (fixed_block_logs) so Dashboard/HoursPanel keep working unchanged.
  const addBlockLogEntry = useCallback(
    (blockId: string, iso: string, note: string, minutes: number) => {
      if (!userId || !note || minutes <= 0) return;
      const block = stateRef.current.fixedBlocks.find((b) => b.id === blockId);
      const entries: DayLogEntry[] = [...(block?.logs[iso]?.entries ?? []), { id: uid(), note, minutes }];
      // Soma em cima do total que já existia em vez de recalcular a partir das
      // entradas: tempo cronometrado que ainda não virou entrada (registro antigo)
      // seria apagado por esse recálculo.
      const trackedSeconds = (block?.logs[iso]?.trackedSeconds ?? 0) + minutes * 60;
      const summaryNote = Array.from(new Set(entries.map((e) => e.note))).join(", ");
      const newEntry = entries[entries.length - 1];
      apply((s) => ({
        ...s,
        fixedBlocks: s.fixedBlocks.map((b) =>
          b.id === blockId
            ? { ...b, logs: { ...b.logs, [iso]: { checked: true, trackedSeconds, note: summaryNote, entries } } }
            : b
        ),
      }));
      supabase
        .from("fixed_block_log_entries")
        .insert({ id: newEntry.id, user_id: userId, block_id: blockId, log_date: iso, note, minutes })
        .then(({ error }) => {
          if (error) reportSaveError("addBlockLogEntry", error);
        });
      upsertRecurringLog("block", blockId, iso, trackedSeconds, userId, summaryNote);
    },
    [apply, supabase, userId, upsertRecurringLog]
  );

  const deleteBlockLogEntry = useCallback(
    (blockId: string, iso: string, entryId: string) => {
      const block = stateRef.current.fixedBlocks.find((b) => b.id === blockId);
      const removed = (block?.logs[iso]?.entries ?? []).find((e) => e.id === entryId);
      const entries = (block?.logs[iso]?.entries ?? []).filter((e) => e.id !== entryId);
      const trackedSeconds = Math.max(0, (block?.logs[iso]?.trackedSeconds ?? 0) - (removed?.minutes ?? 0) * 60);
      const summaryNote = Array.from(new Set(entries.map((e) => e.note))).join(", ");
      apply((s) => ({
        ...s,
        fixedBlocks: s.fixedBlocks.map((b) => {
          if (b.id !== blockId) return b;
          const logs = { ...b.logs };
          if (entries.length === 0) delete logs[iso];
          else logs[iso] = { checked: true, trackedSeconds, note: summaryNote, entries };
          return { ...b, logs };
        }),
      }));
      supabase
        .from("fixed_block_log_entries")
        .delete()
        .eq("id", entryId)
        .then(({ error }) => {
          if (error) reportSaveError("deleteBlockLogEntry", error);
        });
      if (entries.length === 0) {
        deleteRecurringLog("block", blockId, iso);
      } else if (userId) {
        upsertRecurringLog("block", blockId, iso, trackedSeconds, userId, summaryNote);
      }
    },
    [apply, supabase, userId, upsertRecurringLog, deleteRecurringLog]
  );

  // ---------- tempo por dia das tarefas ----------
  // O tempo mora no dia em que foi trabalhado, não na tarefa: mover a tarefa de
  // dia não pode levar junto as horas de ontem. tasks.tracked_seconds continua
  // existindo, mas como espelho da soma — quem manda é a lista por dia.
  const writeTaskTime = useCallback(
    async (taskId: string, iso: string, seconds: number) => {
      if (!userId || !iso) return;
      const clean = Math.max(0, Math.round(seconds));
      const existing = stateRef.current.taskTimeEntries.find((e) => e.taskId === taskId && e.date === iso);
      const entryId = existing?.id ?? uid();

      // Dia zerado não vira linha de zero: some da lista.
      const entries: TaskTimeEntry[] =
        clean === 0
          ? stateRef.current.taskTimeEntries.filter((e) => !(e.taskId === taskId && e.date === iso))
          : existing
            ? stateRef.current.taskTimeEntries.map((e) => (e.id === existing.id ? { ...e, seconds: clean } : e))
            : [...stateRef.current.taskTimeEntries, { id: entryId, taskId, date: iso, seconds: clean }];

      const total = entries.filter((e) => e.taskId === taskId).reduce((sum, e) => sum + e.seconds, 0);
      apply((s) => ({
        ...s,
        taskTimeEntries: entries,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, trackedSeconds: total } : t)),
      }));

      if (clean === 0) {
        if (existing) {
          const { error } = await supabase.from("task_time_entries").delete().eq("id", existing.id);
          if (error) reportSaveError("apagar tempo do dia", error);
        }
      } else {
        const { error } = await supabase.from("task_time_entries").upsert(
          {
            id: entryId,
            user_id: userId,
            task_id: taskId,
            log_date: iso,
            seconds: clean,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "task_id,log_date" }
        );
        if (error) reportSaveError("gravar tempo do dia", error);
      }

      const { error } = await supabase.from("tasks").update({ tracked_seconds: total }).eq("id", taskId);
      if (error) reportSaveError("atualizar total da tarefa", error);
    },
    [apply, supabase, userId]
  );

  // Soma tempo num dia (é o que o cronômetro faz ao parar).
  const addTaskTime = useCallback(
    (taskId: string, iso: string, seconds: number) => {
      const atual = stateRef.current.taskTimeEntries.find((e) => e.taskId === taskId && e.date === iso)?.seconds ?? 0;
      void writeTaskTime(taskId, iso, atual + seconds);
    },
    [writeTaskTime]
  );

  // Define o tempo de um dia na mão (corrigir lançamento, ou lançar um dia que
  // ficou sem cronômetro). Minutos = 0 apaga o dia.
  const setTaskTimeMinutes = useCallback(
    (taskId: string, iso: string, minutes: number) => {
      void writeTaskTime(taskId, iso, Math.max(0, Math.round(minutes)) * 60);
    },
    [writeTaskTime]
  );

  // ---------- timer ----------
  // Nome da intervenção criada quando o cronômetro para num bloco que usa lista
  // de entradas — o cronômetro não sabe qual etiqueta o Leandro escolheria.

  const findTrackable = useCallback((kind: TimerKind, id: string) => {
    if (kind === "task") return stateRef.current.tasks.find((x) => x.id === id);
    const list = kind === "habit" ? stateRef.current.habits : stateRef.current.fixedBlocks;
    return list.find((x) => x.id === id);
  }, []);

  const stopTimer = useCallback(
    (at: ActiveTimer) => {
      if (!userId) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - at.startedAt) / 1000));
      if (at.kind === "task") {
        // Cai no dia em que o cronômetro COMEÇOU (at.logDate) — é o mesmo
        // critério de hábitos e blocos. Cronômetro que atravessa a meia-noite
        // fica todo no dia em que começou, em vez de rachar em dois.
        // A duração digitada não é mais sobrescrita: ela é a previsão do
        // Leandro, o tempo real agora tem lugar próprio.
        addTaskTime(at.itemId, at.logDate, elapsed);
      } else {
        const kind = at.kind;
        const listKey = listKeyFor(kind);
        const item = stateRef.current[listKey].find((x) => x.id === at.itemId);
        const prevSeconds = item?.logs[at.logDate]?.trackedSeconds || 0;
        const trackedSeconds = prevSeconds + elapsed;

        // Bloco com opções de nota (Piscina, por exemplo) guarda o dia como uma
        // LISTA de intervenções. Antes o cronômetro só engordava o total e não
        // criava entrada nenhuma — daí, no dia em que já havia um registro, o
        // segundo play parecia substituir o primeiro em vez de somar. Agora cada
        // parada de cronômetro vira uma intervenção própria na lista do dia.
        const entriesMode = kind === "block" && (item?.noteOptions?.length ?? 0) > 0;
        const minutes = Math.round(elapsed / 60);
        const newEntry: DayLogEntry | null =
          entriesMode && minutes >= 1 ? { id: uid(), note: TIMER_ENTRY_NOTE, minutes } : null;
        const entries = newEntry ? [...(item?.logs[at.logDate]?.entries ?? []), newEntry] : undefined;
        const summaryNote = entries ? Array.from(new Set(entries.map((e) => e.note))).join(", ") : undefined;

        apply((s) => ({
          ...s,
          [listKey]: s[listKey].map((x) =>
            x.id === at.itemId
              ? {
                  ...x,
                  logs: {
                    ...x.logs,
                    [at.logDate]: {
                      ...x.logs[at.logDate],
                      checked: true,
                      trackedSeconds,
                      ...(entries ? { entries, note: summaryNote ?? null } : {}),
                    },
                  },
                }
              : x
          ),
        }));

        if (newEntry) {
          supabase
            .from("fixed_block_log_entries")
            .insert({
              id: newEntry.id,
              user_id: userId,
              block_id: at.itemId,
              log_date: at.logDate,
              note: newEntry.note,
              minutes: newEntry.minutes,
            })
            .then(({ error }) => {
              if (error) reportSaveError("stopTimer entrada do bloco", error);
            });
        }
        upsertRecurringLog(kind, at.itemId, at.logDate, trackedSeconds, userId, summaryNote);
      }
    },
    [addTaskTime, apply, supabase, upsertRecurringLog, userId]
  );

  const toggleTimer = useCallback(
    (kind: TimerKind, id: string, logDate: string) => {
      if (!userId) return;
      const running = stateRef.current.activeTimers.find((at) => at.kind === kind && at.itemId === id);
      if (running) {
        stopTimer(running);
        apply((s) => ({ ...s, activeTimers: s.activeTimers.filter((at) => at.id !== running.id) }));
        supabase.from("active_timer").delete().eq("id", running.id).then(({ error }) => {
          if (error) reportSaveError("parar cronômetro", error);
        });
        return;
      }
      const at: ActiveTimer = { id: uid(), kind, itemId: id, logDate, startedAt: Date.now() };
      apply((s) => ({ ...s, activeTimers: [...s.activeTimers, at] }));
      supabase
        .from("active_timer")
        .insert({ id: at.id, user_id: userId, kind, item_id: id, log_date: logDate, started_at: new Date(at.startedAt).toISOString() })
        .then(({ error }) => {
          if (error) reportSaveError("toggleTimer", error);
        });
    },
    [apply, stopTimer, supabase, userId]
  );

  // ---------- reuniões rápidas ----------
  const startMeeting = useCallback(
    (title: string, expectedDurationMin: number, client: string | null) => {
      if (!userId || !title.trim()) return;
      const today = todayISO();
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const t: Task = {
        id: uid(),
        code: newTaskCode(),
        title: title.trim(),
        category: "sem_categoria",
        category2: "reuniao",
        priority: "media",
        date: today,
        time,
        endDate: null,
        endTime: null,
        durationMin: null,
        expectedDurationMin,
        note: "",
        done: false,
        order: nextOrder(today),
        seriesId: null,
        studyPlanId: null,
        challenging: false,
        follows: false,
        // Reunião aberta pelo cronômetro tem hora e cliente e está acontecendo
        // agora: é evento por definição.
        isEvent: true,
        trackedSeconds: 0,
        quick: 0,
        statusId: defaultStatusId(),
        deletedAt: null,
        projectId: null,
        client: client?.trim() || null,
      };
      const at: ActiveTimer = { id: uid(), kind: "task", itemId: t.id, logDate: today, startedAt: Date.now() };
      apply((s) => ({ ...s, tasks: [...s.tasks, t], activeTimers: [...s.activeTimers, at] }));
      supabase.from("tasks").insert(taskToInsertRow(t, userId)).then(({ error }) => {
        if (error) reportSaveError("startMeeting task", error);
      });
      supabase
        .from("active_timer")
        .insert({ id: at.id, user_id: userId, kind: "task", item_id: t.id, log_date: today, started_at: new Date(at.startedAt).toISOString() })
        .then(({ error }) => {
          if (error) reportSaveError("startMeeting timer", error);
        });
    },
    [apply, defaultStatusId, newTaskCode, nextOrder, supabase, userId]
  );

  const bumpExpectedDuration = useCallback(
    (taskId: string, addMin: number) => {
      const task = stateRef.current.tasks.find((t) => t.id === taskId);
      if (!task) return;
      const next = (task.expectedDurationMin ?? 0) + addMin;
      apply((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, expectedDurationMin: next } : t)) }));
      supabase.from("tasks").update({ expected_duration_min: next }).eq("id", taskId).then(({ error }) => {
        if (error) reportSaveError("bumpExpectedDuration", error);
      });
    },
    [apply, supabase]
  );

  const concludeMeeting = useCallback(
    (taskId: string) => {
      const at = stateRef.current.activeTimers.find((t) => t.kind === "task" && t.itemId === taskId);
      if (at) {
        toggleTimer("task", taskId, at.logDate);
      }
      const doneStatus = stateRef.current.taskStatuses.find((s) => s.isDone);
      if (doneStatus) setTaskStatus(taskId, doneStatus.id);
    },
    [toggleTimer, setTaskStatus]
  );

  // ---------- settings ----------
  /**
   * Mantém o lembrete que representa uma refeição no WhatsApp.
   *
   * Até agora o ícone do zap da Dieta acendia e não mandava nada — era a única
   * tela do app que prometia mensagem e não cumpria. Aqui ele passa a valer a
   * mesma coisa que vale no resto: aceso = chega no celular.
   *
   * Três chaves precisam estar ligadas pra existir lembrete: o botão da
   * refeição, a refeição ativa, e o opt-in geral da Dieta — que é o que a tela
   * mostra como "avisar no WhatsApp". Faltando qualquer uma, o lembrete é
   * apagado em vez de ficar órfão mandando mensagem que ninguém pediu.
   */
  const sincronizarZapDaDieta = useCallback(
    (mealId: string) => {
      if (!userId) return;
      const atual = stateRef.current;
      const meal = atual.dietMeals.find((m) => m.id === mealId) ?? null;
      const existente = atual.reminders.find(
        (r) => r.sourceKind === "diet_meal" && r.sourceId === mealId && !r.deletedAt
      );

      const campos =
        meal && meal.notifyWhatsapp && meal.active && atual.settings.dietWhatsappOptIn
          ? lembreteDaRefeicao(meal, todayISO())
          : null;

      if (!campos) {
        if (existente) deleteReminder(existente.id);
        return;
      }
      if (existente) {
        updateReminder(existente.id, campos);
        return;
      }
      const r: Reminder = {
        id: uid(),
        ...campos,
        note: null,
        done: false,
        status: "pending",
        deletedAt: null,
        taskId: null,
        sourceKind: "diet_meal",
        sourceId: mealId,
        whatsapp: true,
      };
      apply((s) => ({ ...s, reminders: [...s.reminders, r] }));
      supabase.from("reminders").insert(reminderToInsertRow(r, userId)).then(({ error }) => {
        if (error) reportSaveError("sincronizarZapDaDieta", error);
      });
    },
    [apply, deleteReminder, supabase, updateReminder, userId]
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (!userId) return;
      const merged = { ...stateRef.current.settings, ...patch };
      apply((s) => ({ ...s, settings: merged }));
      supabase
        .from("settings")
        .upsert({
          user_id: userId,
          tag_colors: merged.tagColors,
          daily_budget_hours: merged.dailyBudgetHours,
          water_goal_ml: merged.waterGoalMl,
          feature_flags: merged.featureFlags,
          avatar_url: merged.avatarUrl,
          preferred_name: merged.preferredName,
          birth_date: merged.birthDate,
          notify_phone: merged.notifyPhone,
          timezone: merged.timezone,
          water_strategies: merged.waterStrategies,
          diet_plan: merged.dietPlan,
          diet_app_opt_in: merged.dietAppOptIn,
          diet_whatsapp_opt_in: merged.dietWhatsappOptIn,
          whatsapp_msg_cost_usd: merged.whatsappMsgCostUsd,
          ia_monthly_cap_brl: merged.iaMonthlyCapBrl,
          whatsapp_monthly_cap_brl: merged.whatsappMonthlyCapBrl,
          whatsapp_usd_brl: merged.whatsappUsdBrl,
          bg_tone: merged.bgTone,
          bg_intensity: merged.bgIntensity,
          backup_areas: merged.backupAreas,
          backup_name: merged.backupName,
        })
        .then(({ error }) => {
          if (error) reportSaveError("updateSettings", error);
        });

      // O "avisar no WhatsApp" da Dieta é um interruptor geral: vale pra todas
      // as refeições de uma vez. Desligou, os lembretes somem; ligou de volta,
      // voltam só os que ele tinha marcado. Sem isto, desligar o geral deixaria
      // as mensagens saindo — o pior tipo de falha, porque a tela diria que
      // está desligado.
      if (patch.dietWhatsappOptIn !== undefined) {
        for (const refeicao of stateRef.current.dietMeals) sincronizarZapDaDieta(refeicao.id);
      }
    },
    [apply, sincronizarZapDaDieta, supabase, userId]
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<string | null> => {
      if (!userId) return "Não foi possível identificar o usuário.";
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) return uploadError.message;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      updateSettings({ avatarUrl: url });
      return null;
    },
    [supabase, userId, updateSettings]
  );

  // ---------- anexos (tarefas, lembretes, livros, projetos) ----------
  const listAttachments = useCallback(
    async (entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]> => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
      if (error) {
        reportSaveError("listAttachments", error);
        return [];
      }
      return (data ?? []).map(rowToAttachment);
    },
    [supabase]
  );

  const uploadAttachment = useCallback(
    async (
      entityType: AttachmentEntityType,
      entityId: string,
      file: File
    ): Promise<{ attachment: Attachment | null; error: string | null }> => {
      if (!userId) return { attachment: null, error: "Não foi possível identificar o usuário." };
      const id = uid();
      const safeName = file.name.replace(/[^\w.\- ]/g, "_");
      const path = `${userId}/${entityType}/${entityId}/${id}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) return { attachment: null, error: uploadError.message };

      const insertRow = attachmentToInsertRow(
        {
          id,
          entityType,
          entityId,
          fileName: file.name,
          filePath: path,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        },
        userId
      );
      const { data, error: insertError } = await supabase
        .from("attachments")
        .insert(insertRow)
        .select("*")
        .single();
      if (insertError || !data) {
        await supabase.storage.from("attachments").remove([path]);
        return { attachment: null, error: insertError?.message || "Falha ao salvar o anexo." };
      }

      let attachment = rowToAttachment(data);
      if (ATTACHMENT_EXTRACTABLE_MIME.has(attachment.mimeType)) {
        try {
          const res = await fetch("/api/attachments/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          const json = await res.json();
          if (json.attachment) attachment = rowToAttachment(json.attachment);
        } catch (err) {
          console.error("uploadAttachment extract", err);
        }
      }
      apply((s) => ({
        ...s,
        attachmentKeys: new Set(s.attachmentKeys).add(`${entityType}:${entityId}`),
      }));
      return { attachment, error: null };
    },
    [apply, supabase, userId]
  );

  const deleteAttachment = useCallback(
    async (attachment: Attachment): Promise<string | null> => {
      const { error: storageError } = await supabase.storage.from("attachments").remove([attachment.filePath]);
      if (storageError) return storageError.message;
      const { error } = await supabase.from("attachments").delete().eq("id", attachment.id);
      if (error) return error.message;
      const { count } = await supabase
        .from("attachments")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", attachment.entityType)
        .eq("entity_id", attachment.entityId);
      if (!count) {
        apply((s) => {
          const next = new Set(s.attachmentKeys);
          next.delete(`${attachment.entityType}:${attachment.entityId}`);
          return { ...s, attachmentKeys: next };
        });
      }
      return null;
    },
    [apply, supabase]
  );

  // Apaga TODOS os anexos de um item. Serve pro lembrete concluído: documento
  // de consulta (resultado de exame, comprovante) costuma ser descartável, e
  // guardar isso pra sempre só entope o armazenamento.
  const discardAttachmentsOf = useCallback(
    async (entityType: AttachmentEntityType, entityId: string): Promise<string | null> => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (error) return error.message;
      const itens = data ?? [];
      if (!itens.length) return null;

      const { error: storageError } = await supabase.storage
        .from("attachments")
        .remove(itens.map((a) => a.file_path));
      if (storageError) return storageError.message;

      const { error: delError } = await supabase
        .from("attachments")
        .delete()
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (delError) return delError.message;

      apply((st) => {
        const next = new Set(st.attachmentKeys);
        next.delete(`${entityType}:${entityId}`);
        return { ...st, attachmentKeys: next };
      });
      return null;
    },
    [apply, supabase]
  );

  const getAttachmentUrl = useCallback(
    async (filePath: string): Promise<string | null> => {
      const { data, error } = await supabase.storage.from("attachments").createSignedUrl(filePath, 60);
      if (error || !data) {
        reportSaveError("getAttachmentUrl", error);
        return null;
      }
      return data.signedUrl;
    },
    [supabase]
  );

  // ---------- daily log (água, dieta, sono) ----------
  const updateDailyLog = useCallback(
    (logDate: string, patch: Partial<DailyLog>) => {
      if (!userId) return;
      const current: DailyLog = stateRef.current.dailyLogs[logDate] ?? {
        waterMl: 0,
        dietPct: null,
        dietNote: null,
        dietMealsChecked: [],
        dietMealNotes: {},
        sleptAt: null,
        wokeAt: null,
        mood: null,
        moodNote: null,
        moodEmotion: null,
      };
      const merged: DailyLog = { ...current, ...patch };
      apply((s) => ({ ...s, dailyLogs: { ...s.dailyLogs, [logDate]: merged } }));
      supabase
        .from("daily_logs")
        .upsert(
          {
            user_id: userId,
            log_date: logDate,
            water_ml: merged.waterMl,
            diet_pct: merged.dietPct,
            diet_note: merged.dietNote,
            diet_meals_checked: merged.dietMealsChecked,
            diet_meal_notes: merged.dietMealNotes,
            slept_at: merged.sleptAt,
            woke_at: merged.wokeAt,
            mood: merged.mood,
            mood_note: merged.moodNote,
            mood_emotion: merged.moodEmotion,
          },
          { onConflict: "user_id,log_date" }
        )
        .then(({ error }) => {
          if (error) reportSaveError("updateDailyLog", error);
        });
    },
    [apply, supabase, userId]
  );

  const toggleDietMealChecked = useCallback(
    (logDate: string, mealId: string) => {
      const current = stateRef.current.dailyLogs[logDate]?.dietMealsChecked ?? [];
      const next = current.includes(mealId) ? current.filter((id) => id !== mealId) : [...current, mealId];
      updateDailyLog(logDate, { dietMealsChecked: next });
    },
    [updateDailyLog]
  );

  const setDietMealNote = useCallback(
    (logDate: string, mealId: string, note: string) => {
      const current = stateRef.current.dailyLogs[logDate]?.dietMealNotes ?? {};
      const next = { ...current };
      if (note.trim()) next[mealId] = note.trim();
      else delete next[mealId];
      updateDailyLog(logDate, { dietMealNotes: next });
    },
    [updateDailyLog]
  );

  // ---------- refeições da dieta ----------
  const addDietMeal = useCallback(
    (name: string, time: string) => {
      if (!userId || !name.trim()) return;
      const m: DietMeal = {
        id: uid(),
        name: name.trim(),
        time,
        message: "",
        active: true,
        notifyWhatsapp: false,
        weekDays: null,
      };
      apply((s) => ({ ...s, dietMeals: [...s.dietMeals, m].sort((a, b) => a.time.localeCompare(b.time)) }));
      supabase.from("diet_meals").insert(dietMealToInsertRow(m, userId)).then(({ error }) => {
        if (error) reportSaveError("addDietMeal", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateDietMeal = useCallback(
    (
      id: string,
      patch: Partial<Pick<DietMeal, "name" | "time" | "message" | "active" | "notifyWhatsapp" | "weekDays">>
    ) => {
      apply((s) => ({
        ...s,
        dietMeals: s.dietMeals
          .map((m) => (m.id === id ? { ...m, ...patch } : m))
          .sort((a, b) => a.time.localeCompare(b.time)),
      }));
      supabase.from("diet_meals").update(dietMealToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateDietMeal", error);
      });
      // Sincroniza em QUALQUER mudança, não só no botão do zap: trocar o horário
      // ou os dias da semana muda quando a mensagem sai, e desativar a refeição
      // tem que calar o lembrete. Esquecer um desses deixaria o aviso avisando
      // de uma refeição que mudou de hora.
      sincronizarZapDaDieta(id);
    },
    [apply, sincronizarZapDaDieta, supabase]
  );

  const deleteDietMeal = useCallback(
    (id: string) => {
      // Primeiro o lembrete, enquanto a refeição ainda existe pra ser achada.
      const vinculado = stateRef.current.reminders.find(
        (r) => r.sourceKind === "diet_meal" && r.sourceId === id && !r.deletedAt
      );
      if (vinculado) deleteReminder(vinculado.id);
      apply((s) => ({ ...s, dietMeals: s.dietMeals.filter((m) => m.id !== id) }));
      supabase.from("diet_meals").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteDietMeal", error);
      });
    },
    [apply, deleteReminder, supabase]
  );

  return {
    state,
    loading,
    reload: load,
    isTimerRunning: (kind: TimerKind, id: string) =>
      state.activeTimers.some((at) => at.kind === kind && at.itemId === id),
    findTrackable,
    addTask,
    setTaskTimeMinutes,
    addMaintenanceAsset,
    updateMaintenanceAsset,
    deleteMaintenanceAsset,
    addOdometerReading: addOdometerReadingEAvisos,
    addMaintenanceItem,
    updateMaintenanceItem,
    deleteMaintenanceItem,
    registerMaintenanceService,
    updateMaintenanceService,
    deleteMaintenanceService,
    setChallenging,
    setFollows,
    setIsEvent,
    logPostponement,
    addStudyPlan,
    updateStudyPlan,
    deleteStudyPlan,
    generateStudySessions,
    setTaskStatus,
    setQuick,
    setPriority,
    setCategory,
    updateTaskNote,
    updateTaskTitle,
    reorderBucket,
    duplicateTask,
    deleteTask,
    restoreTask,
    purgeTask,
    saveTaskEdit,
    ensureOccurrencesInView,
    addTaskStatus,
    updateTaskStatus,
    deleteTaskStatus,
    reorderTaskStatuses,
    importKnowledge,
    updateKnowledge,
    setKnowledgeStatus,
    deleteKnowledge,
    addShoppingItem,
    addShoppingList,
    renameShoppingList,
    deleteShoppingList,
    updateShoppingItem,
    toggleShoppingBought,
    deleteShoppingItem,
    addSynapse,
    updateSynapse,
    deleteSynapse,
    addBook,
    updateBook,
    deleteBook,
    reorderBooks,
    addProject,
    updateProject,
    cancelProject,
    deleteProject,
    addTaskToProject,
    addReminder,
    updateReminder,
    deleteReminder,
    restoreReminder,
    purgeReminder,
    setTaskReminder,
    completeReminder,
    addMedication,
    updateMedication,
    deleteMedication,
    setMedicationWhatsapp,
    setMaintenanceWhatsapp,
    addMedicationGroup,
    updateMedicationGroup,
    deleteMedicationGroup,
    addChecklist,
    updateChecklist,
    deleteChecklist,
    duplicateChecklist,
    reorderChecklists,
    addRecurring,
    updateRecurring,
    setRecurringCategory,
    updateRecurringNoteOptions,
    deleteRecurringItem,
    clearRecurringDay,
    commitRecurringDay,
    addBlockLogEntry,
    deleteBlockLogEntry,
    toggleTimer,
    startMeeting,
    bumpExpectedDuration,
    concludeMeeting,
    updateSettings,
    uploadAvatar,
    listAttachments,
    uploadAttachment,
    deleteAttachment,
    discardAttachmentsOf,
    getAttachmentUrl,
    updateDailyLog,
    toggleDietMealChecked,
    setDietMealNote,
    addDietMeal,
    updateDietMeal,
    deleteDietMeal,
  };
}

export type UseBoard = ReturnType<typeof useBoard>;
