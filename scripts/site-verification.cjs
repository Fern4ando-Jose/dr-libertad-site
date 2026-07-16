// ─── Verificação de propriedade do domínio (signature file) ───────────────────
// Painéis de desenvolvedor (TikTok, e o mesmo padrão em Google/Meta) provam que
// o domínio é nosso de um destes jeitos: um registro DNS, ou um "signature file"
// — um .txt de uma linha, com um código que ELES geram, servido na raiz do site.
// Este arquivo é o mecanismo do 2º jeito, parametrizado por ambiente: o código
// ainda não existe (só sai do painel), mas o caminho já está pronto e testado.
//
// Como ligar quando o código chegar (2 envs na Vercel, Production + Preview):
//   SITE_VERIFICATION_FILENAME = tiktokXXXXXXXXXXXXXXXX.txt   ← nome que o painel manda usar
//   SITE_VERIFICATION_CONTENT  = tiktok-developers-site-verification=XXXX  ← conteúdo exato
// O next.config.js lê o nome e cria o rewrite; /api/site-verification devolve o
// conteúdo como text/plain, byte a byte.
//
// ⚠️ Setar as envs NÃO basta: o rewrite é gravado no manifesto em tempo de BUILD,
// então é preciso REDEPLOY depois de criá-las (sem ele o .txt continua 404).
// Só o CONTEÚDO é lido em runtime.
//
// Alternativa equivalente e sem env: commitar o arquivo em `public/`. Continua
// funcionando — os rewrites do Next rodam DEPOIS de `public/`, então um arquivo
// real ali simplesmente ganha do rewrite (não conflita).
//
// CommonJS de propósito: o next.config.js (CJS) precisa dele em tempo de build,
// e o teste (src/lib/site-verification.invariants.test.ts) usa a MESMA
// implementação — sem duplicar a regra em dois lugares (não dessincroniza).

// Nome de arquivo seguro: só o que um signature file usa, sem barra nem "..".
// Barrar isto importa: o nome vira a `source` de um rewrite, e um valor torto
// (ex.: "../../etc") viraria uma rota que não queremos publicar.
const SAFE_FILENAME = /^[A-Za-z0-9._-]+\.txt$/;

/** @param {string|undefined|null} name */
function isValidFilename(name) {
  return typeof name === "string" && name !== ".." && SAFE_FILENAME.test(name);
}

/**
 * O conteúdo servido, byte a byte. O painel compara o arquivo inteiro contra o
 * código que emitiu: espaço em volta ou linha em branco no fim reprovam a
 * verificação — por isso o trim é obrigatório, não estética. Sem env → null
 * (o site sobe igual; a rota devolve 404).
 * @param {Record<string, string | undefined>} env
 */
function verificationBody(env) {
  const raw = env.SITE_VERIFICATION_CONTENT;
  if (typeof raw !== "string") return null;
  const body = raw.trim();
  return body === "" ? null : body;
}

/**
 * Os rewrites do next.config.js. Só existe rewrite quando as DUAS envs estão
 * presentes e o nome é válido — não adianta rotear um arquivo sem conteúdo.
 * @param {Record<string, string | undefined>} env
 */
function verificationRewrites(env) {
  const filename = env.SITE_VERIFICATION_FILENAME;
  if (!isValidFilename(filename)) return [];
  if (verificationBody(env) === null) return [];
  return [{ source: `/${filename}`, destination: "/api/site-verification" }];
}

module.exports = { isValidFilename, verificationBody, verificationRewrites };
