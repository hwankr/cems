type SupabaseEnvSource = Record<string, string | undefined>;

export type SupabaseEnvResult =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; missing: string[] };

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

export function readSupabaseEnv(source: SupabaseEnvSource): SupabaseEnvResult {
  const url = source[URL_KEY];
  const anonKey = source[ANON_KEY];
  const missing: string[] = [];

  if (!url) missing.push(URL_KEY);
  if (!anonKey) missing.push(ANON_KEY);

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return { ok: true, url: url as string, anonKey: anonKey as string };
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const result = readSupabaseEnv({
    [URL_KEY]: process.env[URL_KEY],
    [ANON_KEY]: process.env[ANON_KEY],
  });

  if (!result.ok) {
    throw new Error(
      `Missing Supabase environment variables: ${result.missing.join(", ")}`,
    );
  }

  return { url: result.url, anonKey: result.anonKey };
}
