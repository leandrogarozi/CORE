"use client";

import { useState } from "react";
import { BoltIcon } from "./icons";

const ERROS_DAS_PERGUNTAS: Record<string, string> = {
  texto_curto: "Escreva um pouco mais no aprendizado antes de criar as perguntas.",
  sem_chave: "A IA ainda não está ligada (falta a chave na Vercel).",
  teto: "O teto de gasto da IA deste mês foi atingido. Ajuste em Configurações.",
  chave_invalida: "A chave da IA não foi aceita pela Anthropic.",
};

export const escaparHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type PerguntaGerada = { id: number; texto: string; naSinapse: boolean; naMetanoia: boolean };

/**
 * "Criar perguntas poderosas": a IA lê o texto da sinapse e sugere perguntas. Nada vai a lugar nenhum
 * sozinho: cada pergunta tem dois checks (na sinapse, na Metanoia) e só o que está marcado é enviado.
 */
export function PerguntasDaIA({
  titulo,
  texto,
  existentes,
  podeNaSinapse,
  rotuloAqui = "Na sinapse",
  jaTem = false,
  modo = "perguntas",
  onEnviar,
}: {
  titulo: string;
  texto: string;
  existentes: string[];
  podeNaSinapse: boolean;
  /** Como o check do lugar de origem se chama ("Na sinapse", "No conhecimento"). */
  rotuloAqui?: string;
  /** Já existem perguntas no campo: o botão passa a oferecer "mais", sempre sem repetir. */
  jaTem?: boolean;
  /** "perguntas" (padrão) ou "dicas": dicas práticas, comandos e exemplos para pôr em prática. */
  modo?: "perguntas" | "dicas";
  onEnviar: (naSinapse: string[], naMetanoia: string[]) => { naSinapse: number; naMetanoia: number };
}) {
  const [gerando, setGerando] = useState(false);
  const [lista, setLista] = useState<PerguntaGerada[]>([]);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  // Pergunta aberta para edição (antes de aprovar): o texto editado é o que vai para os lugares marcados.
  const [editando, setEditando] = useState<number | null>(null);
  const dicas = modo === "dicas";
  // "Foco" é o segundo comando: a pessoa diz o que quer explorar e a IA cria só por ali. Sem foco, o ângulo gira sozinho a cada pedido.
  const [foco, setFoco] = useState("");
  const [tentativa, setTentativa] = useState(0);

  async function gerar() {
    setGerando(true);
    setErro("");
    setAviso("");
    try {
      const r = await fetch("/api/ia/perguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, texto, existentes, modo, foco: foco.trim(), angulo: existentes.length + tentativa }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErro(ERROS_DAS_PERGUNTAS[d.erro] ?? "Não consegui criar agora. Tente de novo em instantes.");
      else {
        const novas = d.perguntas as string[];
        setLista(novas.map((t, i) => ({ id: i, texto: t, naSinapse: false, naMetanoia: false })));
        setEditando(null);
        setTentativa((n) => n + 1);
        if (!novas.length)
          setAviso(
            dicas
              ? "Nada novo: este texto não traz nenhuma dica prática que você já não tenha."
              : "Nada novo por esse caminho. Escreva um foco (um tema que você quer explorar) ou tente de novo para olhar por outro ângulo."
          );
      }
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  const marcadas = lista.filter((p) => p.naSinapse || (!dicas && p.naMetanoia)).length;

  function marcar(id: number, campo: "naSinapse" | "naMetanoia", valor: boolean) {
    setLista((l) => l.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)));
  }

  function editar(id: number, texto: string) {
    setLista((l) => l.map((p) => (p.id === id ? { ...p, texto } : p)));
  }

  function fecharEdicao(id: number) {
    // Pergunta apagada por inteiro some da lista em vez de seguir vazia.
    setLista((l) => l.filter((p) => p.id !== id || p.texto.trim()));
    setEditando(null);
  }

  function enviar() {
    const feito = onEnviar(
      lista.filter((p) => p.naSinapse && p.texto.trim()).map((p) => p.texto.trim()),
      lista.filter((p) => p.naMetanoia && p.texto.trim()).map((p) => p.texto.trim())
    );
    const partes = [
      feito.naSinapse ? `${feito.naSinapse} ${rotuloAqui.toLowerCase()}` : "",
      feito.naMetanoia ? `${feito.naMetanoia} na Metanoia` : "",
    ].filter(Boolean);
    setAviso(partes.length ? `Enviado: ${partes.join(" e ")}.` : "Nada novo para enviar (já estavam lá).");
    // O que foi enviado sai da lista; o que ficou sem marca continua para você decidir.
    setLista((l) => l.filter((p) => !p.naSinapse && !p.naMetanoia));
  }

  return (
    <div className="perg-ia">
      <div className="perg-ia-topo">
        <input
          type="text"
          className="perg-ia-foco"
          value={foco}
          maxLength={200}
          placeholder={dicas ? "Foco (opcional): ex. comandos, exemplos prontos" : "Foco (opcional): ex. trabalho, hábitos, medo"}
          aria-label={dicas ? "Foco das dicas" : "Foco das perguntas"}
          onChange={(e) => setFoco(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !gerando && texto.length >= 40 && gerar()}
        />
        <button type="button" className="btn btn-ghost" disabled={gerando || texto.length < 40} onClick={gerar}>
          <BoltIcon />{" "}
          {dicas
            ? gerando ? "Criando dicas…" : lista.length || jaTem ? "Criar mais dicas" : "Criar dicas práticas"
            : gerando ? "Criando perguntas…" : lista.length ? "Criar outras perguntas" : jaTem ? "Criar mais perguntas" : "Criar perguntas poderosas"}
        </button>
        <span className="perg-ia-dica">
          {dicas
            ? "A IA lê só este texto, tira passos e comandos que você pode usar hoje e não repete as dicas que você já tem."
            : "A IA lê só este texto e não repete o que você já tem; cada pedido olha por um ângulo novo, ou pelo foco que você escrever. Você marca para onde cada pergunta vai."}
        </span>
      </div>
      {erro && <p className="perg-ia-erro">{erro}</p>}
      {aviso && !lista.length && <p className="perg-ia-aviso">{aviso}</p>}
      {lista.length > 0 && (
        <div className="perg-ia-lista">
          {aviso && <p className="perg-ia-aviso">{aviso}</p>}
          <div className="perg-ia-cab" aria-hidden="true">
            {podeNaSinapse && <span>{rotuloAqui}</span>}
            {!dicas && <span>Na Metanoia</span>}
          </div>
          {lista.map((p) => (
            <div key={p.id} className="perg-ia-linha">
              {editando === p.id ? (
                <textarea
                  className="perg-ia-edicao"
                  rows={2}
                  autoFocus
                  value={p.texto}
                  aria-label="Editar a pergunta"
                  onChange={(e) => editar(p.id, e.target.value)}
                  onBlur={() => fecharEdicao(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      fecharEdicao(p.id);
                    }
                  }}
                />
              ) : (
                <span className="perg-ia-texto">{p.texto}</span>
              )}
              <button
                type="button"
                className="link-acao perg-ia-editar"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (editando === p.id ? fecharEdicao(p.id) : setEditando(p.id))}
              >
                {editando === p.id ? "Pronto" : "Editar"}
              </button>
              {podeNaSinapse && (
                <label className="perg-ia-check" title={`Guardar esta pergunta (${rotuloAqui.toLowerCase()})`}>
                  <input type="checkbox" checked={p.naSinapse} onChange={(e) => marcar(p.id, "naSinapse", e.target.checked)} />
                  <span className="sr-only">{rotuloAqui}</span>
                </label>
              )}
              {!dicas && (
                <label className="perg-ia-check" title="Mandar para a Metanoia">
                  <input type="checkbox" checked={p.naMetanoia} onChange={(e) => marcar(p.id, "naMetanoia", e.target.checked)} />
                  <span className="sr-only">Na Metanoia</span>
                </label>
              )}
            </div>
          ))}
          <div className="perg-ia-rodape">
            <button type="button" className={"btn" + (marcadas ? " btn-accent" : " btn-ghost")} disabled={!marcadas} onClick={enviar}>
              Enviar {marcadas ? `as ${marcadas} marcadas` : "marcadas"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setLista([])}>
              Descartar o resto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

