import { notFound } from "next/navigation";

// Qualquer endereço inexistente sob /br ou /es cai aqui — e daqui vai para o
// not-found.tsx do segmento de idioma, que é uma página com a cara do site.
//
// Sem esta rota, /br/endereco-errado não casava com NADA e o Next servia a tela
// crua do framework: um <html> sem lang, sem navegação e sem caminho de volta.
// Rota curinga é a de menor precedência no App Router, então ela só entra
// depois de todas as páginas de verdade terem sido descartadas.
//
// O status continua sendo 404 — quem devolve é o notFound().
export default function CatchAll(): never {
  notFound();
}
