// netlify/functions/_admin-auth.mjs
//
// Proteção simples por password partilhada (guardada como variável de
// ambiente ADMIN_PASSWORD no Netlify). Não é autenticação de nível
// empresarial — é adequada para uma equipa pequena e de confiança a rever
// submissões. Mantém o URL da página /admin.html fora de links públicos
// como camada extra de discrição.

export function checkAdminAuth(request) {
  const provided = request.headers.get("x-admin-password") || "";
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false; // sem password configurada no Netlify => acesso negado por omissão
  return provided === expected;
}
