"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

// Posiciona um popover (portal pra document.body) abaixo/alinhado a um elemento âncora,
// mas ajusta a posição depois de montado se o popover ultrapassar a borda da tela
// (desliza pra esquerda se estourar a direita, abre pra cima do âncora se não couber embaixo).
export function useClampedPopoverPos(anchorRect: DOMRect | null, ref: RefObject<HTMLDivElement | null>) {
  const [pos, setPos] = useState({ top: (anchorRect?.bottom ?? 0) + 4, left: anchorRect?.left ?? 0 });

  useLayoutEffect(() => {
    if (!anchorRect) return;
    const el = ref.current;
    if (!el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();
    let left = anchorRect.left;
    let top = anchorRect.bottom + 4;

    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - rect.width);
    }
    if (top + rect.height > window.innerHeight - margin) {
      const above = anchorRect.top - rect.height - 4;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - margin - rect.height);
    }
    setPos({ top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRect]);

  return pos;
}
