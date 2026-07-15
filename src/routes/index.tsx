import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { AnalysisModal } from "@/components/AnalysisModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Validador de Materiais PSV | Wilson Sons" },
      {
        name: "description",
        content:
          "Ferramenta interna Wilson Sons para validar disponibilidade em estoque de materiais extraídos do CAD via integração com Make.com.",
      },
      { property: "og:title", content: "Validador de Materiais PSV | Wilson Sons" },
      {
        property: "og:description",
        content: "Ferramenta interna Wilson Sons para validar disponibilidade em estoque de materiais extraídos do CAD via integração com Make.com.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<
    { type: "idle" } | { type: "processing" } | { type: "success" } | { type: "error"; message: string }
  >({ type: "idle" });
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const ACCEPTED_EXT = [
    ".pdf",
    ".dwg",
    ".dxf",
    ".dwf",
    ".step",
    ".stp",
    ".iges",
    ".igs",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
  ];
  const isAccepted = (f: File) => {
    const name = f.name.toLowerCase();
    return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
  };

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(isAccepted);
    if (arr.length === 0) return;
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]));
      arr.forEach((f) => map.set(`${f.name}-${f.size}`, f));
      return Array.from(map.values());
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setStatus({
        type: "error",
        message: "Anexe ao menos um arquivo antes de enviar.",
      });
      return;
    }

    setStatus({ type: "processing" });

    try {
      const formData = new FormData();
      files.forEach((file, i) => {
        formData.append(`file${i}`, file, file.name);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; count?: number; error?: string }
        | null;
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `Falha no upload (HTTP ${res.status}).`);
      }
      setStatus({ type: "success" });
      setFiles([]);
      setAnalysisOpen(true);
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Falha ao enviar ao Google Drive.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-6 overflow-hidden rounded-2xl bg-navy text-paper shadow-lg sm:mb-8">
          <div className="flex flex-col items-start justify-between gap-4 px-5 py-6 sm:flex-row sm:items-center sm:px-8 sm:py-7">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-xs">
                Wilson Sons
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Validador de Materiais PSV
              </h1>
            </div>
            <span className="shrink-0 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white sm:text-xs">
              Google Drive
            </span>
          </div>
        </header>

        {/* Main card */}
        <main className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">
              Enviar arquivos para análise
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Anexe os PDFs ou imagens do CAD. Os arquivos serão salvos direto na
              pasta configurada do Google Drive.
            </p>
          </div>

          <div className="space-y-5 sm:space-y-6">
            {/* File dropzone */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Anexar arquivos técnicos
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all sm:py-10",
                  isDragging
                    ? "border-navy bg-sky"
                    : "border-input bg-background hover:border-sky-dark hover:bg-sky/50"
                )}
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy/10 text-navy">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">
                  Arraste e solte arquivos aqui
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ou clique para selecionar · PDF, DWG, DXF, DWF, STEP, IGES, PNG, JPG
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.dwg,.dxf,.dwf,.step,.stp,.iges,.igs,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
                  {files.map((file, i) => (
                    <li
                      key={`${file.name}-${file.size}-${i}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(i);
                        }}
                        className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:flex-wrap">
              <button
                onClick={handleSubmit}
                disabled={status.type === "processing"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-navy/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {status.type === "processing" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Processando...
                  </>
                ) : (
                  "Verificar Estoque"
                )}
              </button>

              {status.type === "processing" && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-sky px-4 py-3 text-sm font-medium text-navy">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy/30 border-t-navy" />
                  Enviando arquivos para o Google Drive...
                </div>
              )}
              {status.type === "success" && (
                <div className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground">
                  ✓ Arquivos enviados com sucesso para o Google Drive.
                </div>
              )}
              {status.type === "error" && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  {status.message}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-muted-foreground sm:mt-8">
          © {new Date().getFullYear()} Wilson Sons · Ferramenta interna de uso operacional.
        </footer>
      </div>
      <AnalysisModal open={analysisOpen} onClose={() => setAnalysisOpen(false)} />
    </div>
  );
}
