"use client";

import { useState } from "react";
import { useBoardCtx } from "./board-context";
import { ChevronIcon, DownloadIcon, LinkIcon, TrashIcon } from "./icons";
import { ToggleSwitch } from "./ToggleSwitch";
import {
  BlocosDeEscolha,
  CaixaDeMarcar,
  Etiqueta,
  IconeEstrela,
  IconeLink,
  IconeLista,
  IconeTextoCurto,
  IconeTextoLongo,
  PilulaDeMarcar,
  SecaoCard,
} from "./form-kit";
import { useWideLayout } from "@/lib/board/use-wide-layout";
import { baixarTexto } from "@/lib/baixar";
import { csvDosLinks, respostasPorPergunta, rotuloDoStatus, statusDoLink } from "@/lib/cadastro/csv";
import {
  ESCALAS_DE_NOTA,
  MAXIMO_DE_OPCOES,
  TIPOS_DE_PERGUNTA,
  codigoDoLink,
  idDaPergunta,
  lerPerguntas,
  urlDoLink,
  type Pergunta,
} from "@/lib/cadastro/links";
import { useCadastro, type DadosDoLink, type LinkDeCadastro } from "@/lib/cadastro/use-cadastro";

const VAZIO: DadosDoLink = {
  cliente: "",
  pessoa: "",
  eyebrow: "",
  titulo: "",
  boas_vindas: "",
  perguntas: [],
  limit_respostas: 1,
  tamanho_texto: "m",
  pedir_whatsapp: true,
  pedir_aniversario: true,
};
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

const ICONES_DO_TIPO: Record<string, React.ReactNode> = {
  texto: <IconeTextoCurto />,
  longo: <IconeTextoLongo />,
  escolha: <IconeLista />,
  links: <IconeLink />,
  nota: <IconeEstrela />,
};
const BLOCOS_DE_TIPO = TIPOS_DE_PERGUNTA.map((t) => ({ ...t, icone: ICONES_DO_TIPO[t.id] }));
const BLOCOS_DE_ESCALA = ESCALAS_DE_NOTA.map((e) => ({ id: e.id, rotulo: e.rotulo }));
const TAMANHOS = [
  { id: "p", rotulo: "P" },
  { id: "m", rotulo: "M" },
  { id: "g", rotulo: "G" },
] as const;

