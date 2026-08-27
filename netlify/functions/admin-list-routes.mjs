// netlify/functions/admin-list-routes.mjs
// GET /.netlify/functions/admin-list-routes
// Header ou query param: x-admin-password / ?pw=
// Devolve todas as rotas publicadas (ativas e desativadas).

import { getStore } from "@netlify/blobs";
import { checkAdminAuth } from "./_admin-auth.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export default async (request) => {
  if (!checkAdminAuth(request)) return jsonResponse(401, { ok: false, error: "unauthorized" });

  try {
    const store = getStore("published-routes");
    const { blobs } = await store.list();
    const infoKeys = blobs.map(b => b.key).filter(k => k.endsWith("/info.json"));

    const routes = [];
    for (const key of infoKeys) {
      const info = await store.get(key, { type: "json" });
      if (info) routes.push(info);
    }
    routes.sort((a, b) => (a.publishedAt || "").localeCompare(b.publishedAt || ""));
    return jsonResponse(200, { ok: true, routes });
  } catch (err) {
    console.error("[admin-list-routes]", err);
    return jsonResponse(500, { ok: false, error: "list-failed" });
  }
};
