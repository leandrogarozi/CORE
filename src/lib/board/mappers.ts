import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import type {
  ActiveTimer,
  Category,
  DailyLog,
  DayLog,
  Priority,
  Repeat,
  RecurringItem,
  Settings,
  Task,
  TaskSeries,
  TaskStatus,
  TimerKind,
} from "@/lib/types";
import { DEFAULT_TAG_COLORS } from "@/lib/types";

type TaskRow = Tables<"tasks">;
type HabitRow = Tables<"habits">;
type BlockRow = Tables<"fixed_blocks">;
type HabitLogRow = Tables<"habit_logs">;
type BlockLogRow = Tables<"fixed_block_logs">;
type SeriesRow = Tables<"task_series">;
type TaskStatusRow = Tables<"task_statuses">;
type SettingsRow = Tables<"settings">;
type ActiveTimerRow = Tables<"active_timer">;
type DailyLogRow = Tables<"daily_logs">;

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    category: row.category as Category,
    priority: row.priority as Priority,
    date: row.date,
    time: row.time ?? "",
    durationMin: row.duration_minutes,
    note: row.note ?? "",
    done: row.done,
    order: row.sort_order,
    seriesId: row.series_id,
    trackedSeconds: row.tracked_seconds,
    quick: row.quick,
    statusId: row.status_id,
  };
}

export function taskToRow(t: Partial<Task> & { id: string }, userId: string): TablesUpdate<"tasks"> {
  const row: TablesUpdate<"tasks"> = { user_id: userId };
  if (t.title !== undefined) row.title = t.title;
  if (t.category !== undefined) row.category = t.category;
  if (t.priority !== undefined) row.priority = t.priority;
  if (t.date !== undefined) row.date = t.date;
  if (t.time !== undefined) row.time = t.time || null;
  if (t.durationMin !== undefined) row.duration_minutes = t.durationMin;
  if (t.note !== undefined) row.note = t.note;
  if (t.done !== undefined) row.done = t.done;
  if (t.order !== undefined) row.sort_order = t.order;
  if (t.seriesId !== undefined) row.series_id = t.seriesId;
  if (t.trackedSeconds !== undefined) row.tracked_seconds = t.trackedSeconds;
  if (t.quick !== undefined) row.quick = t.quick;
  if (t.statusId !== undefined) row.status_id = t.statusId;
  return row;
}

export function taskToInsertRow(t: Task, userId: string): TablesInsert<"tasks"> {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    category: t.category,
    priority: t.priority,
    date: t.date,
    time: t.time || null,
    duration_minutes: t.durationMin,
    note: t.note,
    done: t.done,
    sort_order: t.order,
    series_id: t.seriesId,
    tracked_seconds: t.trackedSeconds,
    quick: t.quick,
    status_id: t.statusId,
  };
}

export function rowToTaskStatus(row: TaskStatusRow): TaskStatus {
  return {
    id: row.id,
    label: row.label,
    color: row.color,
    isDone: row.is_done,
    order: row.sort_order,
  };
}

export function taskStatusToInsertRow(s: TaskStatus, userId: string): TablesInsert<"task_statuses"> {
  return {
    id: s.id,
    user_id: userId,
    label: s.label,
    color: s.color,
    is_done: s.isDone,
    sort_order: s.order,
  };
}

export function taskStatusToUpdateRow(s: Partial<TaskStatus>): TablesUpdate<"task_statuses"> {
  const row: TablesUpdate<"task_statuses"> = {};
  if (s.label !== undefined) row.label = s.label;
  if (s.color !== undefined) row.color = s.color;
  if (s.isDone !== undefined) row.is_done = s.isDone;
  if (s.order !== undefined) row.sort_order = s.order;
  return row;
}

export function rowToSeries(row: SeriesRow): TaskSeries {
  return {
    id: row.id,
    title: row.title,
    category: row.category as Category,
    priority: row.priority as Priority,
    note: row.note ?? "",
    time: row.time ?? "",
    repeat: row.repeat as Repeat,
    startDate: row.start_date,
    skippedDates: row.skipped_dates ?? [],
  };
}

export function seriesToInsertRow(s: TaskSeries, userId: string): TablesInsert<"task_series"> {
  return {
    id: s.id,
    user_id: userId,
    title: s.title,
    category: s.category,
    priority: s.priority,
    note: s.note,
    time: s.time || null,
    repeat: s.repeat,
    start_date: s.startDate,
    skipped_dates: s.skippedDates,
  };
}

export function seriesToUpdateRow(s: Partial<TaskSeries>): TablesUpdate<"task_series"> {
  const row: TablesUpdate<"task_series"> = {};
  if (s.title !== undefined) row.title = s.title;
  if (s.category !== undefined) row.category = s.category;
  if (s.priority !== undefined) row.priority = s.priority;
  if (s.note !== undefined) row.note = s.note;
  if (s.time !== undefined) row.time = s.time || null;
  if (s.repeat !== undefined) row.repeat = s.repeat;
  if (s.startDate !== undefined) row.start_date = s.startDate;
  if (s.skippedDates !== undefined) row.skipped_dates = s.skippedDates;
  return row;
}

export function buildRecurring(
  items: (HabitRow | BlockRow)[],
  logs: (HabitLogRow | BlockLogRow)[],
  logKeyField: "habit_id" | "block_id"
): RecurringItem[] {
  return items
    .map((item) => {
      const itemLogs: Record<string, DayLog> = {};
      logs
        .filter((l) => (l as Record<string, unknown>)[logKeyField] === item.id)
        .forEach((l) => {
          itemLogs[l.log_date] = { checked: l.checked, trackedSeconds: l.tracked_seconds };
        });
      return {
        id: item.id,
        name: item.name,
        durationMin: item.duration_minutes,
        order: item.sort_order,
        logs: itemLogs,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export function rowToSettings(row: SettingsRow | null): Settings {
  const tagColors = { ...DEFAULT_TAG_COLORS };
  if (row?.tag_colors && typeof row.tag_colors === "object") {
    Object.assign(tagColors, row.tag_colors as object);
  }
  return {
    tagColors,
    dailyBudgetHours: row?.daily_budget_hours ?? 12,
    waterGoalMl: row?.water_goal_ml ?? 2000,
    featureFlags: (row?.feature_flags as Record<string, boolean> | null) ?? {},
  };
}

export function rowToDailyLog(row: DailyLogRow): DailyLog {
  return {
    waterMl: row.water_ml,
    dietPct: row.diet_pct,
    sleptAt: row.slept_at ? row.slept_at.slice(0, 5) : null,
    wokeAt: row.woke_at ? row.woke_at.slice(0, 5) : null,
  };
}

export function rowToActiveTimer(row: ActiveTimerRow | null): ActiveTimer | null {
  if (!row || !row.kind || !row.item_id || !row.started_at) return null;
  return {
    kind: row.kind as TimerKind,
    itemId: row.item_id,
    logDate: row.log_date ?? "",
    startedAt: new Date(row.started_at).getTime(),
  };
}
