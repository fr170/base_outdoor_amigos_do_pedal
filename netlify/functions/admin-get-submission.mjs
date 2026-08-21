// netlify/functions/admin-get-submission.mjs
// GET /.netlify/functions/admin-get-submission?key=<folderKey>
// Header: x-admin-password

import { getStore } from "@netlify/blobs";
import { checkAdminAuth } from "./_admin-auth.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export default async (request) => {
  if (!checkAdminAuth(request)) return jsonResponse(401, { ok: false, error: "unauthorized" });

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return jsonResponse(400, { ok: false, error: "missing-key" });

  try {
    const store = getStore("gpx-uploads");
    const info = await store.get(`${key}/info.json`, { type: "json" });
    const gpxText = await store.get(`${key}/track.gpx`, { type: "text" });
    if (!info || gpxText == null) return jsonResponse(404, { ok: false, error: "not-found" });
    return jsonResponse(200, { ok: true, key, info, gpx: gpxText });
  } catch (err) {
    console.error("[admin-get-submission]", err);
    return jsonResponse(500, { ok: false, error: "fetch-failed" });
  }
};
