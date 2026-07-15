import { createFileRoute } from "@tanstack/react-router";

const FOLDER_ID = "1OZfAMPV6K3-x6c8U2G7FP1DXEF985LrF";
const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const MAKE_WEBHOOK_URL =
  "https://hook.us2.make.com/hp65uyfe1e28ti0iiiynjtqwxiiccec9";

async function uploadOne(file: File) {
  const metadata = { name: file.name, parents: [FOLDER_ID] };
  const boundary =
    "----lovable" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const enc = new TextEncoder();
  const head = enc.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const body = new Uint8Array(head.length + fileBytes.length + tail.length);
  body.set(head, 0);
  body.set(fileBytes, head.length);
  body.set(tail, head.length + fileBytes.length);

  const res = await fetch(
    `${GATEWAY}/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.LOVABLE_API_KEY ?? ""}`,
        "X-Connection-Api-Key": process.env.GOOGLE_DRIVE_API_KEY ?? "",
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`Google Drive upload failed [${res.status}]: ${text}`);
    throw new Error(`Google Drive respondeu ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string; name: string };
  const mimeType = file.type || "application/octet-stream";

  try {
    const hookRes = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileId: data.id,
        fileName: data.name,
        mimeType,
      }),
    });
    if (!hookRes.ok) {
      const text = await hookRes.text();
      console.error(`Make.com webhook failed [${hookRes.status}]: ${text}`);
    }
  } catch (err) {
    console.error("Make.com webhook error:", err);
  }

  return { ...data, mimeType };
}

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch (e) {
          return Response.json(
            { error: "Corpo inválido: envie multipart/form-data." },
            { status: 400 },
          );
        }

        const files: File[] = [];
        for (const [key, value] of form.entries()) {
          if (value instanceof File && key.startsWith("file")) files.push(value);
        }
        if (files.length === 0) {
          return Response.json(
            { error: "Nenhum arquivo recebido." },
            { status: 400 },
          );
        }

        try {
          const uploaded = [];
          for (const file of files) {
            uploaded.push(await uploadOne(file));
          }
          return Response.json({ ok: true, count: uploaded.length, uploaded });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Falha ao enviar ao Google Drive.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});