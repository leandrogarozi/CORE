"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  bookToInsertRow,
  bookToUpdateRow,
  buildRecurring,
  reminderToInsertRow,
  reminderToUpdateRow,
  rowToActiveTimer,
  rowToBook,
  rowToDailyLog,
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
import { occurrenceDates, todayISO } from "@/lib/date-utils";
import type {
  ActiveTimer,
  Book,
  BoardState,
  Category,
  DailyLog,
  DayLog,
  DayLogEntry,
  Priority,
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
  habits: [],
  fixedBlocks: [],
  taskSeries: [],
  taskStatuses: [],
  books: [],
  reminders: [],
  settings: { tagColors: DEFAULT_TAG_COLORS, dailyBudgetHours: 12, waterGoalMl: 2000, featureFlags: {} },
  activeTimer: null,
  dailyLogs: {},
};

export interface TaskEditFields {
  title: string;
  category: Category;
  priority: Priority;
  date: string | null;
  time: string;
  durationMin: number | null;
  note: string;
  repeat: Repeat;
}

function uid(): string {
  return crypto.randomUUID();
}

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
      habitsRes,
      blocksRes,
      habitLogsRes,
      blockLogsRes,
      blockLogEntriesRes,
      seriesRes,
      taskStatusesRes,
      booksRes,
      remindersRes,
      settingsRes,
      timerRes,
      dailyLogsRes,
    ] = await Promise.all([
      supabase.from("tasks").select("*").order("sort_order"),
      supabase.from("habits").select("*").order("sort_order"),
      supabase.from("fixed_blocks").select("*").order("sort_order"),
      supabase.from("habit_logs").select("*"),
      supabase.from("fixed_block_logs").select("*"),
      supabase.from("fixed_block_log_entries").select("*"),
      supabase.from("task_series").select("*"),
      supabase.from("task_statuses").select("*").order("sort_order"),
      supabase.from("books").select("*").order("created_at"),
      supabase.from("reminders").select("*").order("created_at"),
      supabase.from("settings").select("*").maybeSingle(),
      supabase.from("active_timer").select("*").maybeSingle(),
      supabase.from("daily_logs").select("*"),
    ]);

    const dailyLogs: Record<string, DailyLog> = {};
    (dailyLogsRes.data ?? []).forEach((row) => {
      dailyLogs[row.log_date] = rowToDailyLog(row);
    });

    const next: BoardState = {
      tasks: (tasksRes.data ?? []).map(rowToTask),
      habits: buildRecurring(habitsRes.data ?? [], habitLogsRes.data ?? [], "habit_id"),
      fixedBlocks: buildRecurring(blocksRes.data ?? [], blockLogsRes.data ?? [], "block_id", blockLogEntriesRes.data ?? []),
      taskSeries: (seriesRes.data ?? []).map(rowToSeries),
      taskStatuses: (taskStatusesRes.data ?? []).map(rowToTaskStatus),
      books: (booksRes.data ?? []).map(rowToBook),
      reminders: (remindersRes.data ?? []).map(rowToReminder),
      settings: rowToSettings(settingsRes.data ?? null),
      activeTimer: rowToActiveTimer(timerRes.data ?? null),
      dailyLogs,
    };
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

  const addTask = useCallback(
    (bucketKey: string, title: string) => {
      if (!userId || !title.trim()) return;
      const t: Task = {
        id: uid(),
        title: title.trim(),
        category: "trabalho",
        priority: "media",
        date: bucketKey || null,
        time: "",
        durationMin: null,
        note: "",
        done: false,
        order: nextOrder(bucketKey),
        seriesId: null,
        trackedSeconds: 0,
        quick: 0,
        statusId: defaultStatusId(),
      };
      apply((s) => ({ ...s, tasks: [...s.tasks, t] }));
      supabase.from("tasks").insert(taskToInsertRow(t, userId)).then(({ error }) => {
        if (error) console.error("addTask", error);
      });
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
        if (error) console.error("setTaskStatus", error);
      });
    },
    [apply, supabase]
  );

  const setQuick = useCallback(
    (id: string, quick: 0 | 1 | 2 | 3) => {
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, quick } : x)) }));
      supabase.from("tasks").update({ quick }).eq("id", id).then(({ error }) => {
        if (error) console.error("setQuick", error);
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
          if (error) console.error("reorderBucket", error);
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
      };
      apply((s) => ({ ...s, tasks: [...bumped, clone] }));
      bumped
        .filter((x) => bucketOf(x) === myBucket && x.id !== t.id && (x.order || 0) > myOrder)
        .forEach((x) => {
          supabase.from("tasks").update({ sort_order: x.order }).eq("id", x.id).then(() => {});
        });
      supabase.from("tasks").insert(taskToInsertRow(clone, userId)).then(({ error }) => {
        if (error) console.error("duplicateTask", error);
      });
    },
    [apply, defaultStatusId, supabase, userId]
  );

  const deleteTask = useCallback(
    (id: string, scope: ScopeChoice | null) => {
      const t = stateRef.current.tasks.find((x) => x.id === id);
      if (!t) return;

      if (stateRef.current.activeTimer?.kind === "task" && stateRef.current.activeTimer.itemId === id) {
        apply((s) => ({ ...s, activeTimer: null }));
        supabase.from("active_timer").delete().eq("user_id", userId!).then(() => {});
      }

      if (!t.seriesId || scope === "esta" || !scope) {
        apply((s) => ({ ...s, tasks: s.tasks.filter((x) => x.id !== id) }));
        supabase.from("tasks").delete().eq("id", id).then(({ error }) => {
          if (error) console.error("deleteTask", error);
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
                if (error) console.error("deleteTask skip", error);
              });
          }
        }
        return;
      }

      const today = todayISO();
      const seriesId = t.seriesId;
      const toDeleteIds = stateRef.current.tasks
        .filter((x) => x.seriesId === seriesId && !x.done)
        .filter((x) => {
          if (x.id === id) return true;
          if (scope === "todas") return true;
          if (scope === "proximas" && x.date && x.date > today) return true;
          return false;
        })
        .map((x) => x.id);

      apply((s) => ({ ...s, tasks: s.tasks.filter((x) => !toDeleteIds.includes(x.id)) }));
      supabase.from("tasks").delete().in("id", toDeleteIds).then(({ error }) => {
        if (error) console.error("deleteTask bulk", error);
      });
      apply((s) => ({
        ...s,
        taskSeries: s.taskSeries.map((sr) => (sr.id === seriesId ? { ...sr, repeat: "none" } : sr)),
      }));
      supabase.from("task_series").update({ repeat: "none" }).eq("id", seriesId).then(({ error }) => {
        if (error) console.error("deleteTask stop series", error);
      });
    },
    [apply, supabase, userId]
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
          priority: vals.priority,
          date: vals.date,
          time: vals.time,
          durationMin: vals.durationMin,
          note: vals.note,
          order,
        };

        if (vals.repeat !== "none") {
          const series: TaskSeries = {
            id: uid(),
            title: vals.title,
            category: vals.category,
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
            if (error) console.error("saveTaskEdit series insert", error);
          });
        } else {
          apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? updated : x)) }));
        }
        supabase
          .from("tasks")
          .update(taskToRow(updated, userId))
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("saveTaskEdit", error);
          });
        return;
      }

      // belongs to a series already
      const updated: Task = {
        ...t,
        title: vals.title,
        category: vals.category,
        priority: vals.priority,
        date: vals.date,
        time: vals.time,
        durationMin: vals.durationMin,
        note: vals.note,
        order,
      };
      apply((s) => ({ ...s, tasks: s.tasks.map((x) => (x.id === id ? updated : x)) }));
      supabase
        .from("tasks")
        .update(taskToRow(updated, userId))
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("saveTaskEdit occurrence", error);
        });

      if (scope === "esta" || !scope) return;

      const seriesId = t.seriesId;
      const seriesPatch = {
        title: vals.title,
        category: vals.category,
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
        if (error) console.error("saveTaskEdit series update", error);
      });

      const today = todayISO();
      const siblingIds: string[] = [];
      apply((s) => ({
        ...s,
        tasks: s.tasks.map((x) => {
          if (x.seriesId !== seriesId || x.id === id || x.done) return x;
          if (scope === "proximas" && !(x.date && x.date > today)) return x;
          siblingIds.push(x.id);
          return { ...x, title: vals.title, category: vals.category, priority: vals.priority, time: vals.time, note: vals.note };
        }),
      }));
      siblingIds.forEach((sid) => {
        supabase
          .from("tasks")
          .update({ title: vals.title, category: vals.category, priority: vals.priority, time: vals.time || null, note: vals.note })
          .eq("id", sid)
          .then(({ error }) => {
            if (error) console.error("saveTaskEdit sibling", error);
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
            priority: series.priority,
            date: iso,
            time: series.time || "",
            durationMin: null,
            note: series.note || "",
            done: false,
            order: nextOrder(iso),
            seriesId: series.id,
            trackedSeconds: 0,
            quick: 0,
            statusId: defaultStatusId(),
          });
        });
      });
      if (!created.length) return;
      apply((s) => ({ ...s, tasks: [...s.tasks, ...created] }));
      supabase
        .from("tasks")
        .insert(created.map((t) => taskToInsertRow(t, userId)))
        .then(({ error }) => {
          if (error) console.error("ensureOccurrencesInView", error);
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
        if (error) console.error("addTaskStatus", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateTaskStatus = useCallback(
    (id: string, patch: Partial<Pick<TaskStatus, "label" | "color" | "isDone">>) => {
      apply((s) => ({ ...s, taskStatuses: s.taskStatuses.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      supabase.from("task_statuses").update(taskStatusToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) console.error("updateTaskStatus", error);
      });
      if (patch.isDone === undefined) return;
      const isDone = patch.isDone;
      const affectedIds = stateRef.current.tasks.filter((t) => t.statusId === id && t.done !== isDone).map((t) => t.id);
      if (!affectedIds.length) return;
      apply((s) => ({ ...s, tasks: s.tasks.map((t) => (t.statusId === id ? { ...t, done: isDone } : t)) }));
      supabase.from("tasks").update({ done: isDone }).in("id", affectedIds).then(({ error }) => {
        if (error) console.error("updateTaskStatus sync done", error);
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
        if (error) console.error("deleteTaskStatus", error);
      });
      if (affectedIds.length) {
        supabase
          .from("tasks")
          .update({ status_id: fallback.id, done: fallback.isDone })
          .in("id", affectedIds)
          .then(({ error }) => {
            if (error) console.error("deleteTaskStatus reassign", error);
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
      const b: Book = { id: uid(), title: title.trim(), status: "para_ler", insights: null, startedAt: null };
      apply((s) => ({ ...s, books: [...s.books, b] }));
      supabase.from("books").insert(bookToInsertRow(b, userId)).then(({ error }) => {
        if (error) console.error("addBook", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateBook = useCallback(
    (id: string, patch: Partial<Pick<Book, "title" | "status" | "insights" | "startedAt">>) => {
      apply((s) => ({ ...s, books: s.books.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
      supabase.from("books").update(bookToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) console.error("updateBook", error);
      });
    },
    [apply, supabase]
  );

  const deleteBook = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));
      supabase.from("books").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("deleteBook", error);
      });
    },
    [apply, supabase]
  );

  // ---------- reminders ----------
  const addReminder = useCallback(
    (title: string) => {
      if (!userId || !title.trim()) return;
      const r: Reminder = { id: uid(), title: title.trim(), date: null, time: null, repeat: "none", done: false };
      apply((s) => ({ ...s, reminders: [...s.reminders, r] }));
      supabase.from("reminders").insert(reminderToInsertRow(r, userId)).then(({ error }) => {
        if (error) console.error("addReminder", error);
      });
    },
    [apply, supabase, userId]
  );

  const updateReminder = useCallback(
    (id: string, patch: Partial<Pick<Reminder, "title" | "date" | "time" | "repeat" | "done">>) => {
      apply((s) => ({ ...s, reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
      supabase.from("reminders").update(reminderToUpdateRow(patch)).eq("id", id).then(({ error }) => {
        if (error) console.error("updateReminder", error);
      });
    },
    [apply, supabase]
  );

  const deleteReminder = useCallback(
    (id: string) => {
      apply((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
      supabase.from("reminders").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("deleteReminder", error);
      });
    },
    [apply, supabase]
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
          if (error) console.error("addRecurring", error);
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
          if (error) console.error("updateRecurring", error);
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
          if (error) console.error("updateRecurringNoteOptions", error);
        });
    },
    [apply, supabase]
  );

  const deleteRecurringItem = useCallback(
    (kind: "habit" | "block", id: string) => {
      const listKey = listKeyFor(kind);
      if (stateRef.current.activeTimer?.kind === kind && stateRef.current.activeTimer.itemId === id) {
        apply((s) => ({ ...s, activeTimer: null }));
        supabase.from("active_timer").delete().eq("user_id", userId!).then(() => {});
      }
      apply((s) => ({ ...s, [listKey]: s[listKey].filter((x) => x.id !== id) }));
      supabase.from(tableFor(kind)).delete().eq("id", id).then(({ error }) => {
        if (error) console.error("deleteRecurringItem", error);
      });
    },
    [apply, supabase, userId]
  );

  const deleteRecurringLog = useCallback(
    (kind: "habit" | "block", id: string, iso: string) => {
      const query =
        kind === "habit"
          ? supabase.from("habit_logs").delete().eq("habit_id", id).eq("log_date", iso)
          : supabase.from("fixed_block_logs").delete().eq("block_id", id).eq("log_date", iso);
      query.then(({ error }) => {
        if (error) console.error("deleteRecurringLog", error);
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
        if (error) console.error("upsertRecurringLog", error);
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
          if (error) console.error("addBlockLogEntry", error);
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
          if (error) console.error("deleteBlockLogEntry", error);
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

  const stopActiveTimer = useCallback(() => {
    const at = stateRef.current.activeTimer;
    if (!at || !userId) return;
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
            if (error) console.error("stopActiveTimer task", error);
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
  }, [apply, supabase, upsertRecurringLog, userId]);

  const toggleTimer = useCallback(
    (kind: TimerKind, id: string, logDate: string) => {
      if (!userId) return;
      const already = stateRef.current.activeTimer?.kind === kind && stateRef.current.activeTimer.itemId === id;
      stopActiveTimer();
      if (already) {
        apply((s) => ({ ...s, activeTimer: null }));
        supabase.from("active_timer").delete().eq("user_id", userId).then(() => {});
        return;
      }
      const at: ActiveTimer = { kind, itemId: id, logDate, startedAt: Date.now() };
      apply((s) => ({ ...s, activeTimer: at }));
      supabase
        .from("active_timer")
        .upsert({ user_id: userId, kind, item_id: id, log_date: logDate, started_at: new Date(at.startedAt).toISOString() })
        .then(({ error }) => {
          if (error) console.error("toggleTimer", error);
        });
    },
    [apply, stopActiveTimer, supabase, userId]
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
        })
        .then(({ error }) => {
          if (error) console.error("updateSettings", error);
        });
    },
    [apply, supabase, userId]
  );

  // ---------- daily log (água, dieta, sono) ----------
  const updateDailyLog = useCallback(
    (logDate: string, patch: Partial<DailyLog>) => {
      if (!userId) return;
      const current: DailyLog = stateRef.current.dailyLogs[logDate] ?? {
        waterMl: 0,
        dietPct: null,
        dietNote: null,
        sleptAt: null,
        wokeAt: null,
        mood: null,
        moodNote: null,
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
            slept_at: merged.sleptAt,
            woke_at: merged.wokeAt,
            mood: merged.mood,
            mood_note: merged.moodNote,
          },
          { onConflict: "user_id,log_date" }
        )
        .then(({ error }) => {
          if (error) console.error("updateDailyLog", error);
        });
    },
    [apply, supabase, userId]
  );

  return {
    state,
    loading,
    reload: load,
    isTimerRunning: (kind: TimerKind, id: string) =>
      state.activeTimer?.kind === kind && state.activeTimer.itemId === id,
    findTrackable,
    addTask,
    setTaskStatus,
    setQuick,
    reorderBucket,
    duplicateTask,
    deleteTask,
    saveTaskEdit,
    ensureOccurrencesInView,
    addTaskStatus,
    updateTaskStatus,
    deleteTaskStatus,
    reorderTaskStatuses,
    addBook,
    updateBook,
    deleteBook,
    addReminder,
    updateReminder,
    deleteReminder,
    addRecurring,
    updateRecurring,
    updateRecurringNoteOptions,
    deleteRecurringItem,
    clearRecurringDay,
    commitRecurringDay,
    addBlockLogEntry,
    deleteBlockLogEntry,
    toggleTimer,
    updateSettings,
    updateDailyLog,
  };
}

export type UseBoard = ReturnType<typeof useBoard>;
