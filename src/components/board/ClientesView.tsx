"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { ConfirmarComSenha } from "./ConfirmarComSenha";
import { ChevronIcon, DownloadIcon, TrashIcon, UserIcon } from "./icons";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { agruparPorProximidade, diasAteAniversario, rotuloDosDias } from "@/lib/board/aniversarios";
import { todayISO } from "@/lib/date-utils";
import { baixarTexto } from "@/lib/baixar";
import { csvDosClientes, respostasPorPergunta } from "@/lib/cadastro/csv";
import { formulariosDoCliente } from "@/lib/cadastro/links";
import { useCadastro, type ClienteDoSite } from "@/lib/cadastro/use-cadastro";
import { DIAS_DE_AVISO_DO_ANIVERSARIO } from "./AniversariosButton";

const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Dias até o próximo aniversário do cliente, ou null se ele não informou a data. */
function diasDoCliente(c: ClienteDoSite, hoje: string): number | null {
  if (!c.aniversario) return null;
  const [, m, d] = c.aniversario.split("-").map(Number);
  return m && d ? diasAteAniversario({ month: m, day: d }, hoje) : null;
}

function FichaDoCliente({ c, cadastro, grupo }: { c: ClienteDoSite; cadastro: ReturnType<typeof useCadastro>; grupo?: "hoje" | "perto" }) {
  const { board } = useBoardCtx();
  const [aberto, setAberto] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [lancando, setLancando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const respostas = Object.entries(respostasPorPergunta(c, cadastro.links ?? []));
  const formularios = formulariosDoCliente(c.id, c.produtos, cadastro.links ?? []);
  const hoje = todayISO();
  const dias = diasDoCliente(c, hoje);
  const noAniversarios = !!c.birthday_id && board.state.birthdays.some((b) => b.id === c.birthday_id);
  const pendenteNoAniv = noAniversarios && board.state.birthdays.find((b) => b.id === c.birthday_id)?.pending;

  async function lancar() {
    setLancando(true);
    setAviso(null);
    const r = await fetch("/api/cadastro/lancar-aniversario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id }),
    });
    const corpo = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string; jaNaLista?: boolean } | null;
    if (!r.ok || !corpo?.ok) setAviso(corpo?.erro ?? "Não foi possível lançar agora.");
    else {
      setAviso(corpo.jaNaLista ? "Já havia alguém com esse nome em Aniversários, então não mexi." : "Lançado em Aniversários, aguardando a sua confirmação.");
      await Promise.all([board.reload(), cadastro.carregar()]);
    }
    setLancando(false);
  }

  return (
    <div className={"bday-card cli-card" + (grupo ? " " + grupo : "")}>
      <div className="bday-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <ChevronIcon />
        </button>
        <button type="button" className="bday-nome" onClick={() => setAberto((v) => !v)}>
          {c.nome}
        </button>
        {formularios[0] && (
          <span className="cli-formulario" title={formularios.map((f) => `${f.empresa} — ${f.detalhe}`).join("\n")}>
            {formularios[0].empresa}
            {formularios.length > 1 ? ` +${formularios.length - 1}` : ""}
          </span>
        )}
        {c.nao_enviar && <span className="cli-nao-enviar-chip">Não enviar</span>}
        {dias !== null && dias <= DIAS_DE_AVISO_DO_ANIVERSARIO && <span className="bday-quando">{rotuloDosDias(dias)}</span>}
      </div>

      {aberto && (
        <div className="bday-body">
          <dl className="cad-dl">
            <div>
              <dt>Formulário de origem</dt>
              <dd>
                {formularios.length
                  ? formularios.map((f) => (
                      <span key={f.empresa + f.detalhe} className="cli-origem">
                        <strong>{f.empresa}</strong> · {f.detalhe}
                      </span>
                    ))
                  : "—"}
              </dd>
            </div>
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
              <dd>
                {dataBR(c.aniversario) || "—"}
                {c.aniversario && (
                  <>
                    {" · "}
                    {noAniversarios ? (pendenteNoAniv ? "em Aniversários, aguardando confirmação" : "em Aniversários") : "ainda não está em Aniversários"}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Respondeu em</dt>
              <dd>
                {dataBR(c.criado_em)}
                {c.envios > 1 ? ` (enviou ${c.envios} vezes; a última em ${dataBR(c.atualizado_em)})` : ""}
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
                <dd>Marcado desde {dataBR(c.nao_enviar_em)}. Para mudar, abra a pessoa em Aniversários.</dd>
              </div>
            )}
          </dl>

          {c.aniversario && !noAniversarios && (
            <div className="cli-lancar">
              <button type="button" className="btn btn-accent" disabled={lancando} onClick={() => void lancar()}>
                {lancando ? "Lançando…" : "Lançar em Aniversários"}
              </button>
              <span className="fm-dica">Põe a data dela na lista de Aniversários, aguardando a sua confirmação.</span>
            </div>
          )}
          {aviso && <p className="fm-dica">{aviso}</p>}

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
            onClick={() => setApagando(true)}
          >
            <TrashIcon /> Apagar esta pessoa (pedido de exclusão)
          </button>
          {apagando && (
            <ConfirmarComSenha
              titulo={`Apagar ${c.nome} de verdade?`}
              botao="Apagar pessoa"
              onCancelar={() => setApagando(false)}
              onConfirmar={(senha) => cadastro.apagarCliente(c.id, senha)}
            >
              Isso apaga o cadastro, as respostas, o aniversário e o lembrete dessa pessoa. Não volta.
            </ConfirmarComSenha>
          )}
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
  const links = cadastro.links ?? [];
  const hoje = todayISO();
  const q = semAcento(busca.trim());
  const filtrados = q
    ? todos.filter((c) =>
        semAcento(
          `${c.nome} ${c.email} ${c.whatsapp ?? ""} ${(c.produtos ?? []).join(" ")} ${formulariosDoCliente(c.id, c.produtos, links)
            .map((f) => f.empresa)
            .join(" ")}`
        ).includes(q)
      )
    : todos;
  const grupos = agruparPorProximidade(filtrados, (c) => diasDoCliente(c, hoje), (c) => c.nome, DIAS_DE_AVISO_DO_ANIVERSARIO);
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
          onClick={() => baixarTexto("clientes-faro.csv", csvDosClientes(todos, links), "text/csv;charset=utf-8")}
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
            {bloqueados > 0 && `, ${bloqueados} marcada${bloqueados > 1 ? "s" : ""} para não enviar`}, em ordem alfabética. Quem faz aniversário hoje fica no
            alto em verde; nos próximos {DIAS_DE_AVISO_DO_ANIVERSARIO} dias, em amarelo. A marca <strong>Não enviar</strong> fica em Aniversários, em cada pessoa.
          </p>
        </div>

        {cadastro.erro && <div className="mic-error">{cadastro.erro}</div>}

        <div className="list-card">
          <div className="quickadd-row">
            <input
              type="search"
              className="quickadd-input"
              placeholder="Buscar por nome, e-mail, WhatsApp ou formulário"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar cliente"
            />
          </div>
        </div>

        {cadastro.clientes === null && !cadastro.erro && <div className="hp-empty">Carregando…</div>}
        {cadastro.clientes !== null && !filtrados.length && (
          <div className="list-card">
            <div className="hp-empty">{todos.length ? "Ninguém com essa busca." : "Ninguém respondeu ainda. Os links ficam em Cadastros."}</div>
          </div>
        )}

        {grupos.hoje.length > 0 && (
          <section className="bday-grupo hoje">
            <h3 className="bday-grupo-titulo">🎉 Faz aniversário hoje</h3>
            <div className="bday-list">
              {grupos.hoje.map((c) => (
                <FichaDoCliente key={c.id} c={c} cadastro={cadastro} grupo="hoje" />
              ))}
            </div>
          </section>
        )}
        {grupos.perto.length > 0 && (
          <section className="bday-grupo perto">
            <h3 className="bday-grupo-titulo">Faz aniversário nos próximos {DIAS_DE_AVISO_DO_ANIVERSARIO} dias</h3>
            <div className="bday-list">
              {grupos.perto.map((c) => (
                <FichaDoCliente key={c.id} c={c} cadastro={cadastro} grupo="perto" />
              ))}
            </div>
          </section>
        )}
        <div className="bday-list">
          {grupos.resto.map((c) => (
            <FichaDoCliente key={c.id} c={c} cadastro={cadastro} />
          ))}
        </div>
      </div>
    </div>
  );
}
