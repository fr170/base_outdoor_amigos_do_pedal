// netlify/functions/_admin-auth.mjs
//
// Proteção simples por password partilhada (guardada como variável de
// ambiente ADMIN_PASSWORD no Netlify). Não é autenticação de nível
// empresarial — é adequada para uma equipa pequena e de confiança a rever
// submissões. Mantém o URL da página /admin.html fora de links públicos
// como camada extra de discrição.

export function checkAdminAuth(request) {
  // Aceita a password tanto no header x-admin-password como no query param
  // ?pw=... (fallback para casos onde o browser strip headers personalizados).
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-admin-password") ||
    url.searchParams.get("pw") ||
    "";
  const expected = (process.env.ADMIN_PASSWORD || "").trim();
  console.log(
    "[admin-auth] expected.length:", expected.length,
    "| provided.length:", provided.trim().length,
    "| match:", provided.trim() === expected
  );
  if (!expected) return false;
  return provided.trim() === expected;
}
