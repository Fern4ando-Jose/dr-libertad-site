import type { Metadata } from "next";

// As três páginas do painel são componentes de cliente e, por isso, não podem
// exportar `metadata` elas mesmas. O noindex mora aqui e vale para todas: painel
// interno não tem por que aparecer em resultado de busca.
export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
