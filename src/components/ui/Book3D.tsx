import styles from "./book3d.module.css";

// Capa que parece livro impresso: recebe a arte que o site já tem e monta o
// volume (lombada, folhas, contracapa, sombra) em CSS — ver book3d.module.css.
export default function Book3D({
  src,
  alt,
  spineText,
  className,
}: {
  src: string;
  alt: string;
  spineText?: string;
  className?: string;
}) {
  return (
    <div className={`${styles.scene} ${className ?? ""}`}>
      <div className={styles.book}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={styles.cover} />
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
