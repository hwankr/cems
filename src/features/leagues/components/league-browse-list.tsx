"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { LeagueSummary } from "../domain/types";
import { LeagueCard } from "./league-card";
import { JoinLeagueButton } from "./join-league-button";

export function LeagueBrowseList({
  leagues,
  participantCounts,
}: {
  leagues: LeagueSummary[];
  participantCounts: Record<string, number>;
}) {
  const { locale, messages } = useI18n();
  const copy = messages.leagues;
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? leagues.filter((l) => l.name.toLowerCase().includes(q)) : leagues;
  }, [leagues, query]);

  if (leagues.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-ink-subtle">{copy.emptyBrowse}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2">
        <Search className="h-4 w-4 flex-none text-ink-subtle" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.search.placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
        />
      </label>
      {filtered.length === 0 ? (
        <p className="px-1 py-4 text-center text-sm text-ink-subtle">{copy.search.noResults}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              participantCount={participantCounts[league.id] ?? 0}
              href={`/${locale}/leagues/${league.id}`}
              action={<JoinLeagueButton leagueId={league.id} />}
            />
          ))}
        </div>
      )}
    </div>
  );
}
