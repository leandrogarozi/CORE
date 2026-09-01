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

// Emoção específica do dia, junto do check-in de Humor (intensidade 1-5 continua
// existindo — isso é um campo a mais, não substitui).
export const MOOD_EMOTIONS = [
  { v: "estressado", emoji: "😣", label: "Estressado" },
  { v: "ansioso", emoji: "😰", label: "Ansioso" },
  { v: "nervoso", emoji: "😬", label: "Nervoso" },
  { v: "desmotivado", emoji: "😔", label: "Desmotivado" },
  { v: "confiante", emoji: "😎", label: "Confiante" },
  { v: "em_paz", emoji: "😌", label: "Em paz" },
] as const;

export function moodEmotionByValue(v: string | null | undefined) {
  return MOOD_EMOTIONS.find((m) => m.v === v);
}
