export const MOODS = [
  { v: 1, emoji: "😞", label: "Péssimo", color: "#C0504D" },
  { v: 2, emoji: "😕", label: "Ruim", color: "#D98A3D" },
  { v: 3, emoji: "😐", label: "Neutro", color: "#C9A227" },
  { v: 4, emoji: "🙂", label: "Bom", color: "#7CB342" },
  { v: 5, emoji: "😄", label: "Ótimo", color: "#2E9E5B" },
] as const;

export function moodByValue(v: number | null | undefined) {
  return MOODS.find((m) => m.v === v);
}
