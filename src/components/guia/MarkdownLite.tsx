import React from "react";

// Renderizador mínimo e seguro (sem HTML cru) para o subconjunto de markdown que o
// conteúdo do guia usa: parágrafos (linha em branco), **negrito** e *itálico*.
// Não interpreta links/imagens/HTML — só texto formatado. Constrói nós React.

function inline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Alterna por **negrito** e *itálico*. Regex captura os dois.
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(<strong key={`${keyBase}-b${i}`}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={`${keyBase}-i${i}`}>{m[3]}</em>);
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Divide um bloco em parágrafos e renderiza cada um com inline(). */
export function MarkdownLite({ text, className }: { text: string; className?: string }) {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paras.map((p, idx) => (
        <p key={idx} className={className}>
          {inline(p, `p${idx}`)}
        </p>
      ))}
    </>
  );
}

/** Renderiza uma linha única com inline (para ação/armadilha curtas). */
export function InlineText({ text }: { text: string }) {
  return <>{inline(text, "il")}</>;
}
