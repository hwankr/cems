import { createBrowserSupabaseClient } from "@/features/account/supabase/client";
import type { EstateTableClient } from "./supabase-estate-repository";

export function createEstateTableClient(): EstateTableClient {
  const supabase = createBrowserSupabaseClient();

  return {
    async select(subjectId) {
      const { data, error } = await supabase
        .from("estates")
        .select("snapshot, version")
        .eq("subject_id", subjectId)
        .maybeSingle();

      return {
        data: data ? { snapshot: data.snapshot, version: data.version } : null,
        error: error ? { message: error.message } : null,
      };
    },
    async save({ subjectId, snapshot, expectedVersion }) {
      // Server-authoritative write: owner group, budget, and concurrency are
      // all enforced inside the save_estate SECURITY DEFINER function.
      const { data, error } = await supabase.rpc("save_estate", {
        p_subject_id: subjectId,
        p_snapshot: snapshot,
        p_expected_version: expectedVersion,
      });

      if (error) {
        return {
          data: null,
          error: {
            message: error.message,
            conflict: /conflict/i.test(error.message),
          },
        };
      }

      return { data: { version: data as number }, error: null };
    },
    async remove(subjectId) {
      const { error } = await supabase
        .from("estates")
        .delete()
        .eq("subject_id", subjectId);

      return { error: error ? { message: error.message } : null };
    },
  };
}
