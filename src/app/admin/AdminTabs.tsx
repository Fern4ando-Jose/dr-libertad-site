"use client";

// ─── Abas do painel ───────────────────────────────────────────────────────────
// O painel nasceu como páginas soltas (/admin/comentarios, /admin/reprovadas) e o
// dono tinha que decorar o endereço de cada uma. Aqui fica a navegação única — toda
// aba nova entra NESTA lista e aparece nas outras telas automaticamente.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/pesquisa", label: "Pesquisa" },
  { href: "/admin/comentarios", label: "Comentários" },
  { href: "/admin/reprovadas", label: "Capas reprovadas" },
] as const;

/**
 * `variant` porque o painel tem duas peles: as telas novas são escuras (tokens da
 * marca) e a de capas reprovadas é clara (estilo inline). Mesma navegação, sem
 * texto creme sumindo no fundo branco.
 */
export default function AdminTabs({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const pathname = usePathname();
  const dark = variant === "dark";
  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Painel">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        const cls = active
          ? dark
            ? "bg-muted-red text-offwhite"
            : "bg-[#0B0B0C] text-white"
          : dark
            ? "border border-warm-gray/20 text-warm-gray/80 hover:border-warm-gray/40 hover:text-offwhite"
            : "border border-black/15 text-black/60 hover:border-black/35 hover:text-black";
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-xs uppercase tracking-[0.14em] transition ${cls}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
