"use client";

import { useRef, useState } from "react";
import { useBoardCtx } from "./board-context";
import { separarFrases } from "@/lib/metanoia";
import type { MetanoiaTipo } from "@/lib/types";

/**
 * Traz frases (ou perguntas) de fora: colando uma lista ou subindo prints. O texto do print é lido no próprio
 * aparelho (OCR) e a imagem nunca sai dele nem é guardada: só o texto, que vai para "Para revisar".
 */
export function ImportarFrases({ tipo }: { tipo: MetanoiaTipo }) {
  const { board } = useBoardCtx();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [lendo, setLendo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [doPrint, setDoPrint] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const itens = separarFrases(texto);
  const rotulo = tipo === "pergunta" ? "perguntas" : "frases";

  async function lerPrints(files: FileList | null) {
    if (!files?.length) return;
    setAviso(null);
    try {
      const { createWorker } = await import("tesseract.js");
      setLendo("Preparando a leitura (na primeira vez baixa o idioma, uns segundos)…");
      const worker = await createWorker("por");
      const partes: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setLendo(`Lendo print ${i + 1} de ${files.length}…`);
        const { data } = await worker.recognize(files[i]);
        if (data.text.trim()) partes.push(data.text.trim());
      }
      await worker.terminate();
      setTexto((v) => [v.trim(), ...partes].filter(Boolean).join("\n\n"));
      setDoPrint(true);
      if (!partes.length) setAviso("Não consegui ler texto nesses prints.");
    } catch {
      setAviso("Não consegui ler o print agora. Tente de novo ou cole o texto.");
    } finally {
      setLendo(null);
      if (input.current) input.current.value = "";
    }
  }

  function enviar() {
    let novas = 0;
    for (const f of itens) {
      const id = board.addMetanoiaFrase({
        texto: f.texto,
        autor: tipo === "pergunta" ? null : f.autor,
        fonte: doPrint ? "Print enviado no app" : "Lista colada",
        origem: doPrint ? "print" : "minha",
        status: "pendente",
        tipo,
      });
      if (id) novas++;
    }
    setAviso(`${novas} ${novas === 1 ? "entrou" : "entraram"} em Para revisar${itens.length - novas ? ` (${itens.length - novas} já existiam)` : ""}.`);
    setTexto("");
    setDoPrint(false);
  }

  return (
    <div className="list-card">
      <button type="button" className="meta-importar-topo" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
        Trazer {rotulo} de fora (colar lista ou subir prints)
      </button>
      {aberto && (
        <div className="meta-novo">
          <textarea
            value={texto}
            rows={5}
            placeholder={`Cole aqui, uma ${tipo === "pergunta" ? "pergunta" : "frase"} por linha (ou separadas por linha em branco). Pode ter número na frente e “— Autor” no fim.`}
            aria-label={`Lista de ${rotulo}`}
            onChange={(e) => {
              setTexto(e.target.value);
              setDoPrint(false);
            }}
          />
          <div className="meta-novo-linha">
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => lerPrints(e.target.files)} />
            <button type="button" className="btn btn-ghost" disabled={!!lendo} onClick={() => input.current?.click()}>
              Subir prints
            </button>
            <button type="button" className="btn btn-accent" disabled={!itens.length || !!lendo} onClick={enviar}>
              Enviar {itens.length || ""} para revisar
            </button>
          </div>
          {lendo && <span className="hint-text">{lendo}</span>}
          {!lendo && <span className="hint-text">O print é lido neste aparelho e descartado: o FARO guarda só o texto. Tudo entra em “Para revisar” para você conferir.</span>}
          {aviso && <span className="hint-text">{aviso}</span>}
        </div>
      )}
    </div>
  );
}
