import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AnalysisResult {
  desenho_id: string;
  nome_arquivo: string;
  materiais_html: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

const TIMEOUT_MS = 5 * 60 * 1000;

type Row = { descricao: string; status: "OK" | "COMPRAR"; statusText: string };

function parseMateriais(html: string): Row[] | null {
  // If a real HTML table is provided, don't try to parse.
  if (/<table[\s>]/i.test(html)) return null;
  // Strip any stray tags, decode a couple entities.
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  const regex = /(✅\s*EM ESTOQUE|⚠️\s*COMPRAR|⚠\s*COMPRAR)/g;
  const rows: Row[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const descricao = text.slice(lastIndex, match.index).trim();
    const marker = match[0];
    const isOk = marker.includes("EM ESTOQUE");
    if (descricao) {
      rows.push({
        descricao,
        status: isOk ? "OK" : "COMPRAR",
        statusText: isOk ? "✅ EM ESTOQUE" : "⚠️ COMPRAR",
      });
    }
    lastIndex = match.index + marker.length;
  }
  return rows.length > 0 ? rows : null;
}

export function AnalysisModal({ open, onClose }: Props) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setTimedOut(false);
      return;
    }

    const channel = supabase
      .channel("analises-ao-vivo")
      .on("broadcast", { event: "resultado" }, (msg) => {
        setResult(msg.payload as AnalysisResult);
        setTimedOut(false);
      })
      .subscribe();

    const timer = window.setTimeout(() => {
      setResult((current) => {
        if (!current) setTimedOut(true);
        return current;
      });
    }, TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-navy px-5 py-4 text-white">
          <h2 className="text-base font-semibold sm:text-lg">
            {result
              ? `Materiais · ${result.nome_arquivo}`
              : timedOut
                ? "Análise em andamento"
                : "Analisando desenho técnico"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Fechar
          </button>
        </div>

        {!result && !timedOut && (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <span className="h-12 w-12 animate-spin rounded-full border-4 border-navy/20 border-t-navy" />
            <p className="text-base font-medium text-foreground">
              Analisando desenho técnico, aguarde...
            </p>
            <p className="text-sm text-muted-foreground">
              Os materiais aparecerão aqui assim que a análise for concluída.
            </p>
          </div>
        )}

        {!result && timedOut && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-sky text-navy">
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-base font-medium text-foreground">
              A análise está demorando mais que o esperado.
            </p>
            <p className="text-sm text-muted-foreground">
              Você receberá o resultado por e-mail assim que estiver pronto.
            </p>
          </div>
        )}

        {result && (
          <div className="max-h-[70vh] overflow-auto px-4 py-4 sm:px-6">
            {(() => {
              const parsed = parseMateriais(result.materiais_html);
              if (parsed) {
                return (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-navy text-white">
                        <th className="border border-border px-3 py-2 text-left">Descrição</th>
                        <th className="border border-border px-3 py-2 text-left w-40">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.map((row, i) => (
                        <tr
                          key={i}
                          className={row.status === "OK" ? "bg-green-50" : "bg-red-50"}
                        >
                          <td className="border border-border px-3 py-2 align-top">
                            {row.descricao}
                          </td>
                          <td
                            className={`border border-border px-3 py-2 align-top font-semibold ${
                              row.status === "OK" ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {row.statusText}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              }
              return (
                <div
                  className="analysis-html overflow-auto text-foreground"
                  dangerouslySetInnerHTML={{ __html: result.materiais_html }}
                />
              );
            })()}
            <style>{`
              .analysis-html table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 13px; }
              .analysis-html th, .analysis-html td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
              .analysis-html thead th, .analysis-html tr:first-child th { background: #2c3e50; color: #ffffff; }
              .analysis-html img { display: inline-block; height: 1em; vertical-align: -0.15em; }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
