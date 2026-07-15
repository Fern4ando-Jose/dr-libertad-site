// ─── Upload do reel para um GitHub Release (hospedagem pública GRÁTIS) ─────────
// Substitui o Vercel Blob (que satura o teto grátis da conta INTEIRA e SUSPENDE o
// store → `BlobStoreSuspendedError`, incidente 2026-07-15). O repo é PÚBLICO, então
// o asset de um Release tem URL de download pública que a Graph API do IG consegue
// buscar (segue o 302 p/ objects.githubusercontent.com). Sem conta nova, sem cartão.
//
// Sobe out/reel.mp4 como asset de um Release "rolante" (tag fixa REELS_MEDIA_TAG) e
// imprime a URL pública na ÚLTIMA linha do stdout (o resto vai p/ stderr — igual ao
// upload-blob.mjs, p/ o CI capturar `URL=$(node scripts/upload-release.mjs)`).
//
// Requer no ambiente:
//   GITHUB_TOKEN       (o token do próprio Actions; precisa de `contents: write`)
//   GITHUB_REPOSITORY  (owner/repo — o Actions injeta sozinho)
//
// Uso:
//   node scripts/upload-release.mjs                → sobe out/reel.mp4
//   node scripts/upload-release.mjs caminho/x.mp4  → sobe o arquivo informado

import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const TAG = process.env.REELS_MEDIA_TAG || "reels-media";
const API = "https://api.github.com";
const UPLOADS = "https://uploads.github.com";
// Poda: mantém o Release enxuto sem cron extra (best-effort, nunca fatal).
const KEEP = Number(process.env.REELS_MEDIA_KEEP || 12) || 12;
const HOURS = Number(process.env.REELS_MEDIA_HOURS || 48) || 48;

function ghHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

async function getReleaseByTag(repo, token) {
  const r = await fetch(`${API}/repos/${repo}/releases/tags/${TAG}`, {
    headers: ghHeaders(token),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET release/tags falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

async function createRelease(repo, token) {
  const r = await fetch(`${API}/repos/${repo}/releases`, {
    method: "POST",
    headers: ghHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      tag_name: TAG,
      name: "Reels media (transiente)",
      body: "Hospedagem pública dos mp4 de Reel p/ a Graph API buscar. Assets são transientes (podados após publicação). NÃO é conteúdo do site.",
      draft: false,
      prerelease: true,
      make_latest: "false",
    }),
  });
  if (r.ok) return r.json();
  // Corrida ES/PT: outra run criou primeiro → 422 already_exists → re-busca.
  if (r.status === 422) {
    const existing = await getReleaseByTag(repo, token);
    if (existing) return existing;
  }
  throw new Error(`POST release falhou: ${r.status} ${await r.text()}`);
}

async function ensureRelease(repo, token) {
  return (await getReleaseByTag(repo, token)) || (await createRelease(repo, token));
}

async function uploadAsset(repo, token, releaseId, name, data) {
  const url = `${UPLOADS}/repos/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: ghHeaders(token, { "Content-Type": "video/mp4" }),
    body: data,
  });
  if (!r.ok) throw new Error(`upload asset falhou: ${r.status} ${await r.text()}`);
  return r.json();
}

// Poda assets antigos (fora dos KEEP mais novos E com mais de HOURS horas).
// Best-effort: qualquer erro aqui é logado e ignorado — nunca derruba o publish.
async function pruneOldAssets(repo, token, release) {
  try {
    const assets = (release.assets || [])
      .filter((a) => /\.mp4$/i.test(a.name))
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const cutoff = Date.now() - HOURS * 3600 * 1000;
    const stale = assets
      .slice(KEEP)
      .filter((a) => new Date(a.created_at).getTime() < cutoff);
    for (const a of stale) {
      const r = await fetch(`${API}/repos/${repo}/releases/assets/${a.id}`, {
        method: "DELETE",
        headers: ghHeaders(token),
      });
      console.error(`[upload-release] podado ${a.name} → ${r.status}`);
    }
    if (stale.length) console.error(`[upload-release] ${stale.length} asset(s) antigos podados.`);
  } catch (e) {
    console.error("[upload-release] poda falhou (ignorado):", e.message);
  }
}

async function main() {
  const token = (process.env.GITHUB_TOKEN || "").trim();
  const repo = (process.env.GITHUB_REPOSITORY || "").trim(); // owner/repo
  if (!token) { console.error("[upload-release] faltando GITHUB_TOKEN"); process.exit(1); }
  if (!repo || !repo.includes("/")) { console.error("[upload-release] faltando GITHUB_REPOSITORY (owner/repo)"); process.exit(1); }

  const fileArg = process.argv[2];
  const filePath = fileArg ? resolve(process.cwd(), fileArg) : resolve(ROOT, "out", "reel.mp4");
  const data = readFileSync(filePath);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `reel-${stamp}.mp4`;

  console.error(`[upload-release] release tag=${TAG} em ${repo} …`);
  const release = await ensureRelease(repo, token);

  console.error(`[upload-release] enviando ${filePath} (${(data.length / 1e6).toFixed(1)} MB) → ${name} …`);
  const asset = await uploadAsset(repo, token, release.id, name, data);

  // URL pública estável e previsível (não depende do id do asset).
  const publicUrl = `https://github.com/${repo}/releases/download/${TAG}/${name}`;
  console.error(`[upload-release] concluído: ${publicUrl}`);
  console.error(`[upload-release] (api url: ${asset.browser_download_url})`);

  await pruneOldAssets(repo, token, release);

  // Só a URL limpa no stdout (última linha) — o CI captura isso.
  console.log(publicUrl);
}

main().catch((err) => {
  console.error("[upload-release] erro:", err);
  process.exit(1);
});
