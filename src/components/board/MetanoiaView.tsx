"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { ToggleSwitch } from "./ToggleSwitch";
import { TimePicker } from "./TimePicker";
import { CheckIcon, EditIcon, EyeOffIcon, HeartIcon } from "./icons";
import { MicButton } from "./MicButton";
import { ImportarFrases } from "./ImportarFrases";
import { todayISO } from "@/lib/date-utils";
import { CORES_DO_CARTAO, creditoDaFrase, fraseDaVez, fraseEmDestaque, horariosDePerguntasEmUso, horariosEmUso, MAX_FRASES_POR_DIA, MAX_PERGUNTAS_POR_DIA, vezesPorDia } from "@/lib/metanoia";
import { useTemaDoCartao } from "./use-tema-metanoia";
import type { MetanoiaFrase, MetanoiaOrigem, MetanoiaTipo } from "@/lib/types";
import { TutorialLink } from "./TutorialLink";

type Aba = "aprovadas" | "favoritas" | "revisar" | "naolistadas";

const ROTULO_DA_ORIGEM: Record<MetanoiaOrigem, string> = {
  minha: "Minha",
  faro: "Do meu FARO",
  print: "De print",
  ia: "Da minha IA",
};

/** Quantas por dia: atalhos para 0 a 3 e um campo para escolher qualquer número até o máximo. */
function QuantasVezes({ valor, max, rotulo, onChange }: { valor: number; max: number; rotulo: string; onChange: (n: number) => void }) {
  const escolher = (n: number) => onChange(Math.min(max, Math.max(0, Math.round(Number.isFinite(n) ? n : 0))));
  return (
    <>
      <div className="meta-vezes" role="group" aria-label={`Quantas ${rotulo} por dia`}>
        {[0, 1, 2, 3].map((n) => (
          <button key={n} type="button" className={"meeting-modo-btn" + (valor === n ? " ativo" : "")} onClick={() => escolher(n)}>
            {n === 0 ? "Desligado" : n === 1 ? "1 por dia" : `${n} por dia`}
          </button>
        ))}
      </div>
      <label className="meta-quantas">
        <span>Ou escolha outra quantidade (0 a {max}):</span>
        <input type="number" inputMode="numeric" min={0} max={max} value={valor} aria-label={`Quantas ${rotulo} por dia, de 0 a ${max}`} onChange={(e) => escolher(Number(e.target.value))} />
        <span>por dia</span>
      </label>
    </>
  );
}

/** "A partir das __ até as __" e onde cada mensagem cai, espalhadas por igual entre os dois horários. */
const TEXTO_NAO_LISTAR = "Não mostrar mais essa frase. Ela vai para a aba Não listadas, de onde dá para voltar depois.";

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Janela({ inicio, fim, horarios, onInicio, onFim }: { inicio: string; fim: string; horarios: string[]; onInicio: (v: string) => void; onFim: (v: string) => void }) {
  return (
    <>
      <div className="meta-janela">
        <span>A partir das</span>
        <TimePicker value={inicio} onChange={onInicio} />
        {horarios.length > 1 && (
          <>
            <span>até as</span>
            <TimePicker value={fim} onChange={onFim} />
          </>
        )}
      </div>
      <span className="hint-text">Chega às {horarios.join(" · ")}.</span>
    </>
  );
}

/** Editor de uma frase: texto, autor e de onde saiu. Excluir de vez só existe aqui, com a frase aberta. */
function EditorDaFrase({ frase, onFechar }: { frase: MetanoiaFrase; onFechar: () => void }) {
  const { board, askConfirm } = useBoardCtx();
  const [texto, setTexto] = useState(frase.texto);
  const [autor, setAutor] = useState(frase.autor ?? "");
  const [fonte, setFonte] = useState(frase.fonte ?? "");

  function salvar() {
    const t = texto.trim();
    if (!t) return;
    board.updateMetanoiaFrase(frase.id, { texto: t, autor: autor.trim() || null, fonte: fonte.trim() || null });
    onFechar();
  }

  return (
    <div className="meta-frase editando">
      <textarea value={texto} rows={3} aria-label={frase.tipo === "pergunta" ? "Texto da pergunta" : "Texto da frase"} onChange={(e) => setTexto(e.target.value)} />
      {frase.tipo === "frase" && <input type="text" value={autor} placeholder="Autor (em branco = desconhecido)" aria-label="Autor" onChange={(e) => setAutor(e.target.value)} />}
      <input type="text" value={fonte} placeholder="De onde saiu (só para você)" aria-label="De onde saiu" onChange={(e) => setFonte(e.target.value)} />
      <div className="edit-actions">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() =>
            askConfirm(
              frase.tipo === "pergunta" ? "Excluir essa pergunta de vez? Não dá para desfazer." : "Excluir essa frase de vez? Não dá para desfazer.",
              () => board.deleteMetanoiaFrase(frase.id)
            )
          }
        >
          Excluir
        </button>
        <button type="button" className="btn btn-ghost" onClick={onFechar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-accent" disabled={!texto.trim()} onClick={salvar}>
          Salvar
        </button>
      </div>
    </div>
  );
}

