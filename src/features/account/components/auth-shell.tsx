import { Leaf } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";

type AuthShellProps = {
  brandName: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

/**
 * Illustrated centered card for the auth flow (/login, /onboarding).
 * A warm garden header (gradient sky, sun bloom, the campus building art, a
 * cream wave) curves into a cream card body that slots a form via `children`.
 * Pure presentation — copy comes in as props, so this stays a server component
 * and the slotted form keeps its own client boundary.
 */
export function AuthShell({
  brandName,
  title,
  subtitle,
  children,
}: AuthShellProps) {
  return (
    <div className={styles.page}>
      <svg
        className={styles.pageWaves}
        viewBox="0 0 400 240"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,92 C90,44 150,120 240,82 C320,48 360,98 400,72 L400,240 L0,240 Z"
          fill="#dfe7d2"
          opacity="0.7"
        />
        <path
          d="M0,142 C80,104 170,166 260,132 C330,106 372,142 400,126 L400,240 L0,240 Z"
          fill="#ccd8bc"
          opacity="0.75"
        />
      </svg>

      <div className={`${styles.card} ${styles.reveal}`}>
        <div className={styles.illu}>
          <span className={styles.brandTag}>
            <Leaf strokeWidth={2.2} aria-hidden="true" />
            {brandName}
          </span>
          <span className={styles.illuShadow} aria-hidden="true" />
          <div className={styles.illuArt}>
            <Image
              src="/estate-assets/campus-building-lv3.png"
              alt=""
              fill
              sizes="160px"
              className={styles.illuArtImg}
            />
          </div>
          <svg
            className={styles.illuWave}
            viewBox="0 0 400 60"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0,30 C110,55 250,6 400,33 L400,60 L0,60 Z" />
          </svg>
        </div>

        <div className={styles.body}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
