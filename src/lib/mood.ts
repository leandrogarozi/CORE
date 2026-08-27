export const MOODS = [
  { v: 1, emoji: "😞", label: "Péssimo", color: "#C0504D" },
  { v: 2, emoji: "😕", label: "Ruim", color: "#D98A3D" },
  { v: 3, emoji: "😐", label: "Neutro", color: "#C9A227" },
  { v: 4, emoji: "🙂", label: "Bom", color: "#7CB342" },
  { v: 5, emoji: "😄", label: "Ótimo", color: "#2E9E5B" },
  // Doente não é um nível de humor (fica fora da média/gráfico do dashboard),
  // é um estado físico à parte — v:0 pra não interferir na escala 1-5.
  { v: 0, emoji: "🤒", label: "Doente", color: "#8873C9" },
] as const;

export function moodByValue(v: number | null | undefined) {
  return MOODS.find((m) => m.v === v);
}
