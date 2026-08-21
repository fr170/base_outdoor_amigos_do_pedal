// netlify/functions/get-published-gpx.mjs
// GET /.netlify/functions/get-published-gpx?id=<id>
// Público — serve o ficheiro .gpx de uma rota aprovada (visualização + download).

import { getStore } from "@netlify/blobs";

export default async (request) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return new Response("missing id", { status: 400 });

  try {
    const store = getStore("published-routes");
    const buf = await store.get(`${id}/track.gpx`, { type: "arrayBuffer" });
    if (!buf) return new Response("not found", { status: 404 });

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": `attachment; filename="${id}.gpx"`,
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (err) {
    console.error("[get-published-gpx]", err);
    return new Response("error", { status: 500 });
  }
};