function Cartao({ frase, aprovando, naoListada }: { frase: MetanoiaFrase; aprovando: boolean; naoListada: boolean }) {
  const { board } = useBoardCtx();
  const [editando, setEditando] = useState(false);

  if (editando) return <EditorDaFrase frase={frase} onFechar={() => setEditando(false)} />;

  const credito = creditoDaFrase(frase);
  return (
    <div className="meta-frase">
      <div className="meta-frase-corpo">
        <p className="meta-frase-texto">{frase.tipo === "pergunta" ? frase.texto : <>&ldquo;{frase.texto}&rdquo;</>}</p>
        <div className="meta-frase-meta">
          {credito && <span>{credito}</span>}
          <span className="meta-origem">{ROTULO_DA_ORIGEM[frase.origem]}</span>
        </div>
      </div>
      <div className="meta-frase-acoes">
        {naoListada && (
          <button type="button" className="btn btn-ghost" onClick={() => board.updateMetanoiaFrase(frase.id, { status: "aprovada" })}>
            Voltar a listar
          </button>
        )}
        {aprovando && (
          <>
            <button type="button" className="btn btn-ghost know-aprovar" onClick={() => board.updateMetanoiaFrase(frase.id, { status: "aprovada" })}>
              <CheckIcon /> Aprovar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => board.updateMetanoiaFrase(frase.id, { status: "arquivada" })}>
              Recusar
            </button>
          </>
        )}
        <button
          type="button"
          className={"icon-btn" + (frase.favorita ? " active" : "")}
          aria-pressed={frase.favorita}
          title={frase.favorita ? "Tirar dos favoritos" : "Favoritar (aparece mais vezes)"}
          onClick={() => board.updateMetanoiaFrase(frase.id, { favorita: !frase.favorita })}
        >
          <HeartIcon filled={frase.favorita} />
        </button>
        <button type="button" className="icon-btn" title="Editar" aria-label="Editar frase" onClick={() => setEditando(true)}>
          <EditIcon />
        </button>
        {!naoListada && !aprovando && (
          <button
            type="button"
            className="icon-btn"
            title={TEXTO_NAO_LISTAR}
            aria-label={TEXTO_NAO_LISTAR}
            onClick={() => board.updateMetanoiaFrase(frase.id, { status: "arquivada" })}
          >
            <EyeOffIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export function MetanoiaView({ onBack, alvo }: { onBack: () => void; alvo?: { id: string; editar: boolean } | null }) {
  const { board, askConfirm } = useBoardCtx();
  const s = board.state.settings;
  const todas = board.state.metanoiaFrases;
  // Abre na mesma frase que está em destaque na tela inicial (e na aba do tipo dela).
  const destaqueDaHome = fraseEmDestaque(todas, s, todayISO(), new Date());
  // Vindo do cartão da tela inicial: abre na frase que estava lá (e, pelo lápis, já editando).
  const frasePedida = alvo ? todas.find((f) => f.id === alvo.id && f.status === "aprovada") : undefined;
  const [tipo, setTipo] = useState<MetanoiaTipo>(frasePedida?.tipo ?? destaqueDaHome?.tipo ?? "frase");
  const [editandoHoje, setEditandoHoje] = useState(!!frasePedida && !!alvo?.editar);
  const temaDoCartao = useTemaDoCartao(s.metanoiaTema, s.metanoiaCor);
  const [abrirCores, setAbrirCores] = useState(false);
  const [busca, setBusca] = useState("");
  const ehPergunta = tipo === "pergunta";
  const frases = todas.filter((f) => f.tipo === tipo);
  const aprovadas = frases.filter((f) => f.status === "aprovada");
  const pendentes = frases.filter((f) => f.status === "pendente");
  const naoListadas = frases.filter((f) => f.status === "arquivada");
  const pendentesDoOutro = todas.filter((f) => f.tipo !== tipo && f.status === "pendente").length;
  const [aba, setAba] = useState<Aba>("aprovadas");
  const [origem, setOrigem] = useState<"todas" | MetanoiaOrigem>("todas");
  const [novo, setNovo] = useState("");
  const [novoAutor, setNovoAutor] = useState("");
  const [outra, setOutra] = useState<MetanoiaFrase | null>(frasePedida ?? null);

  const hoje = todayISO();
  const daVez = destaqueDaHome?.tipo === tipo ? destaqueDaHome : fraseDaVez(frases, hoje, 0, tipo, vezesPorDia(s, tipo));
  const emDestaque = outra && aprovadas.some((f) => f.id === outra.id) ? aprovadas.find((f) => f.id === outra.id)! : daVez;
  const horarios = horariosEmUso(s.metanoiaVezes, s.metanoiaInicio, s.metanoiaFim);
  const horariosDasPerguntas = horariosDePerguntasEmUso(s.metanoiaPerguntasVezes, s.metanoiaPerguntasInicio, s.metanoiaPerguntasFim);

  function sortearOutra() {
    // A próxima da lista depois da que está na tela (volta ao começo no fim).
    const i = aprovadas.findIndex((f) => f.id === emDestaque?.id);
    if (aprovadas.length > 1) setOutra(aprovadas[(i + 1) % aprovadas.length]);
  }

  function adicionar() {
    if (!novo.trim()) return;
    const id = board.addMetanoiaFrase({ texto: novo, autor: ehPergunta ? null : novoAutor, origem: "minha", tipo });
    if (id) {
      setNovo("");
      setNovoAutor("");
    }
  }

  const base = aba === "revisar" ? pendentes : aba === "naolistadas" ? naoListadas : aba === "favoritas" ? aprovadas.filter((f) => f.favorita) : aprovadas;
  const termo = semAcento(busca.trim());
  const lista = base
    .filter((f) => origem === "todas" || f.origem === origem)
    .filter((f) => !termo || semAcento(`${f.texto} ${f.autor ?? ""} ${f.fonte ?? ""}`).includes(termo));

  return (
    <div className="section">
      <div className="dash-nav">
        <button className="strip-nav" type="button" aria-label="Voltar" onClick={onBack}>
          ‹
        </button>
        <span className="dash-range-label">Metanoia</span>
        <TutorialLink secao="metanoia" />
      </div>

      <div className="narrow-list">
        <p className="hint-text">Metanoia é a mudança de mente. Aqui voltam até você o que você aprendeu e no que acredita, em frases curtas e perguntas poderosas, durante o dia.</p>

        <div className="view-toggle" role="group" aria-label="O que ver">
          {(
            [
              ["frase", "Frases"],
              ["pergunta", "Perguntas"],
            ] as const
          ).map(([v, rotulo]) => (
            <button key={v} type="button" className={"view-toggle-btn" + (tipo === v ? " active" : "")} onClick={() => { setTipo(v); setAba("aprovadas"); setOutra(null); }}>
              {rotulo}
              {todas.some((f) => f.tipo === v && f.status === "pendente") ? " •" : ""}
            </button>
          ))}
        </div>

        <div className={"meta-hoje " + (editandoHoje ? "" : temaDoCartao)} style={s.metanoiaCor && !editandoHoje ? { background: s.metanoiaCor } : undefined}>
          <div className="meta-hoje-rotulo">Hoje</div>
          {emDestaque && editandoHoje ? (
            <EditorDaFrase key={emDestaque.id} frase={emDestaque} onFechar={() => setEditandoHoje(false)} />
          ) : emDestaque ? (
            <>
              <p className="meta-hoje-texto">{ehPergunta ? emDestaque.texto : <>&ldquo;{emDestaque.texto}&rdquo;</>}</p>
              {creditoDaFrase(emDestaque) && <div className="meta-hoje-credito">{creditoDaFrase(emDestaque)}</div>}
              <div className="meta-hoje-acoes">
                <button
                  type="button"
                  className={"btn btn-ghost" + (emDestaque.favorita ? " coracao-ativo" : "")}
                  onClick={() => {
                    // Favoritar muda a fila; a frase na tela fica onde está.
                    setOutra(emDestaque);
                    board.updateMetanoiaFrase(emDestaque.id, { favorita: !emDestaque.favorita });
                  }}
                >
                  <HeartIcon filled={emDestaque.favorita} /> {emDestaque.favorita ? "Favorita" : "Favoritar"}
                </button>
                <button type="button" className="btn btn-ghost" disabled={aprovadas.length < 2} onClick={sortearOutra}>
                  Outra
                </button>
                <button type="button" className="icon-btn" title="Editar" aria-label="Editar frase" onClick={() => setEditandoHoje(true)}>
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title={TEXTO_NAO_LISTAR}
                  aria-label={TEXTO_NAO_LISTAR}
                  onClick={() => {
                    setOutra(null);
                    board.updateMetanoiaFrase(emDestaque.id, { status: "arquivada" });
                  }}
                >
                  <EyeOffIcon />
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(emDestaque.texto + (emDestaque.autor ? ` — ${emDestaque.autor}` : ""))}>
                  Copiar
                </button>
              </div>
            </>
          ) : (
            <p className="hint-text">
              {ehPergunta ? "Nenhuma pergunta aprovada ainda." : "Nenhuma frase aprovada ainda."} Escreva a primeira abaixo
              {pendentes.length ? " ou aprove as que o FARO sugeriu em “Para revisar”" : pendentesDoOutro ? ` (há ${pendentesDoOutro} ${ehPergunta ? "frases" : "perguntas"} para revisar na outra aba)` : ""}.
            </p>
          )}
        </div>

        <div className="diet-page-card">
          <span className="diet-card-titulo">{ehPergunta ? "Quando o FARO me pergunta" : "Quando o FARO me lembra"}</span>
          {ehPergunta ? (
            <>
              <QuantasVezes valor={s.metanoiaPerguntasVezes} max={MAX_PERGUNTAS_POR_DIA} rotulo="perguntas" onChange={(n) => board.updateSettings({ metanoiaPerguntasVezes: n })} />
              {horariosDasPerguntas.length > 0 && (
                <Janela
                  inicio={s.metanoiaPerguntasInicio}
                  fim={s.metanoiaPerguntasFim}
                  horarios={horariosDasPerguntas}
                  onInicio={(v) => board.updateSettings({ metanoiaPerguntasInicio: v })}
                  onFim={(v) => board.updateSettings({ metanoiaPerguntasFim: v })}
                />
              )}
            </>
          ) : (
            <>
              <QuantasVezes valor={s.metanoiaVezes} max={MAX_FRASES_POR_DIA} rotulo="frases" onChange={(n) => board.updateSettings({ metanoiaVezes: n })} />
              {horarios.length > 0 && (
                <Janela
                  inicio={s.metanoiaInicio}
                  fim={s.metanoiaFim}
                  horarios={horarios}
                  onInicio={(v) => board.updateSettings({ metanoiaInicio: v })}
                  onFim={(v) => board.updateSettings({ metanoiaFim: v })}
                />
              )}
            </>
          )}
          <label className="diet-channel-option" style={{ marginTop: 10 }}>
            <ToggleSwitch checked={s.metanoiaPush} ariaLabel="Avisar por notificação" onChange={(v) => board.updateSettings({ metanoiaPush: v })} />
            Por notificação no celular
          </label>
          <span className="hint-text">A notificação precisa estar ligada em Configurações. Por WhatsApp ainda não, para não gastar crédito.</span>
          <div className="meta-aparencia">
            <span className="hint-text">Aparência do cartão na tela inicial e ao abrir pela notificação</span>
            <div className="meta-vezes" role="group" aria-label="Aparência">
              {(["claro", "escuro", "auto"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={"meeting-modo-btn" + (!s.metanoiaCor && s.metanoiaTema === t ? " ativo" : "")}
                  onClick={() => board.updateSettings({ metanoiaTema: t, metanoiaCor: null })}
                >
                  {t === "claro" ? "Fundo branco" : t === "escuro" ? "Fundo preto" : "Automático"}
                </button>
              ))}
              <button
                type="button"
                className={"meeting-modo-btn" + (s.metanoiaCor ? " ativo" : "")}
                aria-expanded={abrirCores}
                onClick={() => setAbrirCores((v) => !v)}
              >
                Cor
                {s.metanoiaCor && <span className="meta-cor-ponto" style={{ background: s.metanoiaCor }} aria-hidden="true" />}
              </button>
            </div>
            {abrirCores && (
              <div className="meta-cores" role="group" aria-label="Escolher a cor de fundo">
                {CORES_DO_CARTAO.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={"meta-cor" + (s.metanoiaCor === c.hex ? " ativa" : "")}
                    style={{ background: c.hex }}
                    title={c.nome}
                    aria-label={c.nome}
                    aria-pressed={s.metanoiaCor === c.hex}
                    onClick={() => board.updateSettings({ metanoiaCor: c.hex })}
                  />
                ))}
                <label className="meta-cor-livre" title="Escolher outra cor">
                  <input type="color" aria-label="Outra cor" value={s.metanoiaCor ?? "#1d4ed8"} onChange={(e) => board.updateSettings({ metanoiaCor: e.target.value })} />
                  Outra cor
                </label>
                {s.metanoiaCor && (
                  <button type="button" className="btn btn-ghost" onClick={() => board.updateSettings({ metanoiaCor: null })}>
                    Tirar a cor
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="list-card">
          <div className="meta-novo">
            <textarea
              value={novo}
              rows={2}
              placeholder={ehPergunta ? "Escrever uma pergunta" : "Escrever uma frase"}
              aria-label={ehPergunta ? "Nova pergunta" : "Nova frase"}
              onChange={(e) => setNovo(e.target.value)}
            />
            <div className="meta-novo-linha">
              {!ehPergunta && <input type="text" value={novoAutor} placeholder="Autor (opcional)" aria-label="Autor da frase" onChange={(e) => setNovoAutor(e.target.value)} />}
              <MicButton onText={(t) => setNovo((v) => (v ? `${v} ${t}` : t))} ariaLabel={ehPergunta ? "Ditar a pergunta" : "Ditar a frase"} />
              <button type="button" className="btn btn-accent" disabled={!novo.trim()} onClick={adicionar}>
                Adicionar
              </button>
            </div>
          </div>
        </div>

        <ImportarFrases tipo={tipo} />

        <input
          type="search"
          className="meta-busca"
          value={busca}
          placeholder={ehPergunta ? "Buscar uma pergunta" : "Buscar uma frase"}
          aria-label="Buscar"
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="meta-abas">
          <div className="view-toggle">
            {(
              [
                ["aprovadas", `Aprovadas ${aprovadas.length}`],
                ["favoritas", `Favoritas ${aprovadas.filter((f) => f.favorita).length}`],
                ["revisar", `Para revisar ${pendentes.length}`],
                ["naolistadas", `Não listadas ${naoListadas.length}`],
              ] as const
            ).map(([v, rotulo]) => (
              <button key={v} type="button" className={"view-toggle-btn" + (aba === v ? " active" : "")} onClick={() => setAba(v)}>
                {rotulo}
              </button>
            ))}
          </div>
          <select value={origem} aria-label="Origem" onChange={(e) => setOrigem(e.target.value as typeof origem)}>
            <option value="todas">Todas as origens</option>
            {(Object.keys(ROTULO_DA_ORIGEM) as MetanoiaOrigem[]).map((o) => (
              <option key={o} value={o}>
                {ROTULO_DA_ORIGEM[o]}
              </option>
            ))}
          </select>
          {aba === "revisar" && lista.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                askConfirm(
                  `Aprovar as ${lista.length} ${ehPergunta ? "perguntas" : "frases"} mostradas? Dá para tirar uma por uma depois.`,
                  () => lista.forEach((f) => board.updateMetanoiaFrase(f.id, { status: "aprovada" })),
                  undefined,
                  { titulo: "Aprovar todas", botao: "Aprovar todas", perigo: false }
                )
              }
            >
              Aprovar todas ({lista.length})
            </button>
          )}
        </div>

        {lista.length === 0 ? (
          <div className="list-card">
            <div className="hp-empty">
              {busca.trim()
                ? "Nada encontrado nesta aba com essa busca."
                : aba === "naolistadas"
                  ? "Nada aqui. O que você marcar como “Não listar” fica guardado nesta aba, sem aparecer nas notificações."
                  : aba === "revisar"
                ? `Nada para revisar agora. Quando o FARO tiver ${ehPergunta ? "perguntas" : "frases"} novas, elas aparecem aqui.`
                : aba === "favoritas"
                  ? "Nenhuma favorita ainda."
                  : ehPergunta
                    ? "Nenhuma pergunta ainda."
                    : "Nenhuma frase ainda."}
            </div>
          </div>
        ) : (
          <div className="meta-lista">
            {lista.map((f) => (
              <Cartao key={f.id} frase={f} aprovando={aba === "revisar"} naoListada={aba === "naolistadas"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
