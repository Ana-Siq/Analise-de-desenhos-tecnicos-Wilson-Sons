// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  desenho_id: string;
  nome_arquivo: string;
  materiais_html: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!body?.desenho_id || !body?.nome_arquivo || typeof body?.materiais_html !== "string") {
    return new Response(
      JSON.stringify({
        error:
          "Campos obrigatórios: desenho_id (string), nome_arquivo (string), materiais_html (string).",
      }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const channel = supabase.channel("analises-ao-vivo");
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout ao inscrever")), 5000);
      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "CLOSED") {
          clearTimeout(timeout);
          reject(new Error(`canal ${status}`));
        }
      });
    });

    const result = await channel.send({
      type: "broadcast",
      event: "resultado",
      payload: body,
    });
    console.log("broadcast result:", result);
  } catch (err) {
    console.error("broadcast error:", err);
    return new Response(
      JSON.stringify({ error: `Falha ao transmitir: ${(err as Error).message}` }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } finally {
    await supabase.removeChannel(channel);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});