import { Leaf, Sprout, Star, Zap } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";

type AuthShellProps = {
  brandName: string;
  eyebrow: string;
  tagline: string;
  values: { measure: string; earn: string; grow: string };
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Brand-split shell for the auth flow (/login, /signup, /onboarding).
 * Left: warm garden brand panel (desktop) / compact band (mobile).
 * Right: cream form column that slots a form via `children`.
 * Pure presentation — copy comes in as props, so this stays a server
 * component and the slotted form keeps its own client boundary.
 */
export function AuthShell({
  brandName,
  eyebrow,
  tagline,
  values,
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <aside className={styles.brand}>
        <div className={styles.brandInner}>
          <div className={`${styles.brandTop} ${styles.reveal} ${styles.reveal1}`}>
            <span className={styles.brandMark}>
              <span className={styles.brandIcon}>
                <Leaf strokeWidth={2.2} />
              </span>
              <span className={styles.wordmark}>{brandName}</span>
            </span>
            <p className={styles.eyebrow}>{eyebrow}</p>
          </div>

          <div className={`${styles.brandBody} ${styles.reveal} ${styles.reveal2}`}>
            <p className={styles.tagline}>{tagline}</p>
            <ul className={styles.values}>
              <li className={styles.valueChip}>
                <Zap aria-hidden="true" />
                {values.measure}
              </li>
              <li className={styles.valueChip}>
                <Star aria-hidden="true" />
                {values.earn}
              </li>
              <li className={styles.valueChip}>
                <Sprout aria-hidden="true" />
                {values.grow}
              </li>
            </ul>
          </div>

          <div className={`${styles.art} ${styles.reveal} ${styles.reveal3}`}>
            <Image
              src="/estate-assets/campus-building-lv3.png"
              alt=""
              fill
              sizes="(max-width: 767px) 0px, 460px"
              className={styles.artImg}
            />
          </div>
        </div>
      </aside>

      <main className={styles.formCol}>
        <div className={styles.formInner}>
          <header>
            <h1 className={`${styles.title} ${styles.reveal} ${styles.reveal1}`}>
              {title}
            </h1>
            {subtitle ? (
              <p className={`${styles.subtitle} ${styles.reveal} ${styles.reveal2}`}>
                {subtitle}
              </p>
            ) : null}
          </header>
          <div className={`${styles.formSlot} ${styles.reveal} ${styles.reveal3}`}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
