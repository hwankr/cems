"use client";

import { Building2, Sparkles, Trophy } from "lucide-react";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import {
  signInDemoGuestAction,
  type DemoGuestActionState,
} from "../actions/auth";
import type { DemoGuestPersona } from "../demo/demo-guest-personas";
import styles from "./auth-shell.module.css";

const initialState: DemoGuestActionState = { error: null };

function DemoIcon({ guest }: { guest: DemoGuestPersona }) {
  if (guest.icon === "trophy") return <Trophy aria-hidden="true" />;
  if (guest.icon === "sparkles") return <Sparkles aria-hidden="true" />;
  return <Building2 aria-hidden="true" />;
}

function DemoGuestCard({
  guest,
  next,
}: {
  guest: DemoGuestPersona;
  next?: string;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.account.demoGuest;
  const personaCopy = copy.personas[guest.key];
  const action = signInDemoGuestAction.bind(null, guest.key);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.demoGuestForm}>
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button type="submit" disabled={pending} className={styles.demoGuestCard}>
        <span className={styles.demoGuestIcon}>
          <DemoIcon guest={guest} />
        </span>
        <span className={styles.demoGuestText}>
          <span className={styles.demoGuestTitle}>{personaCopy.title}</span>
          <span className={styles.demoGuestMeta}>{personaCopy.meta}</span>
        </span>
        <span className={styles.demoGuestAction}>
          {pending ? copy.entering : copy.enter}
        </span>
      </button>
      {state.error ? (
        <p className={styles.demoGuestError}>{copy.errors[state.error]}</p>
      ) : null}
    </form>
  );
}

export function DemoGuestEntryClient({
  guests,
  next,
}: {
  guests: readonly DemoGuestPersona[];
  next?: string;
}) {
  const { messages } = useI18n();
  const copy = messages.account.demoGuest;

  return (
    <section className={styles.demoGuestSection} aria-label={copy.title}>
      <div className={styles.demoGuestHeader}>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <div className={styles.demoGuestList}>
        {guests.map((guest) => (
          <DemoGuestCard key={guest.key} guest={guest} next={next} />
        ))}
      </div>
    </section>
  );
}
