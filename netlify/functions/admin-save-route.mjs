// netlify/functions/admin-save-route.mjs
// POST /.netlify/functions/admin-save-route (multipart/form-data)
// Cria uma nova rota ou atualiza uma existente (se id vier preenchido).
// Header ou query param: ?pw=

import { getStore } from "@netlify/blobs";
import { checkAdminAuth } from "./_admin-auth.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeSlug(text) {
  return text
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "rota";
}

const TYPE_LABELS = { btt: "BTT", estrada: "Estrada", trail: "Trail", cross: "Cross" };
const MAX_SIZE = 5 * 1024 * 1024;

export default async (request) => {
  if (!checkAdminAuth(request)) return jsonResponse(401, { ok: false, error: "unauthorized" });
  if (request.method !== "POST") return jsonResponse(405, { ok: false, error: "method-not-allowed" });

  let form;
  try { form = await request.formData(); } catch { return jsonResponse(400, { ok: false, error: "invalid-form-data" }); }

  const existingId = (form.get("id") || "").toString().trim();
  const name       = (form.get("name") || "").toString().trim();
  const category   = (form.get("category") || "").toString().trim();
  const description= (form.get("description") || "").toString().trim();
  const distance   = (form.get("distance") || "").toString().trim();
  const elevation  = (form.get("elevation") || "").toString().trim();
  const diff       = Math.min(100, Math.max(0, parseInt(form.get("diff") || "50", 10)));
  const status     = (form.get("status") || "Rota publicada").toString().trim();
  const gpxFile    = form.get("gpx");

  if (!name || !category) return jsonResponse(400, { ok: false, error: "missing-fields" });
  if (!TYPE_LABELS[category]) return jsonResponse(400, { ok: false, error: "invalid-category" });

  const store = getStore("published-routes");
  const id = existingId || `${safeSlug(name)}-${Date.now().toString(36)}`;

  // Se é uma atualização, preserva o GPX existente a menos que venha um novo
  let gpxBuffer = null;
  if (gpxFile && typeof gpxFile !== "string" && gpxFile.size > 0) {
    if (!gpxFile.name.toLowerCase().endsWith(".gpx")) return jsonResponse(400, { ok: false, error: "not-gpx" });
    if (gpxFile.size > MAX_SIZE) return jsonResponse(400, { ok: false, error: "file-too-large" });
    gpxBuffer = await gpxFile.arrayBuffer();
  } else if (existingId) {
    // mantém o GPX existente — não faz nada
  } else {
    return jsonResponse(400, { ok: false, error: "gpx-required-for-new-route" });
  }

  try {
    // Preserva campos existentes (como publishedAt, submittedBy, active)
    let existing = {};
    if (existingId) {
      existing = (await store.get(`${id}/info.json`, { type: "json" })) || {};
    }

    await store.setJSON(`${id}/info.json`, {
      ...existing,
      id,
      name,
      category,
      typeLabel: TYPE_LABELS[category],
      description,
      status,
      distance: distance || "—",
      elevation: elevation || "—",
      diff,
      active: existing.active !== false, // mantém estado ativo por omissão
      publishedAt: existing.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (gpxBuffer) {
      await store.set(`${id}/track.gpx`, gpxBuffer, {
        metadata: { contentType: "application/gpx+xml" }
      });
    }

    return jsonResponse(200, { ok: true, id });
  } catch (err) {
    console.error("[admin-save-route]", err);
    return jsonResponse(500, { ok: false, error: "save-failed", detail: String(err?.message || err) });
  }
};
