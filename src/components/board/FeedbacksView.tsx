"use client";

import { useCallback, useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { CommentIcon, TrashIcon } from "./icons";

/**
 * Feedbacks recebidos (só o dono vê). Cada mensagem enviada pelo "Canal de feedback" fica guardada para sempre
 * no banco; aqui estão todas, com quem mandou, a tela, o aparelho e se já foi lida/resolvida.
 */
interface Feedback {
  id: string;
  user_id: string;
  email: string | null;
  tipo: string;
  texto: string;
  pagina: string | null;
  aparelho: string | null;
  criado_em: string;
  lido_em: string | null;
}

const ROTULO: Record<string, string> = { problema: "Problema", ideia: "Ideia", duvida: "Dúvida", elogio: "Elogio", credito: "Crédito de WhatsApp" };

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "Chrome no Mac", "Safari no iPhone"... a partir do texto técnico do aparelho. */
function aparelhoCurto(ua: string | null): string {
  if (!ua) return "";
  const nav = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const so = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return so ? `${nav} no ${so}` : nav;
}

type Aba = "aresolver" | "resolvidos" | "todos";

export function FeedbacksView({ onBack }: { onBack: () => void }) {
  const { askConfirm } = useBoardCtx();
  const [lista, setLista] = useState<Feedback[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("aresolver");

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/feedback");
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.erro === "so_dono" ? "Só o dono vê os feedbacks." : "Não consegui carregar agora.");
      setLista(j.feedbacks);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui carregar.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(carregar, 0);
    return () => clearTimeout(t);
  }, [carregar]);

  async function marcar(f: Feedback, lido: boolean) {
    setLista((l) => (l ? l.map((x) => (x.id === f.id ? { ...x, lido_em: lido ? new Date().toISOString() : null } : x)) : l));
    await fetch("/api/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: f.id, lido }) }).catch(() => {});
  }

  async function excluir(f: Feedback) {
    setLista((l) => (l ? l.filter((x) => x.id !== f.id) : l));
    await fetch("/api/feedback", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: f.id }) }).catch(() => {});
  }

  const aResolver = (lista ?? []).filter((f) => !f.lido_em);
  const resolvidos = (lista ?? []).filter((f) => !!f.lido_em);
  const visiveis = aba === "aresolver" ? aResolver : aba === "resolvidos" ? resolvidos : lista ?? [];

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Feedbacks recebidos</span>
        <span style={{ width: 32 }} />
      </div>
      <div className="narrow-list">
        <p className="hint-text">Tudo o que as pessoas mandaram pelo Canal de feedback fica guardado aqui. Marque a caixinha quando resolver: o que não está marcado fica em &ldquo;A resolver&rdquo;.</p>
        <div className="view-toggle">
          {(
            [
              ["aresolver", `A resolver (${aResolver.length})`],
              ["resolvidos", `Resolvidos (${resolvidos.length})`],
              ["todos", `Todos (${lista?.length ?? 0})`],
            ] as const
          ).map(([v, rotulo]) => (
            <button key={v} type="button" className={"view-toggle-btn" + (aba === v ? " active" : "")} onClick={() => setAba(v)}>
              {rotulo}
            </button>
          ))}
        </div>
        {erro && <div className="auth-error">{erro}</div>}
        {lista === null && !erro && <div className="hint-text">Carregando...</div>}
        {lista !== null && visiveis.length === 0 && (
          <div className="list-card">
            <div className="hp-empty">{aba === "aresolver" ? "Nada a resolver. Tudo resolvido." : "Nada por aqui ainda."}</div>
          </div>
        )}
        {visiveis.map((f) => (
          <article key={f.id} className={"list-card fb-card" + (f.lido_em ? " lido" : "")}>
            <div className="fb-cab">
              <span className="fb-tipo">
                <CommentIcon /> {ROTULO[f.tipo] ?? f.tipo}
              </span>
              <span className="fb-quem">{f.email ?? "conta já apagada"}</span>
              <span className="fb-data">{dataHora(f.criado_em)}</span>
            </div>
            <p className="fb-texto">{f.texto}</p>
            <div className="fb-rodape">
              <span className="fb-meta">
                {f.pagina ? `Tela: ${f.pagina}` : ""}
                {f.pagina && f.aparelho ? " · " : ""}
                {aparelhoCurto(f.aparelho)}
              </span>
              <span className="fb-acoes">
                <label className="fb-check">
                  <input type="checkbox" checked={!!f.lido_em} onChange={(e) => marcar(f, e.target.checked)} />
                  <span>{f.lido_em ? "Resolvido" : "A resolver"}</span>
                </label>
                <button
                  type="button"
                  className="icon-btn danger-hover"
                  title="Excluir este feedback"
                  aria-label="Excluir este feedback"
                  onClick={() => askConfirm("Tem certeza que deseja excluir este feedback? Essa ação não pode ser desfeita.", () => excluir(f))}
                >
                  <TrashIcon />
                </button>
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
