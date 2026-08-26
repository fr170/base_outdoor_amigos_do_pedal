// netlify/functions/louseiro-images.mjs
// GET /.netlify/functions/louseiro-images
// Público. Devolve um array com os URLs das imagens do carrossel do Louseiro.
//
// Como adicionar fotos:
//   1. Coloca os ficheiros .jpg/.jpeg/.png/.webp na pasta assets/images/louseiro/
//   2. Faz commit e push — o Netlify faz o deploy e a function devolve automaticamente
//      os novos ficheiros sem precisares de tocar no código.

import { readdir } from "fs/promises";
import { join } from "path";

const ALLOWED = /\.(jpe?g|png|webp|gif)$/i;

export default async () => {
  try {
    // Em produção no Netlify, __dirname não existe em ESM, mas process.cwd()
    // aponta para a raiz do site publicado.
    const dir = join(process.cwd(), "assets", "images", "louseiro");
    const files = await readdir(dir);
    const images = files
      .filter(f => ALLOWED.test(f))
      .sort()
      .map(f => `assets/images/louseiro/${f}`);

    return new Response(JSON.stringify(images), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (err) {
    console.error("[louseiro-images] Erro ao listar pasta:", err);
    // Fallback: devolve array vazio — o carrossel usa o background-image do CSS
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};
