export function MapLoadingFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-inset text-ink">
      <div
        className="absolute inset-0 opacity-50"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div className="absolute inset-0 grid place-items-center p-6">
        <div
          role="status"
          aria-live="polite"
          className="grid justify-items-center gap-3 text-center"
        >
          <span
            aria-hidden="true"
            className="h-9 w-9 animate-spin rounded-full border-2 border-accent border-r-transparent"
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              지도를 불러오는 중
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              캠퍼스 건물 정보를 준비하고 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
