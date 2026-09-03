"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  rowToChecklist,
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
import { isRecurringReminder, nextReminderOccurrenceDate } from "@/lib/board/reminder-alerts";
import { reportSaveError } from "@/lib/board/error-toast";
import type {
  ActiveTimer,
  Attachment,
  AttachmentEntityType,
  Book,
  BoardState,
  Category,
  Checklist,
  ChecklistItem,
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
  Task,
  TaskSeries,
  TaskStatus,
  TimerKind,
} from "@/lib/types";
import { DEFAULT_TAG_COLORS } from "@/lib/types";

const EMPTY_STATE: BoardState = {
  tasks: [],
  trashedTasks: [],
  projects: [],
  habits: [],
  fixedBlocks: [],
  dietMeals: [],
  taskSeries: [],
  taskStatuses: [],
  books: [],
  reminders: [],
  trashedReminders: [],
  medications: [],
  medicationGroups: [],
  checklists: [],
  settings: {
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
  durationMin: number | null;
  note: string;
  repeat: Repeat;
  projectId: string | null;
  client: string | null;
}

function uid(): string {
  return crypto.randomUUID();
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
      supabase.from("reminders").select("*").is("deleted_at", null).order("created_at"),
      supabase.from("reminders").select("*").not("deleted_at", "is", null),
      supabase.from("medications").select("*").order("created_at"),
      supabase.from("medication_groups").select("*").order("created_at"),
      supabase.from("checklists").select("*").order("created_at"),
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
      trashedTasks: (trashedTasksRes.data ?? []).map(rowToTask),
      projects: (projectsRes.data ?? []).map(rowToProject),
      habits: buildRecurring(habitsRes.data ?? [], habitLogsRes.data ?? [], "habit_id"),
      fixedBlocks: buildRecurring(blocksRes.data ?? [], blockLogsRes.data ?? [], "block_id", blockLogEntriesRes.data ?? []),
      taskSeries: (seriesRes.data ?? []).map(rowToSeries),
      taskStatuses: (taskStatusesRes.data ?? []).map(rowToTaskStatus),
      books: (booksRes.data ?? []).map(rowToBook),
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
    const notDone = statuses.filter((s) => !s.isDone).sort((a, b) => a.order - b.order);
    return notDone[0]?.id ?? statuses[0]?.id ?? null;
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
    async (bucketKey: string, title: string): Promise<boolean> => {
      if (!userId || !title.trim()) return false;
      const t: Task = {
        id: uid(),
        title: title.trim(),
        category: "sem_categoria",
        category2: null,
        priority: "media",
        date: bucketKey || null,
        time: "",
        durationMin: null,
        expectedDurationMin: null,
        note: "",
        done: false,
        order: nextOrder(bucketKey),
        seriesId: null,
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
    [apply, defaultStatusId, nextOrder, supabase, userId]
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
          supabase.from("tasks").update({ sort_order: x.order }).eq("id", x.id).then(() => {});
        });
      supabase.from("tasks").insert(taskToInsertRow(clone, userId)).then(({ error }) => {
        if (error) reportSaveError("duplicateTask", error);
      });
    },
    [apply, defaultStatusId, supabase, userId]
  );

  const deleteTask = useCallback(
    (id: string, scope: ScopeChoice | null) => {
      const t = stateRef.current.tasks.find((x) => x.id === id);
      if (!t) return;

      const runningTimer = stateRef.current.activeTimers.find((at) => at.kind === "task" && at.itemId === id);
      if (runningTimer) {
        apply((s) => ({ ...s, activeTimers: s.activeTimers.filter((at) => at.id !== runningTimer.id) }));
        supabase.from("active_timer").delete().eq("id", runningTimer.id).then(() => {});
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
      apply((s) => ({
        ...s,
        taskSeries: s.taskSeries.map((sr) => (sr.id === seriesId ? { ...sr, repeat: "none" } : sr)),
      }));
      supabase.from("task_series").update({ repeat: "none" }).eq("id", seriesId).then(({ error }) => {
        if (error) reportSaveError("deleteTask stop series", error);
      });
    },
    [apply, supabase]
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
            title: series.title,
            category: series.category,
            category2: series.category2,
            priority: series.priority,
            date: iso,
            time: series.time || "",
            durationMin: null,
            expectedDurationMin: null,
            note: series.note || "",
            done: false,
            order: nextOrder(iso),
            seriesId: series.id,
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
    [apply, defaultStatusId, nextOrder, supabase, userId]
  );

  // ---------- task statuses ----------
  const addTaskStatus = useCallback(
    (label: string, color: string) => {
      if (!userId || !label.trim()) return;
      const order = stateRef.current.taskStatuses.length
        ? Math.max(...stateRef.current.taskStatuses.map((s) => s.order)) + 1
        : 0;
      const status: TaskStatus = { id: uid(), label: label.trim(), color, isDone: false, order };
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
        supabase.from("task_statuses").update({ sort_order: idx }).eq("id", id).then(() => {});
      });
    },
    [apply, supabase]
  );

  // ---------- books ----------
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
        title: title.trim(),
        category: project?.defaultCategory ?? "sem_categoria",
        category2: project?.defaultCategory2 ?? null,
        priority: "media",
        date: null,
        time: "",
        durationMin: null,
        expectedDurationMin: null,
        note: "",
        done: false,
        order,
        seriesId: null,
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
    [apply, defaultStatusId, supabase, userId]
  );

  // ---------- reminders ----------
  const addReminder = useCallback(
    async (title: string): Promise<boolean> => {
      if (!userId || !title.trim()) return false;
      const r: Reminder = {
        id: uid(),
        title: title.trim(),
        date: null,
        time: null,
        repeat: "none",
        weekDays: null,
        alertMinutesBefore: null,
        note: null,
        done: false,
        status: "pending",
        deletedAt: null,
        taskId: null,
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
          "title" | "date" | "time" | "repeat" | "weekDays" | "alertMinutesBefore" | "note" | "done" | "status"
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
  // Título padrão "Lembrete para executar a tarefa: <nome>" — reaproveita a mesma estrutura
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
        title: `Lembrete para executar a tarefa: ${task.title}`,
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
      };
      apply((s) => ({ ...s, medications: [...s.medications, m] }));
      supabase.from("medications").insert(medicationToInsertRow(m, userId)).then(({ error }) => {
        if (error) reportSaveError("addMedication", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateMedication = useCallback(
    (id: string, patch: Partial<Pick<Medication, "name" | "time" | "notes" | "startDate" | "durationDays" | "weekDays" | "active">>) => {
      apply((s) => ({ ...s, medications: s.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
      supabase.from("medications").update(medicationToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) reportSaveError("updateMedication", error);
      });
    },
    [apply, supabase]
  );

  const deleteMedication = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, medications: s.medications.filter((m) => m.id !== id) }));
      supabase.from("medications").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteMedication", error);
      });
    },
    [apply, supabase]
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
    },
    [apply, supabase]
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
      };
      apply((s) => ({ ...s, checklists: [...s.checklists, c] }));
      supabase.from("checklists").insert(checklistToInsertRow(c, userId)).then(({ error }) => {
        if (error) reportSaveError("addChecklist", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateChecklist = useCallback(
    (id: string, patch: Partial<Pick<Checklist, "title" | "type" | "items">>) => {
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
      const item: RecurringItem = { id: uid(), name: name.trim(), durationMin, order, logs: {} };
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
        supabase.from("active_timer").delete().eq("id", runningTimer.id).then(() => {});
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
      const trackedSeconds = entries.reduce((sum, e) => sum + e.minutes, 0) * 60;
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
      const entries = (block?.logs[iso]?.entries ?? []).filter((e) => e.id !== entryId);
      const trackedSeconds = entries.reduce((sum, e) => sum + e.minutes, 0) * 60;
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

  // ---------- timer ----------
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
        const t = stateRef.current.tasks.find((x) => x.id === at.itemId);
        if (t) {
          const trackedSeconds = t.trackedSeconds + elapsed;
          const durationMin = Math.round(trackedSeconds / 60);
          apply((s) => ({
            ...s,
            tasks: s.tasks.map((x) => (x.id === at.itemId ? { ...x, trackedSeconds, durationMin } : x)),
          }));
          supabase
            .from("tasks")
            .update({ tracked_seconds: trackedSeconds, duration_minutes: durationMin })
            .eq("id", at.itemId)
            .then(({ error }) => {
              if (error) reportSaveError("stopTimer task", error);
            });
        }
      } else {
        const kind = at.kind;
        const listKey = listKeyFor(kind);
        const item = stateRef.current[listKey].find((x) => x.id === at.itemId);
        const prevSeconds = item?.logs[at.logDate]?.trackedSeconds || 0;
        const trackedSeconds = prevSeconds + elapsed;
        apply((s) => ({
          ...s,
          [listKey]: s[listKey].map((x) =>
            x.id === at.itemId
              ? { ...x, logs: { ...x.logs, [at.logDate]: { ...x.logs[at.logDate], checked: true, trackedSeconds } } }
              : x
          ),
        }));
        upsertRecurringLog(kind, at.itemId, at.logDate, trackedSeconds, userId);
      }
    },
    [apply, supabase, upsertRecurringLog, userId]
  );

  const toggleTimer = useCallback(
    (kind: TimerKind, id: string, logDate: string) => {
      if (!userId) return;
      const running = stateRef.current.activeTimers.find((at) => at.kind === kind && at.itemId === id);
      if (running) {
        stopTimer(running);
        apply((s) => ({ ...s, activeTimers: s.activeTimers.filter((at) => at.id !== running.id) }));
        supabase.from("active_timer").delete().eq("id", running.id).then(() => {});
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
        title: title.trim(),
        category: "sem_categoria",
        category2: "reuniao",
        priority: "media",
        date: today,
        time,
        durationMin: null,
        expectedDurationMin,
        note: "",
        done: false,
        order: nextOrder(today),
        seriesId: null,
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
    [apply, defaultStatusId, nextOrder, supabase, userId]
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
        })
        .then(({ error }) => {
          if (error) reportSaveError("updateSettings", error);
        });
    },
    [apply, supabase, userId]
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
    },
    [apply, supabase]
  );

  const deleteDietMeal = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, dietMeals: s.dietMeals.filter((m) => m.id !== id) }));
      supabase.from("diet_meals").delete().eq("id", id).then(({ error }) => {
        if (error) reportSaveError("deleteDietMeal", error);
      });
    },
    [apply, supabase]
  );

  return {
    state,
    loading,
    reload: load,
    isTimerRunning: (kind: TimerKind, id: string) =>
      state.activeTimers.some((at) => at.kind === kind && at.itemId === id),
    findTrackable,
    addTask,
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
    addBook,
    updateBook,
    deleteBook,
    reorderBooks,
    addProject,
    updateProject,
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
    addMedicationGroup,
    updateMedicationGroup,
    deleteMedicationGroup,
    addChecklist,
    updateChecklist,
    deleteChecklist,
    duplicateChecklist,
    addRecurring,
    updateRecurring,
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
