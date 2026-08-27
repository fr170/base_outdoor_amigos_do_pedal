// netlify/functions/get-published-routes.mjs
// GET /.netlify/functions/get-published-routes
// Público — sem password. Devolve as rotas aprovadas pelo admin, no mesmo
// formato dos objetos de assets/data/routes.json, para o index.html juntar
// aos dois catálogos numa só lista.

import { getStore } from "@netlify/blobs";

function jsonResponse(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) }
  });
}

export default async () => {
  try {
    const store = getStore("published-routes");
    const { blobs } = await store.list();
    const infoKeys = blobs.map((b) => b.key).filter((k) => k.endsWith("/info.json"));

    const routes = [];
    for (const infoKey of infoKeys) {
      const info = await store.get(infoKey, { type: "json" });
      if (!info) continue;
      if (info.active === false) continue; // desativada pelo admin — não aparece no site
      routes.push({
        ...info,
        gpx: `/.netlify/functions/get-published-gpx?id=${encodeURIComponent(info.id)}`
      });
    }
    routes.sort((a, b) => (a.publishedAt || "").localeCompare(b.publishedAt || ""));

    return jsonResponse(200, routes, { "Cache-Control": "public, max-age=60" });
  } catch (err) {
    console.error("[get-published-routes]", err);
    return jsonResponse(500, { error: "failed" });
  }
};
