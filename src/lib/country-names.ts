// ─── Nome do país em português (para o painel) ───────────────────────────────
// O banco guarda o código ISO (BR, MX, AR…) — estável e comparável. Aqui só a
// tradução para leitura humana, cobrindo o mundo lusófono e hispanofalante (que
// é o público dos dois idiomas do site) mais os destinos de diáspora onde o
// anúncio costuma cair. Código fora da lista aparece como está — nunca some.

const NAMES: Record<string, string> = {
  // Lusófonos
  BR: "Brasil",
  PT: "Portugal",
  AO: "Angola",
  MZ: "Moçambique",
  CV: "Cabo Verde",
  GW: "Guiné-Bissau",
  ST: "São Tomé e Príncipe",
  TL: "Timor-Leste",
  // Hispanofalantes
  ES: "Espanha",
  MX: "México",
  AR: "Argentina",
  CO: "Colômbia",
  CL: "Chile",
  PE: "Peru",
  VE: "Venezuela",
  EC: "Equador",
  BO: "Bolívia",
  PY: "Paraguai",
  UY: "Uruguai",
  CR: "Costa Rica",
  PA: "Panamá",
  GT: "Guatemala",
  HN: "Honduras",
  SV: "El Salvador",
  NI: "Nicarágua",
  DO: "República Dominicana",
  CU: "Cuba",
  PR: "Porto Rico",
  GQ: "Guiné Equatorial",
  // Diáspora / tráfego comum
  US: "Estados Unidos",
  CA: "Canadá",
  GB: "Reino Unido",
  IE: "Irlanda",
  FR: "França",
  DE: "Alemanha",
  IT: "Itália",
  CH: "Suíça",
  BE: "Bélgica",
  NL: "Países Baixos",
  LU: "Luxemburgo",
  AD: "Andorra",
  JP: "Japão",
  AU: "Austrália",
  NZ: "Nova Zelândia",
  ZA: "África do Sul",
  AE: "Emirados Árabes Unidos",
  MA: "Marrocos",
};

/** "BR" → "Brasil"; código desconhecido volta em maiúsculo; vazio → "não informado". */
export function countryName(code: string | null | undefined): string {
  if (!code) return "não informado";
  const up = code.trim().toUpperCase();
  if (up === "??" || up === "") return "não informado";
  return NAMES[up] ?? up;
}

/** Bandeira em emoji a partir do código ISO (letras → indicadores regionais). */
export function countryFlag(code: string | null | undefined): string {
  const up = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(up)) return "🏳️";
  return String.fromCodePoint(...[...up].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
