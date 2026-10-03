"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Ditado por voz usando o reconhecimento que o próprio navegador já tem
// (a mesma engine do microfone do teclado do celular). É de graça e não
// depende de chave de API nem de serviço pago — por isso é o caminho padrão
// do FARO pra entrada por voz.
//
// Onde funciona: Chrome (desktop e Android), Edge e Safari. Onde não
// funciona, o botão some e quem quiser ditar usa o microfone do teclado,
// que escreve em qualquer campo de texto do mesmo jeito.

type RecognitionEvent = {
  resultIndex: number;
  results: { isFinal: boolean; 0: { transcript: string }; length: number }[] & { length: number };
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRO_LEGIVEL: Record<string, string> = {
  "not-allowed": "Permissão de microfone negada. Libere o microfone pro site e tente de novo.",
  "service-not-allowed": "O navegador bloqueou o reconhecimento de voz.",
  "audio-capture": "Nenhum microfone encontrado.",
  network: "Sem conexão pra transcrever a fala.",
  aborted: "",
  "no-speech": "",
};

export function useDictation({
  onText,
  lang = "pt-BR",
  oneShot = false,
  onDone,
}: {
  // Recebe cada trecho JÁ FECHADO da fala. Chamado várias vezes enquanto se
  // fala, pra ir escrevendo em vez de esperar terminar tudo.
  onText: (text: string) => void;
  lang?: string;
  // Modo "fala uma frase e pronto": o navegador para sozinho quando a pessoa
  // se cala, e o texto inteiro vai de uma vez pra `onDone`. É o modo do campo
  // "adicionar tarefa", onde a ideia é tocar, falar e a tarefa já nascer, sem
  // tocar de novo pra parar nem confirmar. No ditado de textos longos o modo
  // contínuo continua valendo (uma pausa pra pensar não pode encerrar tudo).
  oneShot?: boolean;
  onDone?: (text: string) => void;
}) {
  // Inicializador preguiçoso em vez de efeito: o navegador ou tem
  // reconhecimento de voz ou não tem, isso não muda depois. Mesmo padrão do
  // useWideLayout — no servidor dá false e o botão simplesmente não é
  // desenhado lá.
  const [supported] = useState(() => (typeof window === "undefined" ? false : getRecognitionCtor() !== null));
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  const onDoneRef = useRef(onDone);
  const bufferRef = useRef("");
  const limiteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Só o usuário encerra o ditado. O reconhecimento do navegador se desliga
  // sozinho depois de um silêncio curto — sem religar, uma pausa pra pensar
  // no meio da frase mataria o ditado.
  const queroOuvirRef = useRef(false);

  useEffect(() => {
    onTextRef.current = onText;
    onDoneRef.current = onDone;
  }, [onText, onDone]);

  const stop = useCallback(() => {
    queroOuvirRef.current = false;
    setListening(false);
    setPartial("");
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = !oneShot;
    rec.interimResults = true;
    bufferRef.current = "";

    rec.onresult = (e) => {
      let fechado = "";
      let emAndamento = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fechado += r[0].transcript;
        else emAndamento += r[0].transcript;
      }
      setPartial(emAndamento);
      if (fechado.trim()) {
        if (oneShot) bufferRef.current = `${bufferRef.current} ${fechado.trim()}`.trim();
        else onTextRef.current(fechado.trim());
      }
    };

    rec.onerror = (e) => {
      const msg = ERRO_LEGIVEL[e.error] ?? "Não deu pra ouvir. Tente de novo.";
      // "no-speech" e "aborted" são rotina (silêncio, ou o próprio stop):
      // não viram mensagem de erro na tela.
      if (msg) {
        setError(msg);
        queroOuvirRef.current = false;
        setListening(false);
      }
    };

    rec.onend = () => {
      setPartial("");
      if (oneShot) {
        // Acabou a fala (silêncio ou toque no microfone): entrega a frase
        // inteira UMA vez. Nunca religa, senão a próxima conversa na sala
        // viraria tarefa.
        queroOuvirRef.current = false;
        setListening(false);
        if (limiteRef.current) clearTimeout(limiteRef.current);
        const texto = bufferRef.current.trim();
        bufferRef.current = "";
        if (texto) onDoneRef.current?.(texto);
        return;
      }
      if (queroOuvirRef.current) {
        // Religa depois de um silêncio, mantendo o ditado vivo.
        try {
          rec.start();
        } catch {
          queroOuvirRef.current = false;
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recRef.current = rec;
    queroOuvirRef.current = true;
    try {
      rec.start();
      setListening(true);
      // Trava de segurança do modo de uma frase: se o navegador nunca detectar
      // o fim da fala (ruído de fundo), encerra em 20 s em vez de ficar ouvindo.
      if (oneShot) {
        if (limiteRef.current) clearTimeout(limiteRef.current);
        limiteRef.current = setTimeout(() => rec.stop(), 20000);
      }
    } catch {
      // start() em cima de uma sessão que ainda não morreu: ignora, o onend
      // religa.
    }
  }, [lang, oneShot]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Sair da tela com o microfone ligado deixaria o navegador ouvindo à toa.
  useEffect(
    () => () => {
      queroOuvirRef.current = false;
      recRef.current?.abort();
    },
    []
  );

  return { supported, listening, partial, error, start, stop, toggle };
}
