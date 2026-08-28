import type { Json, Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";
import type {
  ActiveTimer,
  Book,
  BookStatus,
  Category,
  Checklist,
  ChecklistItem,
  DailyLog,
  DayLog,
  Medication,
  MedicationGroup,
  MedicationTimeMode,
  Priority,
  Repeat,
  RecurringItem,
  Reminder,
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
type BlockLogEntryRow = Tables<"fixed_block_log_entries">;
type SeriesRow = Tables<"task_series">;
type TaskStatusRow = Tables<"task_statuses">;
type SettingsRow = Tables<"settings">;
type ActiveTimerRow = Tables<"active_timer">;
type DailyLogRow = Tables<"daily_logs">;
type BookRow = Tables<"books">;
type ReminderRow = Tables<"reminders">;
type MedicationRow = Tables<"medications">;
type MedicationGroupRow = Tables<"medication_groups">;
type ChecklistRow = Tables<"checklists">;

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    category: row.category as Category,
    category2: row.category2 as Category | null,
    priority: row.priority as Priority,
    date: row.date,
    time: row.time ?? "",
    durationMin: row.duration_minutes,
    expectedDurationMin: row.expected_duration_min,
    note: row.note ?? "",
    done: row.done,
    order: row.sort_order,
    seriesId: row.series_id,
    trackedSeconds: row.tracked_seconds,
    quick: row.quick,
    statusId: row.status_id,
    deletedAt: row.deleted_at,
  };
}

export function taskToRow(t: Partial<Task> & { id: string }, userId: string): TablesUpdate<"tasks"> {
  const row: TablesUpdate<"tasks"> = { user_id: userId };
  if (t.title !== undefined) row.title = t.title;
  if (t.category !== undefined) row.category = t.category;
  if (t.category2 !== undefined) row.category2 = t.category2;
  if (t.priority !== undefined) row.priority = t.priority;
  if (t.date !== undefined) row.date = t.date;
  if (t.time !== undefined) row.time = t.time || null;
  if (t.durationMin !== undefined) row.duration_minutes = t.durationMin;
  if (t.expectedDurationMin !== undefined) row.expected_duration_min = t.expectedDurationMin;
  if (t.note !== undefined) row.note = t.note;
  if (t.done !== undefined) row.done = t.done;
  if (t.order !== undefined) row.sort_order = t.order;
  if (t.seriesId !== undefined) row.series_id = t.seriesId;
  if (t.trackedSeconds !== undefined) row.tracked_seconds = t.trackedSeconds;
  if (t.quick !== undefined) row.quick = t.quick;
  if (t.statusId !== undefined) row.status_id = t.statusId;
  if (t.deletedAt !== undefined) row.deleted_at = t.deletedAt;
  return row;
}

export function taskToInsertRow(t: Task, userId: string): TablesInsert<"tasks"> {
  return {
    id: t.id,
    user_id: userId,
    title: t.title,
    category: t.category,
    category2: t.category2,
    priority: t.priority,
    date: t.date,
    time: t.time || null,
    duration_minutes: t.durationMin,
    expected_duration_min: t.expectedDurationMin,
    note: t.note,
    done: t.done,
    sort_order: t.order,
    series_id: t.seriesId,
    tracked_seconds: t.trackedSeconds,
    quick: t.quick,
    status_id: t.statusId,
    deleted_at: t.deletedAt,
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
    category2: row.category2 as Category | null,
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
    category2: s.category2,
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
  if (s.category2 !== undefined) row.category2 = s.category2;
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
  logKeyField: "habit_id" | "block_id",
  entryRows?: BlockLogEntryRow[]
): RecurringItem[] {
  return items
    .map((item) => {
      const itemLogs: Record<string, DayLog> = {};
      logs
        .filter((l) => (l as Record<string, unknown>)[logKeyField] === item.id)
        .forEach((l) => {
          itemLogs[l.log_date] = { checked: l.checked, trackedSeconds: l.tracked_seconds, note: l.note };
        });
      entryRows
        ?.filter((e) => e.block_id === item.id)
        .forEach((e) => {
          const log = itemLogs[e.log_date] ?? { checked: true, trackedSeconds: 0 };
          const entries = [...(log.entries ?? []), { id: e.id, note: e.note, minutes: e.minutes }];
          itemLogs[e.log_date] = { ...log, entries };
        });
      const noteOptions = "note_options" in item ? ((item.note_options as string[] | null) ?? []) : undefined;
      return {
        id: item.id,
        name: item.name,
        durationMin: item.duration_minutes,
        order: item.sort_order,
        logs: itemLogs,
        noteOptions,
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
    avatarUrl: row?.avatar_url ?? null,
    preferredName: row?.preferred_name ?? null,
    birthDate: row?.birth_date ?? null,
    notifyPhone: row?.notify_phone ?? null,
    timezone: row?.timezone ?? null,
  };
}

export function rowToDailyLog(row: DailyLogRow): DailyLog {
  return {
    waterMl: row.water_ml,
    dietPct: row.diet_pct,
    dietNote: row.diet_note,
    sleptAt: row.slept_at ? row.slept_at.slice(0, 5) : null,
    wokeAt: row.woke_at ? row.woke_at.slice(0, 5) : null,
    mood: row.mood,
    moodNote: row.mood_note,
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

export function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    status: row.status as BookStatus,
    insights: row.insights,
    startedAt: row.started_at,
  };
}

export function bookToInsertRow(b: Book, userId: string): TablesInsert<"books"> {
  return {
    id: b.id,
    user_id: userId,
    title: b.title,
    status: b.status,
    insights: b.insights,
    started_at: b.startedAt,
  };
}

export function bookToUpdateRow(b: Partial<Book>): TablesUpdate<"books"> {
  const row: TablesUpdate<"books"> = {};
  if (b.title !== undefined) row.title = b.title;
  if (b.status !== undefined) row.status = b.status;
  if (b.insights !== undefined) row.insights = b.insights;
  if (b.startedAt !== undefined) row.started_at = b.startedAt;
  return row;
}

export function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    date: row.remind_date,
    time: row.remind_time,
    repeat: (row.repeat as Repeat) ?? "none",
    alertMinutesBefore: row.alert_minutes_before,
    done: row.done,
  };
}

export function reminderToInsertRow(r: Reminder, userId: string): TablesInsert<"reminders"> {
  return {
    id: r.id,
    user_id: userId,
    title: r.title,
    remind_date: r.date,
    remind_time: r.time,
    repeat: r.repeat === "none" ? null : r.repeat,
    alert_minutes_before: r.alertMinutesBefore,
    done: r.done,
  };
}

export function reminderToUpdateRow(r: Partial<Reminder>): TablesUpdate<"reminders"> {
  const row: TablesUpdate<"reminders"> = {};
  if (r.title !== undefined) row.title = r.title;
  if (r.date !== undefined) row.remind_date = r.date;
  if (r.time !== undefined) row.remind_time = r.time;
  if (r.repeat !== undefined) row.repeat = r.repeat === "none" ? null : r.repeat;
  if (r.alertMinutesBefore !== undefined) row.alert_minutes_before = r.alertMinutesBefore;
  if (r.done !== undefined) row.done = r.done;
  return row;
}

export function rowToMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    time: row.med_time,
    notes: row.notes,
    startDate: row.start_date,
    durationDays: row.duration_days,
    weekDays: row.week_days,
    active: row.active,
  };
}

