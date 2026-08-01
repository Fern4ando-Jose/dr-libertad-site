import Image from "next/image";
import styles from "./book3d.module.css";

// Capa que parece livro impresso: recebe a arte que o site já tem e monta o
// volume (lombada, folhas, contracapa, sombra) em CSS — ver book3d.module.css.
export default function Book3D({
  src,
  alt,
  width,
  height,
  spineText,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  /** Medida do arquivo — reserva o espaço e evita o salto de layout (CLS). */
  width: number;
  height: number;
  spineText?: string;
  /** Largura que a capa ocupa na tela, por breakpoint (ver next/image). */
  sizes?: string;
  /** Só na capa que abre a página: pré-carrega em vez de deixar para depois. */
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`${styles.scene} ${className ?? ""}`}>
      <div className={styles.book}>
        {/* next/image: serve AVIF/WebP no tamanho da tela em vez do PNG cru.
            A capa costuma ser o maior elemento da página (o LCP), então é ela
            que decide a nota de velocidade — e velocidade conta como sinal. */}
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className={styles.cover}
        />
        <div className={styles.hinge} aria-hidden="true" />
        <div className={styles.spine} aria-hidden="true">
          {spineText ? <span className={styles.spineText}>{spineText}</span> : null}
        </div>
        <div className={styles.pages} aria-hidden="true" />
        <div className={styles.back} aria-hidden="true" />
      </div>
      <div className={styles.floor} aria-hidden="true" />
    </div>
  );
}
