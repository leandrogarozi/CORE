"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json, Tables } from "@/lib/database.types";
import { codigoDoLink, codigoLivre, type Pergunta } from "./links";

export type LinkDeCadastro = Tables<"cadastro_links">;
export type ClienteDoSite = Tables<"clientes_cadastro">;

export interface DadosDoLink {
  cliente: string;
  pessoa: string;
  eyebrow: string;
  titulo: string;
  boas_vindas: string;
  perguntas: Pergunta[];
  limit_respostas: number;
  /** Tamanho do texto da mensagem de boas-vindas na página. */
  tamanho_texto: "p" | "m" | "g";
  pedir_whatsapp: boolean;
  pedir_aniversario: boolean;
}

/**
 * Cadastros pelo site: links de cada pessoa e quem respondeu. Lê e grava direto no
 * banco com o login do dono (o RLS garante que só enxerga o que é dele); a gravação
 * pública das respostas é a rota /api/cadastro, no servidor.
 */
export function useCadastro() {
  const supabase = useMemo(() => createClient(), []);
  const [links, setLinks] = useState<LinkDeCadastro[] | null>(null);
  const [clientes, setClientes] = useState<ClienteDoSite[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(
    () =>
      Promise.all([
        supabase.from("cadastro_links").select("*").order("criado_em", { ascending: false }),
        supabase.from("clientes_cadastro").select("*").order("atualizado_em", { ascending: false }),
      ]),
    [supabase]
  );
  const aplicar = useCallback(([l, c]: Awaited<ReturnType<typeof buscar>>) => {
    if (l.error || c.error) {
      setErro((l.error ?? c.error)!.message);
      return;
    }
    setErro(null);
    setLinks(l.data ?? []);
    setClientes(c.data ?? []);
  }, []);
  const carregar = useCallback(async () => aplicar(await buscar()), [buscar, aplicar]);

  useEffect(() => {
    void buscar().then(aplicar);
  }, [buscar, aplicar]);

  /** Cria o link e devolve o código final (se o código já existe, vira -2, -3...). */
  const criarLink = useCallback(
    async (d: DadosDoLink): Promise<LinkDeCadastro | null> => {
      const { data: sessao } = await supabase.auth.getUser();
      if (!sessao.user) {
        setErro("Sessão expirada. Entre de novo.");
        return null;
      }
      let existentes = (links ?? []).map((l) => l.codigo);
      const base = codigoDoLink(d.cliente, d.pessoa);
      // O código é único no mundo todo (é o endereço público): se outro registro pegou o mesmo
      // entre o carregamento e agora, tenta o próximo.
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        const codigo = codigoLivre(base, existentes);
        const { data, error } = await supabase
          .from("cadastro_links")
          .insert({ user_id: sessao.user.id, codigo, ...d, perguntas: d.perguntas as unknown as Json })
          .select("*")
          .single();
        if (!error && data) {
          setLinks((atual) => [data, ...(atual ?? [])]);
          return data;
        }
        if (error?.code === "23505") {
          existentes = [...existentes, codigo];
          continue;
        }
        setErro(error?.message ?? "Não foi possível criar o link.");
        return null;
      }
      setErro("Não foi possível achar um código livre para esse link.");
      return null;
    },
    [supabase, links]
  );

  const atualizarLink = useCallback(
    async (id: string, patch: Partial<Omit<DadosDoLink, "perguntas">> & { ativo?: boolean; perguntas?: Pergunta[] }): Promise<boolean> => {
      setLinks((atual) => (atual ?? []).map((l) => (l.id === id ? ({ ...l, ...patch } as LinkDeCadastro) : l)));
      const { perguntas, ...resto } = patch;
      const { data, error } = await supabase
        .from("cadastro_links")
        .update({ ...resto, ...(perguntas ? { perguntas: perguntas as unknown as Json } : {}) })
        .eq("id", id)
        .select("id");
      // Sem erro mas sem linha atualizada = o banco recusou calado (permissão): também é falha.
      if (error || !data?.length) {
        setErro(error?.message ?? "O banco não aceitou a alteração. Atualize a página e tente de novo.");
        void carregar();
        return false;
      }
      setErro(null);
      return true;
    },
    [supabase, carregar]
  );

  /** Liga/desliga o "não enviar". Ao ligar, também desliga a mensagem automática do aniversário da pessoa. */
  const marcarNaoEnviar = useCallback(
    async (cliente: ClienteDoSite, valor: boolean) => {
      const quando = valor ? new Date().toISOString() : null;
      setClientes((atual) => (atual ?? []).map((c) => (c.id === cliente.id ? { ...c, nao_enviar: valor, nao_enviar_em: quando } : c)));
      const { error } = await supabase.from("clientes_cadastro").update({ nao_enviar: valor, nao_enviar_em: quando }).eq("id", cliente.id);
      if (error) {
        setErro(error.message);
        void carregar();
        return;
      }
      if (valor && cliente.birthday_id) await supabase.from("birthdays").update({ auto_message: false }).eq("id", cliente.birthday_id);
    },
    [supabase, carregar]
  );

  /** Apaga a pessoa de verdade (pedido de exclusão, LGPD): cadastro, aniversário e lembrete. */
  const apagarCliente = useCallback(
    async (id: string) => {
      const r = await fetch("/api/cadastro/apagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) {
        setErro("Não foi possível apagar agora.");
        return;
      }
      await carregar();
    },
    [carregar]
  );

  return { links, clientes, erro, carregar, criarLink, atualizarLink, marcarNaoEnviar, apagarCliente };
}

/** Quem está marcado como "não enviar", para as telas esconderem o botão de mandar mensagem. */
export function useNaoEnviar() {
  const supabase = useMemo(() => createClient(), []);
  const [marcados, setMarcados] = useState<{ birthdays: Set<string>; numeros: Set<string> }>({ birthdays: new Set(), numeros: new Set() });
  useEffect(() => {
    void supabase
      .from("clientes_cadastro")
      .select("birthday_id, whatsapp_norm")
      .eq("nao_enviar", true)
      .then(({ data }) => {
        setMarcados({
          birthdays: new Set((data ?? []).map((c) => c.birthday_id).filter((x): x is string => !!x)),
          numeros: new Set((data ?? []).map((c) => c.whatsapp_norm).filter((x): x is string => !!x)),
        });
      });
  }, [supabase]);
  return marcados;
}
