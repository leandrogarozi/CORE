import { entraEmReunioes, type Task } from "@/lib/types";

/** Compromissos do dia (reunião, evento, agenda): os que entram na tela Reuniões, por hora. Cancelados e apagados ficam de fora. */
export function eventosDoDia(tasks: Task[], iso: string): Task[] {
  return tasks
    .filter((t) => t.date === iso && !t.deletedAt && !t.cancelled && entraEmReunioes(t))
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || a.title.localeCompare(b.title, "pt-BR"));
}

/** "16:00 Mentoria Febracis" ou só o título, se não tem hora. */
export function rotuloDoEvento(t: Pick<Task, "time" | "title">): string {
  return `${t.time ? `${t.time} ` : ""}${t.title}`;
}
