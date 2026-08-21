// netlify/functions/admin-approve-submission.mjs
// POST /.netlify/functions/admin-approve-submission (multipart/form-data)
// Header: x-admin-password
// Campos: key, name, category, description, distance, elevation, diff,
//         gpxFile (opcional — substitui o ficheiro original se enviado)

import { getStore } from "@netlify/blobs";
import { checkAdminAuth } from "./_admin-auth.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeSlug(text) {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "rota"
  );
}

const TYPE_LABELS = { btt: "BTT", estrada: "Estrada", trail: "Trail", cross: "Cross" };

export default async (request) => {
  if (!checkAdminAuth(request)) return jsonResponse(401, { ok: false, error: "unauthorized" });
  if (request.method !== "POST") return jsonResponse(405, { ok: false, error: "method-not-allowed" });

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return jsonResponse(400, { ok: false, error: "invalid-form-data" });
  }

  const submissionKey = (form.get("key") || "").toString();
  const name = (form.get("name") || "").toString().trim();
  const category = (form.get("category") || "").toString().trim();
  const description = (form.get("description") || "").toString().trim();
  const distance = (form.get("distance") || "").toString().trim();
  const elevation = (form.get("elevation") || "").toString().trim();
  const diffRaw = parseInt(form.get("diff") || "50", 10);
  const diff = isNaN(diffRaw) ? 50 : Math.min(100, Math.max(0, diffRaw));
  const replacementFile = form.get("gpxFile");

  if (!submissionKey || !name || !category) {
    return jsonResponse(400, { ok: false, error: "missing-fields" });
  }
  if (!TYPE_LABELS[category]) {
    return jsonResponse(400, { ok: false, error: "invalid-category" });
  }

  try {
    const uploads = getStore("gpx-uploads");
    const published = getStore("published-routes");

    let gpxBuffer;
    if (replacementFile && typeof replacementFile !== "string" && replacementFile.size > 0) {
      if (!replacementFile.name.toLowerCase().endsWith(".gpx")) {
        return jsonResponse(400, { ok: false, error: "not-gpx" });
      }
      gpxBuffer = await replacementFile.arrayBuffer();
    } else {
      gpxBuffer = await uploads.get(`${submissionKey}/track.gpx`, { type: "arrayBuffer" });
    }
    if (!gpxBuffer) return jsonResponse(400, { ok: false, error: "missing-gpx" });

    const originalInfo = await uploads.get(`${submissionKey}/info.json`, { type: "json" });

    const id = `${safeSlug(name)}-${Date.now().toString(36)}`;

    await published.set(`${id}/track.gpx`, gpxBuffer, {
      metadata: { contentType: "application/gpx+xml" }
    });
    await published.setJSON(`${id}/info.json`, {
      id,
      name,
      category,
      typeLabel: TYPE_LABELS[category],
      description,
      status: "Submetido pela comunidade",
      distance: distance || "—",
      elevation: elevation || "—",
      diff,
      publishedAt: new Date().toISOString(),
      submittedBy: originalInfo ? originalInfo.nome : null
    });

    // Mantém a submissão original, só marca o estado (histórico/auditoria).
    if (originalInfo) {
      await uploads.setJSON(`${submissionKey}/info.json`, {
        ...originalInfo,
        status: "aprovado",
        approvedAt: new Date().toISOString(),
        publishedId: id
      });
    }

    return jsonResponse(200, { ok: true, id });
  } catch (err) {
    console.error("[admin-approve-submission]", err);
    return jsonResponse(500, { ok: false, error: "approve-failed", detail: String((err && err.message) || err) });
  }
};
