// netlify/functions/admin-toggle-route.mjs
// POST /.netlify/functions/admin-toggle-route
// Body JSON: { id, active: true|false }
// Header ou query param: ?pw=

import { getStore } from "@netlify/blobs";
import { checkAdminAuth } from "./_admin-auth.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export default async (request) => {
  if (!checkAdminAuth(request)) return jsonResponse(401, { ok: false, error: "unauthorized" });
  if (request.method !== "POST") return jsonResponse(405, { ok: false, error: "method-not-allowed" });

  let body;
  try { body = await request.json(); } catch { return jsonResponse(400, { ok: false, error: "invalid-json" }); }

  const { id, active } = body;
  if (!id) return jsonResponse(400, { ok: false, error: "missing-id" });

  try {
    const store = getStore("published-routes");
    const info = await store.get(`${id}/info.json`, { type: "json" });
    if (!info) return jsonResponse(404, { ok: false, error: "not-found" });
    await store.setJSON(`${id}/info.json`, { ...info, active: active !== false });
    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error("[admin-toggle-route]", err);
    return jsonResponse(500, { ok: false, error: "toggle-failed" });
  }
};
