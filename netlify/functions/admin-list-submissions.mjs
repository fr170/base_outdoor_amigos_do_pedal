// netlify/functions/admin-list-submissions.mjs
// GET /.netlify/functions/admin-list-submissions?all=1
// Header: x-admin-password
// Por omissão devolve só as pendentes; ?all=1 devolve também aprovadas/rejeitadas.

import { getStore } from "@netlify/blobs";
import { checkAdminAuth } from "./_admin-auth.mjs";

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export default async (request) => {
  if (!checkAdminAuth(request)) return jsonResponse(401, { ok: false, error: "unauthorized" });

  const url = new URL(request.url);
  const showAll = url.searchParams.get("all") === "1";

  try {
    const store = getStore("gpx-uploads");
    const { blobs } = await store.list();
    const infoKeys = blobs.map((b) => b.key).filter((k) => k.endsWith("/info.json"));

    const submissions = [];
    for (const infoKey of infoKeys) {
      const info = await store.get(infoKey, { type: "json" });
      if (!info) continue;
      if (!showAll && info.status && info.status !== "pendente") continue;
      const folderKey = infoKey.replace(/\/info\.json$/, "");
      submissions.push({ key: folderKey, ...info });
    }
    submissions.sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

    return jsonResponse(200, { ok: true, submissions });
  } catch (err) {
    console.error("[admin-list-submissions]", err);
    return jsonResponse(500, { ok: false, error: "list-failed" });
  }
};