export function medicationToInsertRow(m: Medication, userId: string): TablesInsert<"medications"> {
  return {
    id: m.id,
    user_id: userId,
    group_id: m.groupId,
    name: m.name,
    med_time: m.time,
    notes: m.notes,
    start_date: m.startDate,
    duration_days: m.durationDays,
    week_days: m.weekDays,
    active: m.active,
  };
}

export function medicationToUpdateRow(m: Partial<Medication>): TablesUpdate<"medications"> {
  const row: TablesUpdate<"medications"> = {};
  if (m.groupId !== undefined) row.group_id = m.groupId;
  if (m.name !== undefined) row.name = m.name;
  if (m.time !== undefined) row.med_time = m.time;
  if (m.notes !== undefined) row.notes = m.notes;
  if (m.startDate !== undefined) row.start_date = m.startDate;
  if (m.durationDays !== undefined) row.duration_days = m.durationDays;
  if (m.weekDays !== undefined) row.week_days = m.weekDays;
  if (m.active !== undefined) row.active = m.active;
  return row;
}

export function rowToMedicationGroup(row: MedicationGroupRow): MedicationGroup {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    timeMode: (row.time_mode as MedicationTimeMode) ?? "shared",
    sharedTime: row.shared_time,
    startDate: row.start_date,
    durationDays: row.duration_days,
    active: row.active,
  };
}

export function medicationGroupToInsertRow(g: MedicationGroup, userId: string): TablesInsert<"medication_groups"> {
  return {
    id: g.id,
    user_id: userId,
    name: g.name,
    notes: g.notes,
    time_mode: g.timeMode,
    shared_time: g.sharedTime,
    start_date: g.startDate,
    duration_days: g.durationDays,
    active: g.active,
  };
}

export function medicationGroupToUpdateRow(g: Partial<MedicationGroup>): TablesUpdate<"medication_groups"> {
  const row: TablesUpdate<"medication_groups"> = {};
  if (g.name !== undefined) row.name = g.name;
  if (g.notes !== undefined) row.notes = g.notes;
  if (g.timeMode !== undefined) row.time_mode = g.timeMode;
  if (g.sharedTime !== undefined) row.shared_time = g.sharedTime;
  if (g.startDate !== undefined) row.start_date = g.startDate;
  if (g.durationDays !== undefined) row.duration_days = g.durationDays;
  if (g.active !== undefined) row.active = g.active;
  return row;
}

export function rowToChecklist(row: ChecklistRow): Checklist {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    items: ((row.items as unknown as ChecklistItem[] | null) ?? []),
    createdAt: row.created_at.slice(0, 10),
  };
}

export function checklistToInsertRow(c: Checklist, userId: string): TablesInsert<"checklists"> {
  return {
    id: c.id,
    user_id: userId,
    title: c.title,
    type: c.type,
    items: c.items as unknown as Json,
  };
}

export function checklistToUpdateRow(c: Partial<Checklist>): TablesUpdate<"checklists"> {
  const row: TablesUpdate<"checklists"> = {};
  if (c.title !== undefined) row.title = c.title;
  if (c.type !== undefined) row.type = c.type;
  if (c.items !== undefined) row.items = c.items as unknown as Json;
  return row;
}
