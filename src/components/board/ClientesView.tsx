"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { ChevronIcon, DownloadIcon, TrashIcon, UserIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { baixarTexto } from "@/lib/baixar";
import { csvDosClientes, respostasPorPergunta } from "@/lib/cadastro/csv";
import { useCadastro, type ClienteDoSite } from "@/lib/cadastro/use-cadastro";

const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function FichaDoCliente({ c, cadastro }: { c: ClienteDoSite; cadastro: ReturnType<typeof useCadastro> }) {
  const { askConfirm } = useBoardCtx();
  const [aberto, setAberto] = useState(false);
  const respostas = Object.entries(respostasPorPergunta(c, cadastro.links ?? []));

  return (
    <div className={"bday-card cli-card" + (c.nao_enviar ? " nao-enviar" : "")}>
      <div className="bday-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <ChevronIcon />
        </button>
        <button type="button" className="bday-nome" onClick={() => setAberto((v) => !v)}>
          {c.nome}
        </button>
        <span className="cli-selo">Respondeu pelo site ✔</span>
        <label className="cli-nao-enviar" title="Marcado: o FARO não manda nada para esta pessoa (WhatsApp, aniversário, e-mail)">
          <span>Não enviar</span>
          <ToggleSwitch checked={c.nao_enviar} ariaLabel={`Não enviar mensagens para ${c.nome}`} onChange={(v) => void cadastro.marcarNaoEnviar(c, v)} />
        </label>
      </div>

      {aberto && (
        <div className="bday-body">
          <dl className="cad-dl">
            <div>
              <dt>E-mail</dt>
              <dd>{c.email}</dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>{c.whatsapp || "—"}</dd>
            </div>
            <div>
              <dt>Aniversário</dt>
              <dd>{dataBR(c.aniversario) || "—"}</dd>
            </div>
            <div>
              <dt>Páginas e links</dt>
              <dd>{(c.produtos ?? []).join(", ") || c.produto}</dd>
            </div>
            <div>
              <dt>Cadastro</dt>
              <dd>
                {dataBR(c.criado_em)} · última resposta {dataBR(c.atualizado_em)} · {c.envios} {c.envios === 1 ? "envio" : "envios"}
              </dd>
            </div>
            <div>
              <dt>Consentimento</dt>
              <dd>
                {c.consentimento ? "Aceitou" : "Não"} em {dataBR(c.consentimento_em)}
                {c.consentimento_texto ? ` — “${c.consentimento_texto}”` : ""}
              </dd>
            </div>
            {c.nao_enviar && (
              <div>
                <dt>Não enviar</dt>
                <dd>Marcado em {dataBR(c.nao_enviar_em)}. Uma resposta nova não desmarca.</dd>
              </div>
            )}
          </dl>

          <span className="edit-field-label cad-sub">Respostas</span>
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
            <div className="hp-empty">Sem respostas escritas além dos dados de contato.</div>
          )}

          <button
            type="button"
            className="btn btn-ghost cli-apagar"
            onClick={() =>
              askConfirm(`Apagar ${c.nome} de verdade (cadastro, aniversário e lembrete)? Isso não volta.`, () => void cadastro.apagarCliente(c.id), <TrashIcon />)
            }
          >
            <TrashIcon /> Apagar esta pessoa (pedido de exclusão)
          </button>
        </div>
      )}
    </div>
  );
}

export function ClientesView({ onBack }: { onBack: () => void }) {
  const { wide } = useWideLayout("faro-wide-layout");
  const cadastro = useCadastro();
  const [busca, setBusca] = useState("");
  const todos = cadastro.clientes ?? [];
  const q = semAcento(busca.trim());
  const lista = q
    ? todos.filter((c) => semAcento(`${c.nome} ${c.email} ${c.whatsapp ?? ""} ${(c.produtos ?? []).join(" ")}`).includes(q))
    : todos;
  const bloqueados = todos.filter((c) => c.nao_enviar).length;

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Clientes</span>
        <button
          type="button"
          className="icon-btn"
          title="Baixar planilha (CSV) dos clientes"
          disabled={!todos.length}
          onClick={() => baixarTexto("clientes-faro.csv", csvDosClientes(todos, cadastro.links ?? []), "text/csv;charset=utf-8")}
        >
          <DownloadIcon />
        </button>
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <UserIcon size={15} /> Quem respondeu pelo site
          </div>
          <p>
            {todos.length} {todos.length === 1 ? "pessoa" : "pessoas"}
            {bloqueados > 0 && `, ${bloqueados} marcada${bloqueados > 1 ? "s" : ""} para não enviar`}. O interruptor <strong>Não enviar</strong> faz o FARO
            não mandar nada para a pessoa (mensagem, aniversário, e-mail) até você desmarcar; uma resposta nova nunca desmarca sozinha.
          </p>
        </div>

        {cadastro.erro && <div className="mic-error">{cadastro.erro}</div>}

        <div className="list-card">
          <div className="quickadd-row">
            <input
              type="search"
              className="quickadd-input"
              placeholder="Buscar por nome, e-mail, WhatsApp ou link"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar cliente"
            />
          </div>
        </div>

        {cadastro.clientes === null && !cadastro.erro && <div className="hp-empty">Carregando…</div>}
        {cadastro.clientes !== null && !lista.length && (
          <div className="list-card">
            <div className="hp-empty">{todos.length ? "Ninguém com essa busca." : "Ninguém respondeu ainda. Os links ficam em Cadastros."}</div>
          </div>
        )}
        <div className="bday-list">
          {lista.map((c) => (
            <FichaDoCliente key={c.id} c={c} cadastro={cadastro} />
          ))}
        </div>
      </div>
    </div>
  );
}
