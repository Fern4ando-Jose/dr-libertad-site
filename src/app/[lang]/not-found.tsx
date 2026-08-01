import Link from "next/link";
import StudioContainer from "@/components/ui/Container";

// 404 com a cara do site. O Next já devolvia o código certo (404, não um
// "soft 404" com status 200), então isto é sobre não perder a visita: em vez da
// tela crua do framework, o leitor recebe duas portas de volta.
//
// Sem texto por idioma porque a página de erro não recebe o parâmetro de rota —
// as duas saídas aparecem juntas, e cada uma fala a sua língua.
export default function NotFound() {
  return (
    <main className="relative z-10">
      <StudioContainer>
        <div className="flex min-h-[70vh] flex-col justify-center py-28">
          <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">Erro 404</div>
          <h1 className="mt-5 max-w-[18ch] font-serif text-[clamp(2.3rem,5vw,4.4rem)] leading-[0.98] tracking-[-0.04em] text-pretty">
            Esta página não existe.
          </h1>
          <p className="mt-6 max-w-xl text-[1.02rem] leading-[1.8] text-warm-gray/90">
            O endereço pode ter mudado — ou nunca ter existido. Esta página no está aquí, pero el
            estudio sí.
          </p>
          <div className="mt-7 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/br"
              className="rounded-full border border-warm-gray/25 px-6 py-3 text-xs tracking-[0.18em] uppercase transition-colors hover:border-warm-gray/60"
            >
              Ir para o início
            </Link>
            <Link
              href="/es"
              className="rounded-full border border-warm-gray/25 px-6 py-3 text-xs tracking-[0.18em] uppercase transition-colors hover:border-warm-gray/60"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </StudioContainer>
    </main>
  );
}
