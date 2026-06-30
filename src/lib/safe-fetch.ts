// ─── Guarda anti-SSRF p/ fetch server-side de URL vinda de input ──────────────
// `/api/og` é PÚBLICA e sem auth e recebe `?img=` (URL arbitrária do usuário) que ia
// direto a fetch() no servidor → daria pra sondar rede interna/metadata da cloud
// (169.254.*, 10.*, 127.*) ou fazer varredura de portas. `isAllowedFetchUrl` só deixa
// passar HTTPS de HOSTS conhecidos (as fontes reais de imagem) e barra IP literal.
// Função PURA → testável por invariante. Ver auditoria 2026-06-29.

export const OG_FETCH_HOSTS = ["fal.media", "blob.vercel-storage.com", "pexels.com", "drlibertad.com", "vercel.app"];

export function isAllowedFetchUrl(raw: string, allow: string[] = OG_FETCH_HOSTS): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(":")) return false; // sem IP literal (v4/v6)
    return allow.some((d) => h === d || h.endsWith("." + d));
  } catch {
    return false;
  }
}
