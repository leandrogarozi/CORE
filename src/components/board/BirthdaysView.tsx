"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { BellIcon, GiftIcon, ChevronIcon, TrashIcon, WhatsAppIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import {
  CATEGORIAS_DE_ANIVERSARIO,
  MENSAGEM_PADRAO,
  MESES,
  dataCurta,
  diasAteAniversario,
  idadeQueFara,
  linkDoWhatsApp,
  ordenarPorProximos,
  rotuloDosDias,
} from "@/lib/board/aniversarios";
import { todayISO } from "@/lib/date-utils";
import { DIAS_DE_AVISO_DO_ANIVERSARIO } from "./AniversariosButton";
import type { Birthday } from "@/lib/types";

type Filtro = "todos" | Birthday["category"];

function rotuloDaCategoria(c: Birthday["category"]): string {
  return CATEGORIAS_DE_ANIVERSARIO.find((x) => x.id === c)?.rotulo ?? c;
}

function PessoaCard({ pessoa }: { pessoa: Birthday }) {
  const { board, askConfirm } = useBoardCtx();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(pessoa.name);
  const hoje = todayISO();
  const dias = diasAteAniversario(pessoa, hoje);
  const idade = idadeQueFara(pessoa, hoje);
  const zap = linkDoWhatsApp(pessoa);

  return (
    <div className={"bday-card" + (dias === 0 ? " hoje" : dias <= DIAS_DE_AVISO_DO_ANIVERSARIO ? " perto" : "")}>
      <div className="bday-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <ChevronIcon />
        </button>
        <span className="bday-data mono">{dataCurta(pessoa)}</span>
        <button type="button" className="bday-nome" onClick={() => setAberto((v) => !v)}>
          {pessoa.name}
        </button>
        <span className={"bday-cat cat-" + pessoa.category}>{rotuloDaCategoria(pessoa.category)}</span>
        <span className="bday-quando">
          {rotuloDosDias(dias)}
          {idade !== null ? ` · ${idade} anos` : ""}
        </span>
        {/* Sininho: lembrar de mandar a mensagem pessoal (lembrete anual às 9h). */}
        <button
          type="button"
          className={"icon-btn zap-btn" + (pessoa.remind ? " active" : "")}
          title={pessoa.remind ? "Vai lembrar de mandar a mensagem. Clique pra desligar." : "Lembrar de mandar a mensagem"}
          onClick={() =>
            board.updateBirthday(pessoa.id, pessoa.remind ? { remind: false, remindWhatsapp: false } : { remind: true })
          }
        >
          <BellIcon filled={pessoa.remind} />
        </button>
        {/* Zap: o mesmo lembrete, também no WhatsApp do Leandro (10 min antes das 9h). */}
        <button
          type="button"
          className={"icon-btn zap-btn" + (pessoa.remindWhatsapp ? " active" : "")}
          title={
            pessoa.remindWhatsapp
              ? "Vai te lembrar no seu WhatsApp. Clique pra desligar."
              : "Me lembrar também no meu WhatsApp"
          }
          onClick={() =>
            board.updateBirthday(pessoa.id, pessoa.remindWhatsapp ? { remindWhatsapp: false } : { remind: true, remindWhatsapp: true })
          }
        >
          <WhatsAppIcon filled={pessoa.remindWhatsapp} />
        </button>
      </div>

      {aberto && (
        <div className="bday-body">
          <div className="prop-list">
            <label className="prop-row">
              <span className="prop-label">Nome</span>
              <div className="prop-value">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onBlur={() => (nome.trim() ? board.updateBirthday(pessoa.id, { name: nome.trim() }) : setNome(pessoa.name))}
                />
              </div>
            </label>
            <div className="prop-row">
              <span className="prop-label">Dia e mês</span>
              <div className="prop-value prop-multi">
                <input
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={pessoa.day}
                  aria-label="Dia"
                  onBlur={(e) => {
                    const v = Math.round(Number(e.target.value));
                    if (v >= 1 && v <= 31) board.updateBirthday(pessoa.id, { day: v });
                    else e.target.value = String(pessoa.day);
                  }}
                />
                <select
                  value={pessoa.month}
                  aria-label="Mês"
                  onChange={(e) => board.updateBirthday(pessoa.id, { month: Number(e.target.value) })}
                >
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  className="prop-ano"
                  placeholder="ano"
                  defaultValue={pessoa.year ?? ""}
                  aria-label="Ano de nascimento"
                  onBlur={(e) => {
                    const v = Math.round(Number(e.target.value));
                    board.updateBirthday(pessoa.id, { year: e.target.value.trim() === "" ? null : v >= 1900 && v <= 2100 ? v : pessoa.year });
                  }}
                />
              </div>
            </div>
            <label className="prop-row">
              <span className="prop-label">Quem é</span>
              <div className="prop-value">
                <select
                  value={pessoa.category}
                  onChange={(e) => board.updateBirthday(pessoa.id, { category: e.target.value as Birthday["category"] })}
                >
                  {CATEGORIAS_DE_ANIVERSARIO.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="prop-row">
              <span className="prop-label">Telefone</span>
              <div className="prop-value">
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="(27) 99999-9999"
                  defaultValue={pessoa.phone}
                  onBlur={(e) => board.updateBirthday(pessoa.id, { phone: e.target.value.trim() })}
                />
              </div>
            </label>
          </div>

          <label className="prop-row prop-row-empilhada">
            <span className="prop-label">Mensagem (use {"{nome}"} para o primeiro nome)</span>
            <div className="prop-value">
              <textarea
                className="bday-msg"
                rows={3}
                placeholder={MENSAGEM_PADRAO}
                defaultValue={pessoa.message}
                onBlur={(e) => board.updateBirthday(pessoa.id, { message: e.target.value })}
              />
            </div>
          </label>

          <div className="prop-list">
            <div className="prop-row">
              <span className="prop-label">Mensagem automática</span>
              <div className="prop-value">
                <label className="challenging-toggle">
                  <ToggleSwitch
                    checked={pessoa.autoMessage}
                    ariaLabel="Mensagem automática"
                    onChange={(v) => board.updateBirthday(pessoa.id, { autoMessage: v })}
                  />
                  <span className="challenging-hint">
                    {pessoa.autoMessage
                      ? "Marcado. O envio sozinho ainda não está ligado: quando ligarmos, esta pessoa já entra."
                      : "Quando o envio automático existir, manda no dia sem você precisar."}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <label className="prop-row prop-row-empilhada">
            <span className="prop-label">Anotação</span>
            <div className="prop-value">
              <textarea
                className="bday-msg"
                rows={2}
                placeholder="Gostos, assunto da última conversa…"
                defaultValue={pessoa.note}
                onBlur={(e) => board.updateBirthday(pessoa.id, { note: e.target.value })}
              />
            </div>
          </label>

          <div className="edit-actions edit-actions-split bday-acoes">
            {zap ? (
              <a className="btn btn-ghost" href={zap} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> Mandar parabéns agora
              </a>
            ) : (
              <span className="challenging-hint bday-acoes-dica">Cadastre o telefone para poder mandar os parabéns pelo WhatsApp.</span>
            )}
            <button
              type="button"
              className="btn btn-ghost danger-hover"
              onClick={() => askConfirm(`Excluir "${pessoa.name}" da lista de aniversários?`, () => board.deleteBirthday(pessoa.id))}
            >
              <TrashIcon /> Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BirthdaysView({ onBack }: { onBack: () => void }) {
  const { board } = useBoardCtx();
  const { wide } = useWideLayout("faro-wide-layout");
  const [nome, setNome] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState("");
  const [categoria, setCategoria] = useState<Birthday["category"]>("amigo");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const hoje = todayISO();
  const todos = board.state.birthdays;
  const lista = ordenarPorProximos(
    filtro === "todos" ? todos : todos.filter((b) => b.category === filtro),
    hoje
  );
  const diaNum = Math.round(Number(dia));
  const anoNum = ano.trim() === "" ? null : Math.round(Number(ano));
  const podeAdicionar =
    nome.trim() !== "" && diaNum >= 1 && diaNum <= 31 && (anoNum === null || (anoNum >= 1900 && anoNum <= 2100));

  async function adicionar() {
    if (!podeAdicionar) return;
    const id = await board.addBirthday({ name: nome, month: Number(mes), day: diaNum, year: anoNum, category: categoria });
    if (id) {
      setNome("");
      setDia("");
      setAno("");
    }
  }

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Aniversários</span>
        <span style={{ width: 32 }} />
      </div>

      <div className={"narrow-list" + (wide ? " list-xl" : "")}>
        <div className="synapse-intro">
          <div className="synapse-intro-title">
            <GiftIcon /> Quem faz aniversário
          </div>
          <p>
            Amigos, familiares e clientes, com a data de cada um. O <strong>sininho</strong> te lembra às 9h do dia de
            mandar uma mensagem mais pessoal. O <strong>zap</strong> faz o mesmo lembrete chegar no seu WhatsApp. Dentro de cada pessoa, o botão <strong>Mandar parabéns agora</strong> abre a conversa com ela já com a mensagem pronta.
            O envio automático e o cadastro pela internet (a pessoa mesma preencher) ainda estão por vir.
          </p>
        </div>

        <div className="list-card">
          <div className="bday-form">
            <input
              type="text"
              className="quickadd-input"
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
            />
            <input
              type="number"
              min={1}
              max={31}
              className="bday-num"
              placeholder="dia"
              aria-label="Dia"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
            />
            <select className="budget-input" value={mes} aria-label="Mês" onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="bday-ano"
              placeholder="ano (opcional)"
              aria-label="Ano de nascimento (opcional)"
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
            />
            <select
              className="budget-input"
              value={categoria}
              aria-label="Categoria"
              onChange={(e) => setCategoria(e.target.value as Birthday["category"])}
            >
              {CATEGORIAS_DE_ANIVERSARIO.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-accent" disabled={!podeAdicionar} onClick={adicionar}>
              Adicionar
            </button>
          </div>
        </div>

        <div className="bday-filtros">
          {(["todos", ...CATEGORIAS_DE_ANIVERSARIO.map((c) => c.id)] as Filtro[]).map((f) => (
            <button key={f} type="button" className={"bday-filtro" + (filtro === f ? " ativo" : "")} onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : (CATEGORIAS_DE_ANIVERSARIO.find((c) => c.id === f)?.plural ?? f)}
              <span className="bday-filtro-n">
                {f === "todos" ? todos.length : todos.filter((b) => b.category === f).length}
              </span>
            </button>
          ))}
        </div>

        {!lista.length && (
          <div className="list-card">
            <div className="hp-empty">
              {todos.length ? "Ninguém nessa categoria ainda." : "Nenhum aniversário ainda. Comece por quem você mais quer lembrar."}
            </div>
          </div>
        )}

        <div className="bday-list">
          {lista.map((p) => (
            <PessoaCard key={p.id} pessoa={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
