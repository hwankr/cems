import { describe, expect, it } from "vitest";
import { readSupabaseEnv } from "../supabase/env";

describe("readSupabaseEnv", () => {
  it("returns url and anonKey when both are present", () => {
    const result = readSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(result).toEqual({
      ok: true,
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("reports every missing variable name", () => {
    const result = readSupabaseEnv({});

    expect(result).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("treats empty strings as missing", () => {
    const result = readSupabaseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(result).toEqual({ ok: false, missing: ["NEXT_PUBLIC_SUPABASE_URL"] });
  });
});
