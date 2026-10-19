"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { BellIcon, CheckIcon, GiftIcon, ChevronIcon, TrashIcon, WhatsAppIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import { ConfirmarComSenha } from "./ConfirmarComSenha";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import {
  CATEGORIAS_DE_ANIVERSARIO,
  agruparPorProximidade,
  MENSAGEM_PADRAO,
  frasesEmUso,
  proximaFrase,
  MESES,
  dataCurta,
  diasAteAniversario,
  idadeQueFara,
  linkDoWhatsApp,
  textoComNome,
  telefoneParaWhatsApp,
  ordenarPorProximos,
  rotuloDosDias,
} from "@/lib/board/aniversarios";
import { todayISO } from "@/lib/date-utils";
import { DIAS_DE_AVISO_DO_ANIVERSARIO } from "./AniversariosButton";
import { useNaoEnviar } from "@/lib/cadastro/use-cadastro";
import type { Birthday, BirthdayPhrase } from "@/lib/types";

type Filtro = "todos" | "aguardando" | Birthday["category"];

function rotuloDaCategoria(c: Birthday["category"]): string {
  return CATEGORIAS_DE_ANIVERSARIO.find((x) => x.id === c)?.rotulo ?? c;
}

function PessoaCard({ pessoa }: { pessoa: Birthday }) {
  const { board } = useBoardCtx();
  // Fechado, como os outros: o vermelho da faixa já diz que precisa de confirmação.
  const [aberto, setAberto] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [nome, setNome] = useState(pessoa.name);
  const frases = frasesEmUso(board.state.settings.birthdayMessages);
  const [mensagem, setMensagem] = useState(pessoa.message);
  const hoje = todayISO();
  const dias = diasAteAniversario(pessoa, hoje);
  const idade = idadeQueFara(pessoa, hoje);
  // Quem está marcado como "não enviar" na tela Clientes não ganha botão de mandar mensagem.
  const naoEnviar = useNaoEnviar();
  const numero = telefoneParaWhatsApp(pessoa.phone);
  const bloqueada = pessoa.noSend || naoEnviar.birthdays.has(pessoa.id) || (!!numero && naoEnviar.numeros.has(numero));
  const zap = bloqueada ? null : linkDoWhatsApp(pessoa, frases);

  return (
    <div className={"bday-card" + (pessoa.pending ? " pendente" : "") + (dias === 0 ? " hoje" : dias <= DIAS_DE_AVISO_DO_ANIVERSARIO ? " perto" : "")}>
      <div className="bday-head">
        <button type="button" className="synapse-card-toggle" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          <ChevronIcon />
        </button>
        <span className="bday-data mono">{dataCurta(pessoa)}</span>
        <button type="button" className="bday-nome" onClick={() => setAberto((v) => !v)}>
          {pessoa.name}
        </button>
        <span className={"bday-cat cat-" + pessoa.category}>{rotuloDaCategoria(pessoa.category)}</span>
        {pessoa.pending && <span className="bday-pendente">Aguardando confirmação</span>}
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
          {pessoa.pending && (
            <div className="bday-confirmar">
              <p>
                <strong>Veio do cadastro pelo site.</strong> Confira o nome e a data, ative a mensagem de aniversário (e o zap, se quiser) e
                aperte <strong>Confirmar cliente</strong>. Só então o lembrete anual das 9h passa a valer.
              </p>
              <button type="button" className="btn btn-accent" onClick={() => board.confirmarCliente(pessoa.id)}>
                <CheckIcon /> Confirmar cliente
              </button>
            </div>
          )}
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

          <div className="prop-list">
            <div className="prop-row">
              <span className="prop-label">Não enviar mensagens</span>
              <div className="prop-value">
                <label className="challenging-toggle">
                  <ToggleSwitch
                    checked={pessoa.noSend}
                    ariaLabel={`Não enviar mensagens para ${pessoa.name}`}
                    onChange={(v) => board.updateBirthday(pessoa.id, v ? { noSend: true, autoMessage: false } : { noSend: false })}
                  />
                  <span className="challenging-hint">
                    {pessoa.noSend
                      ? "Marcado: o FARO não manda nada para esta pessoa (WhatsApp, parabéns, e-mail). Uma resposta nova no site não desmarca."
                      : "Ligue se esta pessoa não deve receber mensagens do FARO."}
                  </span>
                </label>
              </div>
            </div>
            <div className="prop-row">
              <span className="prop-label">Mensagem de aniversário</span>
              <div className="prop-value">
                <label className="challenging-toggle">
                  <ToggleSwitch
                    checked={pessoa.autoMessage}
                    ariaLabel="Mensagem de aniversário"
                    onChange={(v) => {
                      // Ao ligar, entra a frase da vez (a primeira da fila) já com o nome da pessoa; dá para trocar e editar.
                      if (v && mensagem.trim() === "") {
                        const slot = pessoa.messageSlot ?? 0;
                        const pronta = textoComNome(frases[Math.min(slot, frases.length - 1)].texto, pessoa.name);
                        setMensagem(pronta);
                        board.updateBirthday(pessoa.id, { autoMessage: true, message: pronta, messageSlot: Math.min(slot, frases.length - 1) });
                      } else {
                        board.updateBirthday(pessoa.id, { autoMessage: v });
                      }
                    }}
                  />
                  <span className="challenging-hint">
                    {pessoa.autoMessage
                      ? "Ligada. O envio sozinho ainda não está ligado: quando ligarmos, esta pessoa já entra."
                      : "Ligue para escolher uma das frases prontas, já com o nome dela. Você pode editar."}
                  </span>
                </label>
              </div>
            </div>
            {pessoa.autoMessage && (
              <div className="prop-row prop-row-empilhada">
                <span className="prop-label">Escolha a frase para {pessoa.name.split(/\s+/)[0]}</span>
                <div className="prop-value bday-frases-col">
                  <div className="note-options-chips bday-frases" role="group" aria-label="Frases prontas">
                    {frases.map((f, i) => (
                      <button
                        key={i}
                        type="button"
                        className={"note-chip" + (pessoa.messageSlot === i ? " active" : "")}
                        aria-pressed={pessoa.messageSlot === i}
                        title={textoComNome(f.texto, pessoa.name)}
                        onClick={() => {
                          const texto = textoComNome(f.texto, pessoa.name);
                          setMensagem(texto);
                          board.updateBirthday(pessoa.id, { message: texto, messageSlot: i });
                        }}
                      >
                        {i + 1}. {f.titulo || "Frase " + (i + 1)}
                        {pessoa.lastSentSlot === i && pessoa.lastSentYear ? ` ✔ ${pessoa.lastSentYear}` : ""}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="bday-msg"
                    rows={4}
                    value={mensagem}
                    aria-label={`Mensagem para ${pessoa.name}`}
                    placeholder="Escolha uma frase acima ou escreva a sua"
                    onChange={(e) => setMensagem(e.target.value)}
                    onBlur={() => {
                      if (mensagem === pessoa.message) return;
                      // Texto mexido à mão deixa de ser "a frase 2": passa a ser da pessoa e não entra no rodízio.
                      const daFrase = pessoa.messageSlot !== null && textoComNome(frases[pessoa.messageSlot]?.texto ?? "", pessoa.name) === mensagem;
                      board.updateBirthday(pessoa.id, { message: mensagem, messageSlot: daFrase ? pessoa.messageSlot : null });
                    }}
                  />
                  <p className="fm-dica">
                    {pessoa.lastSentYear
                      ? `Última enviada em ${pessoa.lastSentYear}${pessoa.lastSentSlot !== null && frases[pessoa.lastSentSlot] ? ` (“${frases[pessoa.lastSentSlot].titulo}”)` : ""}. `
                      : ""}
                    {pessoa.messageSlot !== null
                      ? `Depois de enviar, a próxima da fila é “${frases[proximaFrase(pessoa.messageSlot, frases.length)]?.titulo ?? ""}”.`
                      : "Texto próprio: não entra no rodízio das frases."}
                  </p>
                </div>
              </div>
            )}
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
              <a
                className="btn btn-ghost"
                href={zap}
                target="_blank"
                rel="noopener noreferrer"
                // A conversa abre com a frase de agora; só depois a pessoa passa para a próxima da fila.
                onClick={() => setTimeout(() => board.marcarParabensEnviado(pessoa.id), 0)}
              >
                <WhatsAppIcon /> Mandar parabéns agora
              </a>
            ) : (
              <span className="challenging-hint bday-acoes-dica">
                {bloqueada
                  ? "Marcada como “não enviar” na tela Clientes: o FARO não manda mensagem para esta pessoa."
                  : "Cadastre o telefone para poder mandar os parabéns pelo WhatsApp."}
              </span>
            )}
            <button type="button" className="btn btn-ghost danger-hover" onClick={() => setApagando(true)}>
              <TrashIcon /> Excluir
            </button>
            {apagando && (
              <ConfirmarComSenha
                titulo={`Excluir ${pessoa.name} da lista?`}
                botao="Excluir"
                onCancelar={() => setApagando(false)}
                onConfirmar={async (senha) => {
                  const r = await fetch("/api/senha/conferir", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ senha }),
                  });
                  if (!r.ok) return { ok: false, erro: r.status === 403 ? "Senha incorreta." : "Não foi possível conferir a senha agora." };
                  board.deleteBirthday(pessoa.id);
                  return { ok: true };
                }}
              >
                O aniversário e o lembrete anual dessa pessoa saem da lista.
              </ConfirmarComSenha>
            )}
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
  const aguardando = todos.filter((b) => b.pending);
  const [busca, setBusca] = useState("");
  const q = busca.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const filtrados = (filtro === "todos" ? todos : filtro === "aguardando" ? aguardando : todos.filter((b) => b.category === filtro)).filter(
    (b) => !q || `${b.name} ${b.phone} ${b.note}`.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().includes(q)
  );
  // Ordem: hoje (verde), próximos dias (amarelo), aguardando confirmação (vermelho) e o resto em ordem alfabética.
  const grupos = agruparPorProximidade(filtrados, (b) => diasAteAniversario(b, hoje), (b) => b.name, DIAS_DE_AVISO_DO_ANIVERSARIO);
  const gruposResto = { pendentes: grupos.resto.filter((b) => b.pending), outros: grupos.resto.filter((b) => !b.pending) };
  const lista = filtrados;
  const frasesAtuais = frasesEmUso(board.state.settings.birthdayMessages);
  const [frasesDraft, setFrasesDraft] = useState<BirthdayPhrase[] | null>(null);
  const frasesTela = frasesDraft ?? frasesAtuais;
  function salvarFrases(lista: BirthdayPhrase[]) {
    board.updateSettings({ birthdayMessages: lista });
    setFrasesDraft(null);
  }
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
            Quem se cadastra pelo site chega aqui <strong>aguardando confirmação</strong>: confira, ligue a mensagem e aperte <strong>Confirmar cliente</strong>. O envio automático ainda está por vir.
          </p>
        </div>

        <details className="fm-card bday-modelo">
          <summary>
            <strong>Frases prontas de aniversário</strong>
            <span className="fm-dica">
              Quatro frases para escolher em cada pessoa, com o nome dela no lugar de {"{nome}"}. Depois que uma é enviada, a pessoa passa para a
              próxima da fila.
            </span>
          </summary>
          {frasesTela.map((f, i) => (
            <div className="bday-frase-edit" key={i}>
              <input
                type="text"
                aria-label={`Nome da frase ${i + 1}`}
                value={f.titulo}
                placeholder={`Frase ${i + 1}`}
                onChange={(e) => setFrasesDraft(frasesTela.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)))}
                onBlur={() => frasesDraft && salvarFrases(frasesDraft)}
              />
              <textarea
                className="fm-textarea"
                rows={3}
                aria-label={`Texto da frase ${i + 1}`}
                value={f.texto}
                onChange={(e) => setFrasesDraft(frasesTela.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))}
                onBlur={() => frasesDraft && salvarFrases(frasesDraft)}
              />
            </div>
          ))}
          <p className="fm-dica">Prévia da primeira: {textoComNome(frasesTela[0]?.texto ?? "", "Maria Souza")}</p>
        </details>

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

        <div className="list-card bday-busca">
          <div className="quickadd-row">
            <input
              type="search"
              className="quickadd-input"
              placeholder="Buscar aniversariante por nome, telefone ou anotação"
              aria-label="Buscar aniversariante"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="bday-filtros">
          {(["todos", ...(aguardando.length ? ["aguardando"] : []), ...CATEGORIAS_DE_ANIVERSARIO.map((c) => c.id)] as Filtro[]).map((f) => (
            <button key={f} type="button" className={"bday-filtro" + (filtro === f ? " ativo" : "")} onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : f === "aguardando" ? "Aguardando" : (CATEGORIAS_DE_ANIVERSARIO.find((c) => c.id === f)?.plural ?? f)}
              <span className="bday-filtro-n">
                {f === "todos" ? todos.length : f === "aguardando" ? aguardando.length : todos.filter((b) => b.category === f).length}
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

        {grupos.hoje.length > 0 && (
          <section className="bday-grupo hoje">
            <h3 className="bday-grupo-titulo">🎉 Faz aniversário hoje</h3>
            <div className="bday-list">
              {grupos.hoje.map((p) => (
                <PessoaCard key={p.id} pessoa={p} />
              ))}
            </div>
          </section>
        )}
        {grupos.perto.length > 0 && (
          <section className="bday-grupo perto">
            <h3 className="bday-grupo-titulo">Faz aniversário nos próximos {DIAS_DE_AVISO_DO_ANIVERSARIO} dias</h3>
            <div className="bday-list">
              {grupos.perto.map((p) => (
                <PessoaCard key={p.id} pessoa={p} />
              ))}
            </div>
          </section>
        )}
        {gruposResto.pendentes.length > 0 && (
          <section className="bday-grupo aguardando">
            <h3 className="bday-grupo-titulo">Aguardando a sua confirmação</h3>
            <div className="bday-list">
              {gruposResto.pendentes.map((p) => (
                <PessoaCard key={p.id} pessoa={p} />
              ))}
            </div>
          </section>
        )}
        <div className="bday-list">
          {gruposResto.outros.map((p) => (
            <PessoaCard key={p.id} pessoa={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
