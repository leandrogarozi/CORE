"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { ChevronIcon, DownloadIcon, LinkIcon, TrashIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { baixarTexto } from "@/lib/baixar";
import { csvDosLinks, respostasPorPergunta, rotuloDoStatus, statusDoLink } from "@/lib/cadastro/csv";
import {
  TIPOS_DE_PERGUNTA,
  codigoDoLink,
  idDaPergunta,
  lerPerguntas,
  urlDoLink,
  type Pergunta,
} from "@/lib/cadastro/links";
import { useCadastro, type DadosDoLink, type LinkDeCadastro } from "@/lib/cadastro/use-cadastro";

const VAZIO: DadosDoLink = { cliente: "", pessoa: "", eyebrow: "", titulo: "", boas_vindas: "", perguntas: [], limit_respostas: 1 };
const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

function BotaoCopiar({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState<"sim" | "nao" | null>(null);
  return (
    <button
      type="button"
      className="btn btn-ghost cad-copiar"
      onClick={async () => {
        setCopiado((await copiar(urlDoLink(codigo))) ? "sim" : "nao");
        setTimeout(() => setCopiado(null), 2500);
      }}
    >
      <LinkIcon /> {copiado === "sim" ? "Link copiado" : copiado === "nao" ? "Selecione o link e copie" : "Copiar link"}
    </button>
  );
}

/** Formulário do link: serve para criar e para editar. */
function EditorDoLink({
  inicial,
  rotuloSalvar,
  mostrarCodigo,
  onSalvar,
  onCancelar,
}: {
  inicial: DadosDoLink;
  rotuloSalvar: string;
  mostrarCodigo?: string;
  onSalvar: (d: DadosDoLink) => Promise<void> | void;
  onCancelar?: () => void;
}) {
  const [d, setD] = useState<DadosDoLink>(inicial);
  const [salvando, setSalvando] = useState(false);
  const campo = <K extends keyof DadosDoLink>(k: K, v: DadosDoLink[K]) => setD((x) => ({ ...x, [k]: v }));
  const podeSalvar = d.cliente.trim() !== "" && d.pessoa.trim() !== "";

  function pergunta(i: number, patch: Partial<Pergunta>) {
    campo("perguntas", d.perguntas.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= d.perguntas.length) return;
    const l = [...d.perguntas];
    [l[i], l[j]] = [l[j], l[i]];
    campo("perguntas", l);
  }

  return (
    <div className="cad-editor">
      <div className="prop-list">
        <label className="prop-row">
          <span className="prop-label">Cliente (empresa)</span>
          <div className="prop-value">
            <input type="text" value={d.cliente} placeholder="Witt" onChange={(e) => campo("cliente", e.target.value)} />
          </div>
        </label>
        <label className="prop-row">
          <span className="prop-label">Pessoa</span>
          <div className="prop-value">
            <input type="text" value={d.pessoa} placeholder="Flaviana" onChange={(e) => campo("pessoa", e.target.value)} />
          </div>
        </label>
        <label className="prop-row">
          <span className="prop-label">Chamada pequena</span>
          <div className="prop-value">
            <input type="text" value={d.eyebrow} placeholder="Devolutiva CIS" onChange={(e) => campo("eyebrow", e.target.value)} />
          </div>
        </label>
        <label className="prop-row">
          <span className="prop-label">Título</span>
          <div className="prop-value">
            <input type="text" value={d.titulo} placeholder="Antes da nossa conversa" onChange={(e) => campo("titulo", e.target.value)} />
          </div>
        </label>
        <label className="prop-row prop-row-empilhada">
          <span className="prop-label">Boas-vindas</span>
          <div className="prop-value">
            <textarea rows={3} value={d.boas_vindas} placeholder="Oi, Flaviana! Preparei algumas perguntas…" onChange={(e) => campo("boas_vindas", e.target.value)} />
          </div>
        </label>
        <label className="prop-row">
          <span className="prop-label">Respostas aceitas</span>
          <div className="prop-value">
            <input
              type="number"
              min={1}
              max={20}
              className="prop-ano"
              value={d.limit_respostas}
              onChange={(e) => campo("limit_respostas", Math.min(20, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
            />
          </div>
        </label>
      </div>

      <span className="edit-field-label cad-sub">Perguntas</span>
      {!d.perguntas.length && <div className="hp-empty">Sem perguntas: a pessoa só deixa nome, e-mail e o que mais a página pedir.</div>}
      {d.perguntas.map((p, i) => (
        <div className="cad-pergunta" key={p.id}>
          <input
            type="text"
            className="cad-pergunta-texto"
            value={p.texto}
            placeholder="Escreva a pergunta"
            aria-label={`Pergunta ${i + 1}`}
            onChange={(e) => pergunta(i, { texto: e.target.value })}
          />
          <select value={p.tipo} aria-label="Tipo de resposta" onChange={(e) => pergunta(i, { tipo: e.target.value })}>
            {TIPOS_DE_PERGUNTA.map((t) => (
              <option key={t.id} value={t.id}>
                {t.rotulo}
              </option>
            ))}
          </select>
          <label className="cad-opcional">
            <ToggleSwitch checked={p.opcional} ariaLabel="Opcional" onChange={(v) => pergunta(i, { opcional: v })} />
            <span>opcional</span>
          </label>
          <span className="cad-pergunta-acoes">
            <button type="button" className="icon-btn" title="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
              ↑
            </button>
            <button type="button" className="icon-btn" title="Descer" disabled={i === d.perguntas.length - 1} onClick={() => mover(i, 1)}>
              ↓
            </button>
            <button
              type="button"
              className="icon-btn danger-hover"
              title="Tirar a pergunta"
              onClick={() => campo("perguntas", d.perguntas.filter((_, j) => j !== i))}
            >
              <TrashIcon />
            </button>
          </span>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() =>
          campo("perguntas", [...d.perguntas, { id: idDaPergunta("pergunta", d.perguntas.map((p) => p.id)), texto: "", tipo: "texto", opcional: false }])
        }
      >
        + Adicionar pergunta
      </button>

      <div className="cad-rodape">
        <span className="cad-link-previa mono">
          {urlDoLink(mostrarCodigo ?? (podeSalvar ? codigoDoLink(d.cliente, d.pessoa) : "cliente-pessoa"))}
        </span>
        <span className="cad-rodape-botoes">
          {onCancelar && (
            <button type="button" className="btn btn-ghost" onClick={onCancelar}>
              Cancelar
            </button>
          )}
          <button
            type="button"
            className="btn btn-accent"
            disabled={!podeSalvar || salvando}
            onClick={async () => {
              setSalvando(true);
              // Pergunta sem texto não vale: tira antes de gravar (o id nunca muda, mesmo se o texto mudar).
              await onSalvar({ ...d, cliente: d.cliente.trim(), pessoa: d.pessoa.trim(), perguntas: d.perguntas.filter((p) => p.texto.trim()).map((p) => ({ ...p, texto: p.texto.trim() })) });
              setSalvando(false);
            }}
          >
            {rotuloSalvar}
          </button>
        </span>
      </div>
    </div>
  );
}

function CartaoDoLink({
  link,
  cadastro,
  inicialmenteAberto,
}: {
  link: LinkDeCadastro;
  cadastro: ReturnType<typeof useCadastro>;
  inicialmenteAberto: boolean;
}) {
  const { askConfirm } = useBoardCtx();
  const [aberto, setAberto] = useState(inicialmenteAberto);
  const status = statusDoLink(link);
  const quem = link.cliente_id ? cadastro.clientes?.find((c) => c.id === link.cliente_id) : undefined;
  const respostas = quem ? Object.entries(respostasPorPergunta(quem, [link])) : [];
  const perguntas = lerPerguntas(link.perguntas);

  return (
    <div className={"bday-card cad-card " + status}>
      <div className="bday-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <ChevronIcon />
        </button>
        <button type="button" className="bday-nome" onClick={() => setAberto((v) => !v)}>
          {link.pessoa || link.codigo} <span className="cad-cliente">· {link.cliente}</span>
        </button>
        <span className={"cad-status " + status}>
          {status === "respondido" ? "Respondeu ✔" : rotuloDoStatus(status)}
          {status === "respondido" && link.respondido_em ? ` ${dataBR(link.respondido_em)}` : ""}
        </span>
        <ToggleSwitch checked={link.ativo} ariaLabel={`Link de ${link.pessoa} ativo`} onChange={(v) => void cadastro.atualizarLink(link.id, { ativo: v })} />
      </div>

      {aberto && (
        <div className="bday-body">
          <div className="cad-link-linha">
            <span className="cad-link-previa mono">{urlDoLink(link.codigo)}</span>
            <BotaoCopiar codigo={link.codigo} />
          </div>
          {!link.ativo && <div className="hp-empty">Desativado: quem abrir o link vê que ele não está disponível.</div>}

          {quem && (
            <div className="cad-respostas">
              <span className="edit-field-label">
                Respostas de {quem.nome} {quem.nao_enviar ? "· marcado para não enviar" : ""}
              </span>
              {respostas.length ? (
                <dl className="cad-dl">
                  {respostas.map(([p, r]) => (
                    <div key={p}>
                      <dt>{p}</dt>
                      <dd>{r || "—"}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="hp-empty">Respondeu, sem respostas escritas nas perguntas.</div>
              )}
            </div>
          )}

          <span className="edit-field-label cad-sub">Editar link</span>
          <EditorDoLink
            inicial={{
              cliente: link.cliente,
              pessoa: link.pessoa,
              eyebrow: link.eyebrow,
              titulo: link.titulo,
              boas_vindas: link.boas_vindas,
              perguntas,
              limit_respostas: link.limit_respostas,
            }}
            rotuloSalvar="Salvar alterações"
            mostrarCodigo={link.codigo}
            onSalvar={async (d) => {
              await cadastro.atualizarLink(link.id, d);
            }}
          />
          <p className="hint-text">
            O endereço do link não muda ao editar os textos. Mudar as perguntas não apaga o que já foi respondido.
            {status === "respondido" && " Este link já recebeu a resposta: para outra pessoa, crie outro link."}
          </p>
          {link.ativo && (
            <button type="button" className="btn btn-ghost" onClick={() => askConfirm(`Desativar o link de ${link.pessoa}?`, () => void cadastro.atualizarLink(link.id, { ativo: false }))}>
              Desativar link
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CadastrosView({ onBack }: { onBack: () => void }) {
  const { wide } = useWideLayout("faro-wide-layout");
  const cadastro = useCadastro();
  const [criando, setCriando] = useState(false);
  const [novoId, setNovoId] = useState<string | null>(null);
  const links = cadastro.links ?? [];
  const respondidos = links.filter((l) => statusDoLink(l) === "respondido").length;

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Cadastros</span>
        <button
          type="button"
          className="icon-btn"
          title="Baixar planilha (CSV) dos links e respostas"
          disabled={!links.length}
          onClick={() => baixarTexto("cadastros-faro.csv", csvDosLinks(links, cadastro.clientes ?? []), "text/csv;charset=utf-8")}
        >
          <DownloadIcon />
        </button>
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <LinkIcon /> Um link para cada pessoa
          </div>
          <p>
            Cada pessoa recebe o seu endereço (cadastro.leandrogarozi.com.br/cliente-pessoa), com as suas perguntas. Depois que ela
            responde, o link fecha: nunca reaproveite um link para outra pessoa.
            {links.length > 0 && ` ${respondidos} de ${links.length} já responderam.`}
          </p>
          {!criando && (
            <button type="button" className="btn btn-accent" onClick={() => setCriando(true)}>
              + Novo link
            </button>
          )}
        </div>

        {cadastro.erro && <div className="mic-error">{cadastro.erro}</div>}

        {criando && (
          <div className="list-card cad-novo">
            <EditorDoLink
              inicial={VAZIO}
              rotuloSalvar="Criar link"
              onCancelar={() => setCriando(false)}
              onSalvar={async (d) => {
                const criado = await cadastro.criarLink(d);
                if (criado) {
                  setNovoId(criado.id);
                  setCriando(false);
                }
              }}
            />
          </div>
        )}

        {cadastro.links === null && !cadastro.erro && <div className="hp-empty">Carregando…</div>}
        {cadastro.links !== null && !links.length && !criando && (
          <div className="list-card">
            <div className="hp-empty">Nenhum link ainda. Crie o primeiro com “Novo link”.</div>
          </div>
        )}
        <div className="bday-list">
          {links.map((l) => (
            <CartaoDoLink key={l.id} link={l} cadastro={cadastro} inicialmenteAberto={l.id === novoId} />
          ))}
        </div>
      </div>
    </div>
  );
}
