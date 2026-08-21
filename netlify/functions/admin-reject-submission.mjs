// netlify/functions/admin-reject-submission.mjs
// POST /.netlify/functions/admin-reject-submission (application/json: { key })
// Header: x-admin-password

import { getStore } from "@netlify/blobs";
import { checkAdminAuth } from "./_admin-auth.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export default async (request) => {
  if (!checkAdminAuth(request)) return jsonResponse(401, { ok: false, error: "unauthorized" });
  if (request.method !== "POST") return jsonResponse(405, { ok: false, error: "method-not-allowed" });

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return jsonResponse(400, { ok: false, error: "invalid-json" });
  }
  const key = (body.key || "").toString();
  if (!key) return jsonResponse(400, { ok: false, error: "missing-key" });

  try {
    const store = getStore("gpx-uploads");
    const info = await store.get(`${key}/info.json`, { type: "json" });
    if (info) {
      await store.setJSON(`${key}/info.json`, {
        ...info,
        status: "rejeitado",
        rejectedAt: new Date().toISOString()
      });
    }
    return jsonResponse(200, { ok: true });
  } catch (err) {
    console.error("[admin-reject-submission]", err);
    return jsonResponse(500, { ok: false, error: "reject-failed" });
  }
};