/** Um cartão por pergunta: número, título, observação, tipo em blocos, opções e "obrigatória". */
function CartaoDePergunta({
  p,
  i,
  total,
  onMudar,
  onMover,
  onTirar,
}: {
  p: Pergunta;
  i: number;
  total: number;
  onMudar: (patch: Partial<Pergunta>) => void;
  onMover: (delta: number) => void;
  onTirar: () => void;
}) {
  const tipo = TIPOS_DE_PERGUNTA.some((t) => t.id === p.tipo) ? p.tipo : "texto";
  const opcoes = p.opcoes ?? [];
  return (
    <article className="fm-pergunta">
      <header className="fm-pergunta-cab">
        <span className="fm-ordem">
          <button type="button" aria-label="Subir pergunta" disabled={i === 0} onClick={() => onMover(-1)}>
            ⌃
          </button>
          <button type="button" aria-label="Descer pergunta" disabled={i === total - 1} onClick={() => onMover(1)}>
            ⌄
          </button>
        </span>
        <span className="fm-numero">{i + 1}</span>
        <input
          type="text"
          className="fm-pergunta-titulo"
          value={p.texto}
          placeholder="Escreva a pergunta"
          aria-label={`Pergunta ${i + 1}`}
          onChange={(e) => onMudar({ texto: e.target.value })}
        />
        <button type="button" className="icon-btn danger-hover" title="Tirar a pergunta" onClick={onTirar}>
          <TrashIcon />
        </button>
      </header>
      <input
        type="text"
        className="fm-pergunta-instrucao"
        value={p.instrucao ?? ""}
        placeholder="Instrução ou observação (opcional) — aparece abaixo da pergunta"
        aria-label={`Observação da pergunta ${i + 1}`}
        onChange={(e) => onMudar({ instrucao: e.target.value })}
      />
      <div className="fm-pergunta-corpo">
        <Etiqueta>Tipo de resposta</Etiqueta>
        <BlocosDeEscolha
          opcoes={BLOCOS_DE_TIPO}
          valor={tipo}
          ariaLabel="Tipo de resposta"
          onChange={(t) =>
            onMudar({
              tipo: t,
              ...(t === "escolha" ? { opcoes: opcoes.length ? opcoes : ["", ""] } : {}),
              ...(t === "nota" ? { escala: p.escala ?? "1-5" } : {}),
            })
          }
        />

        {tipo === "escolha" && (
          <>
            <Etiqueta>Opções de resposta</Etiqueta>
            <div className="fm-opcoes">
              {opcoes.map((o, k) => (
                <div className="fm-opcao" key={k}>
                  <span className="fm-letra">{String.fromCharCode(65 + k)}</span>
                  <input
                    type="text"
                    value={o}
                    placeholder={`Opção ${String.fromCharCode(65 + k)}`}
                    aria-label={`Opção ${String.fromCharCode(65 + k)}`}
                    onChange={(e) => onMudar({ opcoes: opcoes.map((x, j) => (j === k ? e.target.value : x)) })}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    title="Tirar a opção"
                    onClick={() => onMudar({ opcoes: opcoes.filter((_, j) => j !== k) })}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {opcoes.length < MAXIMO_DE_OPCOES && (
              <button type="button" className="fm-adicionar" onClick={() => onMudar({ opcoes: [...opcoes, ""] })}>
                + Adicionar opção
              </button>
            )}
            <CaixaDeMarcar marcado={p.outros === true} onChange={(v) => onMudar({ outros: v })}>
              Incluir opção &ldquo;Outros&rdquo; (campo livre)
            </CaixaDeMarcar>
          </>
        )}

        {tipo === "nota" && (
          <>
            <Etiqueta>Escala</Etiqueta>
            <BlocosDeEscolha opcoes={BLOCOS_DE_ESCALA} valor={p.escala ?? "1-5"} ariaLabel="Escala da nota" onChange={(e) => onMudar({ escala: e })} />
          </>
        )}

        <CaixaDeMarcar marcado={!p.opcional} onChange={(v) => onMudar({ opcional: !v })}>
          Resposta obrigatória
        </CaixaDeMarcar>
      </div>
    </article>
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
  const [abertura, setAbertura] = useState(inicial.boas_vindas.trim() !== "");
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
    <div className="fm-editor">
      <SecaoCard titulo="Nome privado" selo="Privado" dica="Só você vê: aparece nas suas listas. A pessoa nunca vê, mas o endereço do link usa estes nomes." tracejado>
        <div className="fm-duas">
          <label className="fm-campo">
            <Etiqueta>Cliente (empresa)</Etiqueta>
            <input type="text" value={d.cliente} placeholder="Witt" onChange={(e) => campo("cliente", e.target.value)} />
          </label>
          <label className="fm-campo">
            <Etiqueta>Pessoa</Etiqueta>
            <input type="text" value={d.pessoa} placeholder="Flaviana" onChange={(e) => campo("pessoa", e.target.value)} />
          </label>
        </div>
      </SecaoCard>

      <SecaoCard titulo="Cabeçalho da página" dica="O que a pessoa lê no alto, antes das perguntas.">
        <div className="fm-duas">
          <label className="fm-campo">
            <Etiqueta>Chamada pequena</Etiqueta>
            <input type="text" value={d.eyebrow} placeholder="Devolutiva CIS" onChange={(e) => campo("eyebrow", e.target.value)} />
          </label>
          <label className="fm-campo">
            <Etiqueta>Título</Etiqueta>
            <input type="text" value={d.titulo} placeholder="Antes da nossa conversa" onChange={(e) => campo("titulo", e.target.value)} />
          </label>
        </div>
      </SecaoCard>

      <SecaoCard titulo="Dados solicitados à pessoa" dica="Desmarque o que não precisa coletar. Nome e e-mail sempre vão: é por eles que o FARO reconhece quem respondeu.">
        <div className="fm-pilulas">
          <PilulaDeMarcar marcado disabled onChange={() => {}}>
            Nome completo
          </PilulaDeMarcar>
          <PilulaDeMarcar marcado disabled onChange={() => {}}>
            E-mail
          </PilulaDeMarcar>
          <PilulaDeMarcar marcado={d.pedir_whatsapp} onChange={(v) => campo("pedir_whatsapp", v)}>
            Telefone / WhatsApp
          </PilulaDeMarcar>
          <PilulaDeMarcar marcado={d.pedir_aniversario} onChange={(v) => campo("pedir_aniversario", v)}>
            Data de nascimento
          </PilulaDeMarcar>
        </div>
      </SecaoCard>

      <SecaoCard
        titulo="Mensagem de abertura personalizada"
        dica="Aparece na tela inicial, antes da pessoa começar."
        direita={<ToggleSwitch checked={abertura} ariaLabel="Mensagem de abertura personalizada" onChange={setAbertura} />}
      >
        {abertura && (
          <>
            <textarea
              rows={4}
              className="fm-textarea"
              value={d.boas_vindas}
              placeholder="Olá! Estou muito animado com este projeto. Responda com calma: não existe resposta certa ou errada."
              aria-label="Mensagem de abertura"
              onChange={(e) => campo("boas_vindas", e.target.value)}
            />
            <div className="fm-tamanho">
              <span>Tamanho do texto:</span>
              {TAMANHOS.map((t) => (
                <button key={t.id} type="button" className={"fm-quadrado" + (d.tamanho_texto === t.id ? " on" : "")} aria-pressed={d.tamanho_texto === t.id} onClick={() => campo("tamanho_texto", t.id)}>
                  {t.rotulo}
                </button>
              ))}
            </div>
          </>
        )}
      </SecaoCard>

      <div className="fm-secao-cab">
        <h3>Perguntas</h3>
        <span>
          {d.perguntas.length} {d.perguntas.length === 1 ? "pergunta" : "perguntas"}
        </span>
      </div>
      {!d.perguntas.length && <p className="fm-dica">Sem perguntas: a pessoa só deixa os dados pedidos acima.</p>}
      {d.perguntas.map((p, i) => (
        <CartaoDePergunta
          key={p.id}
          p={p}
          i={i}
          total={d.perguntas.length}
          onMudar={(patch) => pergunta(i, patch)}
          onMover={(delta) => mover(i, delta)}
          onTirar={() => campo("perguntas", d.perguntas.filter((_, j) => j !== i))}
        />
      ))}
      <button
        type="button"
        className="fm-adicionar fm-adicionar-grande"
        onClick={() => campo("perguntas", [...d.perguntas, { id: idDaPergunta("pergunta", d.perguntas.map((p) => p.id)), texto: "", tipo: "texto", opcional: false }])}
      >
        + Adicionar pergunta
      </button>

      <SecaoCard titulo="Respostas aceitas" dica="Quantas vezes este link pode ser respondido. O normal é 1: um link por pessoa.">
        <input
          type="number"
          min={1}
          max={20}
          className="fm-numero-campo"
          value={d.limit_respostas}
          aria-label="Respostas aceitas"
          onChange={(e) => campo("limit_respostas", Math.min(20, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
        />
      </SecaoCard>

      <div className="fm-rodape">
        <span className="fm-link mono">{urlDoLink(mostrarCodigo ?? (podeSalvar ? codigoDoLink(d.cliente, d.pessoa) : "cliente-pessoa"))}</span>
        <span className="fm-rodape-botoes">
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
              // Pergunta sem texto não vale; opção em branco também. O id da pergunta nunca muda, mesmo se o texto mudar.
              const perguntas = d.perguntas
                .filter((p) => p.texto.trim())
                .map((p) => ({
                  ...p,
                  texto: p.texto.trim(),
                  instrucao: p.instrucao?.trim() || undefined,
                  opcoes: p.tipo === "escolha" ? (p.opcoes ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
                  outros: p.tipo === "escolha" ? p.outros === true : undefined,
                  escala: p.tipo === "nota" ? p.escala ?? "1-5" : undefined,
                }));
              await onSalvar({ ...d, cliente: d.cliente.trim(), pessoa: d.pessoa.trim(), boas_vindas: abertura ? d.boas_vindas.trim() : "", perguntas });
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

          <span className="fm-secao-titulo">Editar link</span>
          <EditorDoLink
            inicial={{
              cliente: link.cliente,
              pessoa: link.pessoa,
              eyebrow: link.eyebrow,
              titulo: link.titulo,
              boas_vindas: link.boas_vindas,
              perguntas,
              limit_respostas: link.limit_respostas,
              tamanho_texto: link.tamanho_texto === "p" || link.tamanho_texto === "g" ? link.tamanho_texto : "m",
              pedir_whatsapp: link.pedir_whatsapp,
              pedir_aniversario: link.pedir_aniversario,
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
          <div className="cad-novo">
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
