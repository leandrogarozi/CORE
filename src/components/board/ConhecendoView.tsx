"use client";

import { useEffect, useState } from "react";
import { useBoardCtx } from "./board-context";
import { CheckIcon, ChevronIcon, DownloadIcon, TrashIcon, UserIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import {
  TEXTO_DE_IMPORTACAO,
  TIPOS_DE_CONHECIMENTO,
  conhecimentoParaExportar,
  lerImportacao,
} from "@/lib/conhecimento";
import { arquivoDoConhecimento } from "@/lib/learning-export";
import { baixarTexto, soONome } from "@/lib/baixar";
import type { KnowledgeItem } from "@/lib/types";

type ResumoGuardado = { resumo: string | null; em: string | null };

const ERROS_DO_RESUMO: Record<string, string> = {
  sem_chave: "A IA ainda não está ligada (falta a chave na Vercel).",
  teto: "O teto de gasto da IA deste mês foi atingido. Ajuste em Configurações.",
  sem_itens: "Aprove pelo menos um item antes de gerar o resumo.",
  chave_invalida: "A chave da IA não foi aceita pela Anthropic.",
};

/** "O que o FARO sabe sobre você": texto corrido escrito pela IA com o que você aprovou. */
function ResumoDoFaro({ aprovados }: { aprovados: number }) {
  const [dados, setDados] = useState<ResumoGuardado | null>(null);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch("/api/ia/resumo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ResumoGuardado | null) => vivo && setDados(d ?? { resumo: null, em: null }))
      .catch(() => vivo && setDados({ resumo: null, em: null }));
    return () => {
      vivo = false;
    };
  }, []);

  async function gerar() {
    setGerando(true);
    setErro("");
    try {
      const r = await fetch("/api/ia/resumo", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErro(ERROS_DO_RESUMO[d.erro] ?? "Não consegui gerar agora. Tente de novo em instantes.");
      else setDados({ resumo: d.resumo, em: d.em });
    } catch {
      setErro("Sem conexão. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  const quando = dados?.em ? new Date(dados.em).toLocaleDateString("pt-BR") : "";
  return (
    <div className="synapse-intro know-resumo">
      <div className="synapse-intro-title">
        <UserIcon /> O que o FARO sabe sobre você
      </div>
      {dados?.resumo ? (
        <>
          <div className="know-resumo-texto">{dados.resumo}</div>
          <p className="know-resumo-meta">Escrito pela IA em {quando}, com o que você aprovou. Entra no backup e é lido pelo conector.</p>
        </>
      ) : (
        <p>
          {aprovados
            ? "A IA lê tudo o que você aprovou e escreve, em texto corrido, o que o FARO sabe sobre você. Você confere se está certo."
            : "Aprove alguns itens abaixo e a IA escreve aqui, em texto corrido, o que o FARO sabe sobre você."}
        </p>
      )}
      {erro && <p className="know-resumo-erro">{erro}</p>}
      <button type="button" className="btn btn-accent" disabled={gerando || !aprovados} onClick={gerar}>
        {gerando ? "Escrevendo…" : dados?.resumo ? "Atualizar resumo" : "Gerar resumo"}
      </button>
      <span className="know-resumo-custo"> Custa cerca de R$ 0,30 por vez (entra no painel de custo).</span>
    </div>
  );
}

type Aba = "pendente" | "aprovado" | "descartado";

function ItemCard({ item }: { item: KnowledgeItem }) {
  const { board, askConfirm } = useBoardCtx();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);
  const [conteudo, setConteudo] = useState(item.conteudo);
  const mudou = titulo.trim() !== item.titulo || conteudo !== item.conteudo;

  function salvar() {
    board.updateKnowledge(item.id, { titulo: titulo.trim() || item.titulo, conteudo });
  }

  function baixar() {
    const a = arquivoDoConhecimento(conhecimentoParaExportar(item));
    baixarTexto(soONome(a.nome), a.conteudo);
  }

  return (
    <div className={"know-item know-" + item.status}>
      <div className="know-item-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <ChevronIcon />
        </button>
        <select
          className="know-tipo"
          value={item.tipo}
          aria-label="Tipo"
          onChange={(e) => board.updateKnowledge(item.id, { tipo: e.target.value })}
        >
          {TIPOS_DE_CONHECIMENTO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.rotulo}
            </option>
          ))}
        </select>
        <button type="button" className="know-titulo" onClick={() => setAberto((v) => !v)}>
          {item.titulo}
        </button>
        <span className="know-meta">
          {item.dataRef ? `${item.dataRef} · ` : ""}
          {item.fonte === "manual" ? "escrito no FARO" : "veio da IA"}
        </span>
        <span className="know-acoes">
          {item.status !== "aprovado" && (
            <button type="button" className="btn btn-ghost know-aprovar" onClick={() => board.setKnowledgeStatus([item.id], "aprovado")}>
              <CheckIcon /> Aprovar
            </button>
          )}
          {item.status === "pendente" && (
            <button type="button" className="btn btn-ghost" onClick={() => board.setKnowledgeStatus([item.id], "descartado")}>
              Descartar
            </button>
          )}
          {item.status === "aprovado" && (
            <button type="button" className="icon-btn" title="Baixar como arquivo (.md)" onClick={baixar}>
              <DownloadIcon />
            </button>
          )}
          <button
            type="button"
            className="icon-btn danger-hover"
            title="Excluir"
            onClick={() => askConfirm(`Excluir "${item.titulo}"?`, () => board.deleteKnowledge(item.id))}
          >
            <TrashIcon />
          </button>
        </span>
      </div>
      {!aberto && item.conteudo && <div className="know-preview">{item.conteudo.slice(0, 220)}</div>}
      {aberto && (
        <div className="know-body">
          <input type="text" className="know-edit-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Título" />
          <textarea
            className="know-edit-conteudo"
            rows={Math.min(24, Math.max(6, conteudo.split("\n").length + 1))}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            aria-label="Conteúdo"
          />
          {item.origem && <div className="know-meta">De onde veio na IA: {item.origem}</div>}
          {item.tags.length > 0 && <div className="know-meta">Tags: {item.tags.join(", ")}</div>}
          <div className="edit-actions">
            <button type="button" className={"btn" + (mudou ? " btn-accent" : " btn-ghost")} disabled={!mudou} onClick={salvar}>
              {mudou ? "Salvar" : "Salvo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConhecendoView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [aba, setAba] = useState<Aba>("pendente");
  const [importando, setImportando] = useState(false);
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [colado, setColado] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [lendo, setLendo] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [novoTitulo, setNovoTitulo] = useState("");

  const itens = board.state.knowledgeItems;
  const daAba = itens.filter((k) => k.status === aba && (filtro === "todos" || k.tipo === filtro));
  const conta = (s: Aba) => itens.filter((k) => k.status === s).length;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(TEXTO_DE_IMPORTACAO);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setMostrarTexto(true);
    }
  }

  async function importar() {
    setLendo(true);
    try {
      // Cada arquivo é lido por si: um arquivo sem os blocos de item vira um item
      // só, com o nome do arquivo como título.
      const lidos = lerImportacao(colado);
      for (const f of arquivos) {
        lidos.push(...lerImportacao(await f.text(), f.name.replace(/\.(md|markdown|txt)$/i, "")));
      }
      if (!lidos.length) {
        setResultado("Não encontrei nada para importar.");
        return;
      }
      const { novos, repetidos } = await board.importKnowledge(lidos);
      setResultado(
        `${novos} ${novos === 1 ? "item novo" : "itens novos"} para revisar` +
          (repetidos ? ` · ${repetidos} já existia${repetidos === 1 ? "" : "m"} e ficou de fora` : "") +
          ". Se a IA mandou em partes, traga a próxima parte."
      );
      setColado("");
      setArquivos([]);
      setAba("pendente");
    } catch (e) {
      setResultado(`Não consegui ler: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLendo(false);
    }
  }

  async function escrever() {
    const t = novoTitulo.trim();
    if (!t) return;
    setNovoTitulo("");
    await board.importKnowledge([{ tipo: "perfil", titulo: t, conteudo: "", data: null, origem: null, tags: [] }], "manual", "aprovado");
    setAba("aprovado");
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Conhecendo você</span>
        <span style={{ width: 32 }} />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <ResumoDoFaro aprovados={conta("aprovado")} />

        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <UserIcon /> O que a sua IA já sabe, agora no FARO
          </div>
          <p>
            Traga para cá tudo o que a sua IA (Claude, ChatGPT…) já aprendeu sobre você e o que vocês já produziram
            juntos. Você revisa cada item: o que aprovar passa a fazer parte do seu cérebro no FARO, entra no backup e
            vira arquivo na sua pasta de aprendizados.
          </p>
          {!importando ? (
            <button type="button" className="btn btn-accent" onClick={() => setImportando(true)}>
              Trazer o que minha IA já sabe
            </button>
          ) : (
            <div className="know-import">
              <div className="know-passo">
                <strong>1.</strong> Copie o pedido e cole numa conversa nova da sua IA.
                <div className="know-passo-acoes">
                  <button type="button" className="btn btn-accent" onClick={copiar}>
                    {copiado ? "Copiado!" : "Copiar o pedido"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setMostrarTexto((v) => !v)}>
                    {mostrarTexto ? "Esconder o texto" : "Ver o texto"}
                  </button>
                </div>
                {mostrarTexto && <pre className="know-texto">{TEXTO_DE_IMPORTACAO}</pre>}
              </div>
              <div className="know-passo">
                <strong>2.</strong> Anexe o(s) arquivo(s) .md que a IA criou. Se ela respondeu em texto, cole aqui
                embaixo. Pode trazer uma parte de cada vez.
                <div className="know-arquivos">
                  <label className="btn btn-ghost" style={{ alignSelf: "flex-start", cursor: "pointer" }}>
                    Anexar arquivos (.md ou .txt)
                    <input
                      type="file"
                      multiple
                      accept=".md,.markdown,.txt,text/markdown,text/plain"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const novos = Array.from(e.target.files ?? []);
                        setArquivos((a) => [...a, ...novos.filter((n) => !a.some((x) => x.name === n.name && x.size === n.size))]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {arquivos.length > 0 && (
                    <div className="know-arquivos-lista">
                      {arquivos.map((f) => (
                        <div key={f.name + f.size}>
                          {f.name} ({Math.max(1, Math.round(f.size / 1024))} KB){" "}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ padding: "0 6px", fontSize: 11 }}
                            onClick={() => setArquivos((a) => a.filter((x) => x !== f))}
                          >
                            tirar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  className="know-colar"
                  rows={6}
                  placeholder="…ou cole aqui a resposta da sua IA"
                  value={colado}
                  onChange={(e) => setColado(e.target.value)}
                />
                <div className="know-passo-acoes">
                  <button
                    type="button"
                    className="btn btn-accent"
                    disabled={lendo || (!colado.trim() && !arquivos.length)}
                    onClick={importar}
                  >
                    {lendo ? "Importando…" : "Importar"}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setImportando(false)}>
                    Fechar
                  </button>
                </div>
                {resultado && <div className="know-resultado">{resultado}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="view-toggle" style={{ marginTop: 12 }}>
          {(
            [
              ["pendente", "Para revisar"],
              ["aprovado", "Aprovados"],
              ["descartado", "Descartados"],
            ] as const
          ).map(([v, r]) => (
            <button key={v} type="button" className={"view-toggle-btn" + (aba === v ? " active" : "")} onClick={() => setAba(v)}>
              {r} ({conta(v)})
            </button>
          ))}
        </div>

        <div className="know-filtros">
          <select className="know-tipo" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por tipo">
            <option value="todos">Todos os tipos</option>
            {TIPOS_DE_CONHECIMENTO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.rotulo}
              </option>
            ))}
          </select>
          {aba === "pendente" && daAba.length > 1 && (
            <button type="button" className="btn btn-ghost" onClick={() => board.setKnowledgeStatus(daAba.map((k) => k.id), "aprovado")}>
              <CheckIcon /> Aprovar os {daAba.length}
            </button>
          )}
        </div>

        {aba === "aprovado" && (
          <div className="list-card">
            <div className="quickadd-row">
              <span className="quickadd-plus" aria-hidden="true">
                +
              </span>
              <input
                type="text"
                className="quickadd-input"
                placeholder="+ Escrever algo sobre você (título) e pressionar Enter"
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && escrever()}
              />
            </div>
          </div>
        )}

        {!daAba.length && (
          <div className="list-card">
            <div className="hp-empty">
              {aba === "pendente"
                ? "Nada para revisar. Use o botão acima para trazer o que a sua IA já sabe."
                : aba === "aprovado"
                  ? "Nada aprovado ainda."
                  : "Nada descartado."}
            </div>
          </div>
        )}

        <div className="know-list">
          {daAba.map((k) => (
            <ItemCard key={k.id} item={k} />
          ))}
        </div>
      </div>
    </div>
  );
}
