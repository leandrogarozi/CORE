// O emoji saiu daqui em 30/09: o humor passou a ser desenhado em traço
// (MoodFaceIcon), pelo valor `v`. Emoji colorido é fonte do sistema — muda de
// cara entre computador e celular e puxa a atenção toda pra si.
export const MOODS = [
  { v: 1, label: "Péssimo", color: "#C0504D" },
  { v: 2, label: "Ruim", color: "#D98A3D" },
  { v: 3, label: "Neutro", color: "#C9A227" },
  { v: 4, label: "Bom", color: "#7CB342" },
  { v: 5, label: "Ótimo", color: "#2E9E5B" },
  // Doente não é um nível de humor (fica fora da média/gráfico do dashboard),
  // é um estado físico à parte — v:0 pra não interferir na escala 1-5.
  { v: 0, label: "Doente", color: "#8873C9" },
] as const;

export function moodByValue(v: number | null | undefined) {
  return MOODS.find((m) => m.v === v);
}

// Emoção específica do dia, junto do check-in de Humor (intensidade 1-5 continua
// existindo — isso é um campo a mais, não substitui).
export const MOOD_EMOTIONS = [
  { v: "estressado", label: "Estressado" },
  { v: "ansioso", label: "Ansioso" },
  { v: "nervoso", label: "Nervoso" },
  { v: "desmotivado", label: "Desmotivado" },
  { v: "confiante", label: "Confiante" },
  { v: "em_paz", label: "Em paz" },
] as const;

export function moodEmotionByValue(v: string | null | undefined) {
  return MOOD_EMOTIONS.find((m) => m.v === v);
}
