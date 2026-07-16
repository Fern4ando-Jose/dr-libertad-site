import { NextResponse } from "next/server";
import { verificationBody } from "../../../../scripts/site-verification.cjs";

// Serve o signature file de verificação de propriedade do domínio.
//
// Ninguém acessa esta rota por este caminho: o next.config.js cria um rewrite do
// nome que o painel exige (ex.: /tiktokXXXX.txt) para cá — o painel busca o .txt
// na raiz e tem de receber o código EXATO, byte a byte. A regra (e o formato das
// envs) mora em scripts/site-verification.cjs, com teste invariante.
//
// Sem as envs configuradas → 404: nada a verificar, e é melhor não existir do que
// existir vazio (um arquivo em branco REPROVA a verificação no painel).

export const dynamic = "force-dynamic";

export function GET() {
  const body = verificationBody(process.env);
  if (body === null) {
    return new NextResponse("Not Found", { status: 404 });
  }
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
