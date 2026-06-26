// ─── Limpeza do Vercel Blob (reels/) ──────────────────────────────────────────
// O pipeline sobe cada Reel mp4 pro Blob (intermediário p/ a Graph API ler) e NUNCA
// apagava → acumulou até estourar o teto de 1GB do plano Hobby → o upload começa a
// FALHAR e nenhum Reel publica (incidente 26/06). Os mp4 em `reels/` são TRANSIENTES:
// depois que o /api/publish-reel os consome, o Instagram hospeda a própria cópia —
// a do Blob não serve mais pra nada. Este script poda os antigos.
//
// Política: apaga tudo em `reels/` com mais de HORAS horas (default 48h — folga p/
// qualquer publish em andamento). `--keep=N` força manter os N mais novos mesmo
// assim. `--dry` só lista, não apaga. Precisa de BLOB_READ_WRITE_TOKEN (secret do CI).
import { list, del } from "@vercel/blob";

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const DRY = process.argv.includes("--dry");
const HOURS = Number(arg("hours", "48")) || 48;
const KEEP = Number(arg("keep", "6")) || 6; // nunca apaga os N mais recentes
const PREFIX = arg("prefix", "reels/");

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("[clean-blob] BLOB_READ_WRITE_TOKEN ausente"); process.exit(1);
}

async function main() {
  // Pagina todos os blobs do prefixo.
  const all = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    all.push(...page.blobs);
    cursor = page.cursor;
  } while (cursor);

  const totalMB = all.reduce((s, b) => s + (b.size || 0), 0) / 1e6;
  console.log(`[clean-blob] ${all.length} blobs em "${PREFIX}" (~${totalMB.toFixed(1)} MB)`);

  // Mais novos primeiro; protege os KEEP mais recentes.
  const sorted = all.slice().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const protectedSet = new Set(sorted.slice(0, KEEP).map((b) => b.url));
  const cutoff = Date.now() - HOURS * 3600 * 1000;

  const toDelete = sorted.filter(
    (b) => !protectedSet.has(b.url) && new Date(b.uploadedAt).getTime() < cutoff,
  );
  const freedMB = toDelete.reduce((s, b) => s + (b.size || 0), 0) / 1e6;

  console.log(
    `[clean-blob] apagar ${toDelete.length} (> ${HOURS}h, fora dos ${KEEP} mais novos) → libera ~${freedMB.toFixed(1)} MB${DRY ? "  [DRY-RUN]" : ""}`,
  );
  if (DRY || !toDelete.length) { console.log("[clean-blob] nada feito."); return; }

  // del aceita array de URLs; fatia em lotes p/ não estourar payload.
  for (let i = 0; i < toDelete.length; i += 100) {
    await del(toDelete.slice(i, i + 100).map((b) => b.url));
    console.log(`[clean-blob] apagados ${Math.min(i + 100, toDelete.length)}/${toDelete.length}`);
  }
  console.log(`[clean-blob] concluído. Liberados ~${freedMB.toFixed(1)} MB.`);
}

main().catch((e) => { console.error("[clean-blob] erro:", e); process.exit(1); });
