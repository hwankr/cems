import { Sparkles } from "lucide-react";
import type { CharacterProgress } from "../domain/types";

type CharacterCardProps = {
  progress: CharacterProgress;
  points: number;
};

export function CharacterCard({ progress, points }: CharacterCardProps) {
  return (
    <section className="border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center bg-emerald-700 text-white">
          <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {progress.title}
          </p>
          <h2 className="text-2xl font-semibold text-emerald-950">
            Level {progress.level}
          </h2>
        </div>
      </div>
      <p className="mt-4 text-sm text-emerald-900">
        {points.toLocaleString()} total energy points
      </p>
      <div className="mt-3 h-3 bg-emerald-100">
        <div
          className="h-3 bg-emerald-600"
          style={{ width: `${progress.progressRate * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-emerald-800">
        {progress.currentLevelPoints} / {progress.nextLevelPoints} points to
        next level
      </p>
    </section>
  );
}
