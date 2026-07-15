// ─── Upload do reel para o Cloudflare R2 (S3-compatível, GRÁTIS + egress ilimitado) ──
// Substitui o Vercel Blob, que satura o teto grátis da conta INTEIRA e SUSPENDE o
// store → `BlobStoreSuspendedError` (incidente 2026-07-15: as 3 stores da conta
// suspensas de uma vez = limite de conta, NÃO acúmulo de um store). O R2 dá 10 GB
// de storage + transferência de saída ILIMITADA no plano grátis, então o download
// dos mp4 pela Graph API do IG não estoura banda.
//
// O bucket é PÚBLICO (r2.dev ou domínio custom) → a URL do objeto é buscável sem
// auth, que é o que a Graph API precisa em `video_url`. O Content-Type é gravado
// como video/mp4 (o R2 respeita, ao contrário do GitHub Releases que força octet).
//
// Sobe out/reel.mp4 e imprime a URL pública na ÚLTIMA linha do stdout (o resto vai
// p/ stderr — igual ao upload-blob.mjs, p/ o CI capturar `URL=$(node scripts/upload-r2.mjs)`).
//
// Requer no ambiente (do cofre .claude/chaves/<projeto>.env → secrets do CI):
//   R2_ACCOUNT_ID        (id da conta Cloudflare — vira o endpoint S3)
//   R2_ACCESS_KEY_ID     (Access Key do token S3 do R2)
//   R2_SECRET_ACCESS_KEY (Secret do token S3 do R2)
//   R2_BUCKET            (nome do bucket, ex.: reels-dr-libertad)
//   R2_PUBLIC_BASE_URL   (base pública SEM barra final, ex.:
//                         https://pub-xxxx.r2.dev  ou  https://media.drlibertad.com)
//
// Uso:
//   node scripts/upload-r2.mjs                → sobe out/reel.mp4
//   node scripts/upload-r2.mjs caminho/x.mp4  → sobe o arquivo informado

import { AwsClient } from "aws4fetch";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function reqEnv(name) {
  const v = (process.env[name] || "").trim();
  if (!v) {
    console.error(`[upload-r2] faltando ${name} no ambiente (configure o secret do R2 — ver cofre .claude/chaves).`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const accountId = reqEnv("R2_ACCOUNT_ID");
  const accessKeyId = reqEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = reqEnv("R2_SECRET_ACCESS_KEY");
  const bucket = reqEnv("R2_BUCKET");
  const publicBase = reqEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");

  const fileArg = process.argv[2];
  const filePath = fileArg ? resolve(process.cwd(), fileArg) : resolve(ROOT, "out", "reel.mp4");
  const data = readFileSync(filePath);

  // Nome único por execução (mesmo padrão do blob) sob o prefixo reels/.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `reels/reel-${stamp}.mp4`;

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const objectUrl = `${endpoint}/${bucket}/${key}`;

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto", // R2 usa região "auto"
  });

  console.error(`[upload-r2] enviando ${filePath} (${(data.length / 1e6).toFixed(1)} MB) → r2://${bucket}/${key} …`);
  const res = await client.fetch(objectUrl, {
    method: "PUT",
    body: data,
    headers: {
      "content-type": "video/mp4",
      "content-length": String(data.length),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[upload-r2] PUT falhou: ${res.status} ${res.statusText} ${body.slice(0, 400)}`);
    process.exit(1);
  }

  const publicUrl = `${publicBase}/${key}`;
  console.error(`[upload-r2] concluído: ${publicUrl}`);

  // Só a URL limpa no stdout (última linha) — o CI captura isso.
  console.log(publicUrl);
}

main().catch((err) => {
  console.error("[upload-r2] erro:", err);
  process.exit(1);
});
