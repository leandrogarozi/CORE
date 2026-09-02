"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBoardCtx } from "./board-context";
import { PaperclipIcon, TrashIcon } from "./icons";
import type { Attachment, AttachmentEntityType } from "@/lib/types";

const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsButton({
  entityType,
  entityId,
  ariaLabel = "Anexos",
}: {
  entityType: AttachmentEntityType;
  entityId: string;
  ariaLabel?: string;
}) {
  const { board, askConfirm } = useBoardCtx();
  const [count, setCount] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    board.listAttachments(entityType, entityId).then((list) => {
      if (!cancelled) setCount(list.length);
    });
    return () => {
      cancelled = true;
    };
    // Só reage a trocar de entidade — não a toda mudança de estado do board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  async function refresh() {
    setLoading(true);
    const list = await board.listAttachments(entityType, entityId);
    setItems(list);
    setCount(list.length);
    setLoading(false);
  }

  function openModal(e: React.MouseEvent) {
    e.stopPropagation();
    setError(null);
    setOpen(true);
    refresh();
  }

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Arquivo maior que 20MB.");
      return;
    }
    setUploading(true);
    const { attachment, error: uploadError } = await board.uploadAttachment(entityType, entityId, file);
    setUploading(false);
    if (uploadError || !attachment) {
      setError(uploadError || "Falha ao enviar o anexo.");
      return;
    }
    setItems((prev) => [...prev, attachment]);
    setCount((c) => (c ?? 0) + 1);
  }

  function handleDelete(a: Attachment) {
    askConfirm(
      `Tem certeza que deseja excluir o arquivo "${a.fileName}"? Essa ação não pode ser desfeita.`,
      async () => {
        const err = await board.deleteAttachment(a);
        if (err) {
          setError(err);
          return;
        }
        setItems((prev) => prev.filter((x) => x.id !== a.id));
        setCount((c) => Math.max(0, (c ?? 1) - 1));
      },
      <PaperclipIcon />
    );
  }

  async function handleDownload(a: Attachment) {
    const url = await board.getAttachmentUrl(a.filePath);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <button
        type="button"
        className={"icon-btn attachment-btn" + (count ? " has-attachments" : "")}
        aria-label={ariaLabel}
        title={count ? `${count} anexo(s)` : "Anexos"}
        onClick={openModal}
      >
        <PaperclipIcon />
        {!!count && <span className="attachment-count mono">{count}</span>}
      </button>
      {open &&
        createPortal(
          <>
            <div className="modal-backdrop" onClick={() => setOpen(false)} />
            <div className="modal-panel" role="dialog" aria-label="Anexos">
              <div className="modal-head">
                <span className="modal-title">
                  <PaperclipIcon /> Anexos
                </span>
              </div>
              <div className="hint-text">
                PDF ou Word: o texto é extraído automaticamente ao subir, deixando pronto pra quando a IA do
                FARO conseguir ler os anexos. Imagem só fica guardada, sem extração de texto.
              </div>
              {loading && <div className="hint-text">Carregando…</div>}
              {!loading && !items.length && <div className="bar-empty">Nenhum anexo ainda.</div>}
              <div className="attachment-list">
                {items.map((a) => (
                  <div className="attachment-row" key={a.id}>
                    <button
                      type="button"
                      className="attachment-name"
                      onClick={() => handleDownload(a)}
                      title="Baixar"
                    >
                      {a.fileName}
                    </button>
                    <span className="attachment-meta mono">{fmtSize(a.sizeBytes)}</span>
                    {a.extractedText && (
                      <span className="attachment-badge" title="Texto extraído do arquivo">
                        texto ok
                      </span>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      title="Excluir anexo"
                      onClick={() => handleDelete(a)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
              {error && (
                <div className="hint-text" style={{ color: "var(--danger)" }}>
                  {error}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <div className="edit-actions" style={{ marginTop: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Fechar
                </button>
                <button
                  type="button"
                  className="btn btn-accent"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Enviando…" : "Adicionar anexo"}
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
