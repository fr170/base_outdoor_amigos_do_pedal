// netlify/functions/submit-gpx.mjs
//
// Recebe a submissão do formulário "Tens um GPX para partilhar?" e grava o
// ficheiro + metadados no Netlify Blobs, dentro de um "store" chamado
// "gpx-uploads" — funciona como uma pasta de ficheiros à espera de revisão.
//
// Endpoint: POST /.netlify/functions/submit-gpx
// Corpo: multipart/form-data com os campos nome, email, nome_rota,
//        categoria, notas, empresa (honeypot) e gpx (ficheiro).

import { getStore } from "@netlify/blobs";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — mais do que suficiente para um GPX

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function safeSlug(text) {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "rota";
}

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "method-not-allowed" });
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return jsonResponse(400, { ok: false, error: "invalid-form-data" });
  }

  // Honeypot: se este campo escondido vier preenchido, é quase de certeza um bot.
  const honeypot = (form.get("empresa") || "").toString().trim();
  if (honeypot) {
    // Responde como se tivesse corrido bem, para não dar pistas a bots.
    return jsonResponse(200, { ok: true });
  }

  const nome = (form.get("nome") || "").toString().trim();
  const email = (form.get("email") || "").toString().trim();
  const nomeRota = (form.get("nome_rota") || "").toString().trim();
  const categoria = (form.get("categoria") || "").toString().trim();
  const notas = (form.get("notas") || "").toString().trim();
  const file = form.get("gpx");

  if (!nome || !email || !nomeRota || !categoria) {
    return jsonResponse(400, { ok: false, error: "missing-fields" });
  }
  if (!(file instanceof File) || file.size === 0) {
    return jsonResponse(400, { ok: false, error: "missing-file" });
  }
  if (!file.name.toLowerCase().endsWith(".gpx")) {
    return jsonResponse(400, { ok: false, error: "not-gpx" });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return jsonResponse(400, { ok: false, error: "file-too-large" });
  }

  const store = getStore("gpx-uploads");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `${timestamp}__${safeSlug(nomeRota)}`;

  try {
    // Guarda o ficheiro GPX em si.
    await store.set(`${key}/track.gpx`, await file.arrayBuffer(), {
      metadata: { originalFilename: file.name, contentType: "application/gpx+xml" }
    });
    // Guarda os metadados da submissão ao lado, no mesmo "diretório" lógico.
    await store.setJSON(`${key}/info.json`, {
      nome, email, nomeRota, categoria, notas,
      originalFilename: file.name,
      submittedAt: new Date().toISOString(),
      status: "pendente"
    });
  } catch (err) {
    console.error("Erro ao gravar no Netlify Blobs:", err);
    return jsonResponse(500, { ok: false, error: "storage-failed" });
  }

  return jsonResponse(200, { ok: true, key });
};
