import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "../supabase/server";
import type {
  AccountProfile,
  GroupOption,
  SchoolOption,
} from "../domain/types";
import { sumPersonalPoints, type PointEvent } from "../domain/points";
import {
  calculateGroupPointPool,
  type GroupContribution,
  type GroupPointPool,
} from "../domain/group-pool";

type PointEventRow = {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  period_label: string;
  created_at: string;
};

function toPointEvents(rows: PointEventRow[]): PointEvent[] {
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    points: row.points,
    reason: row.reason,
    periodLabel: row.period_label,
    createdAt: row.created_at,
  }));
}

export const getCurrentUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
});

export const getCurrentProfile = cache(
  async (): Promise<AccountProfile | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, school_id, group_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw new Error(`Failed to load profile: ${error.message}`);
    if (!data) return null;

    return {
      userId: data.id,
      displayName: data.display_name,
      schoolId: data.school_id,
      groupId: data.group_id,
    };
  },
);

export async function getSchoolOptions(): Promise<SchoolOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, short_name")
    .order("name");

  if (error) throw new Error(`Failed to load schools: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name,
  }));
}

export async function getGroupOptions(): Promise<GroupOption[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, school_id, name, type")
    .order("name");

  if (error) throw new Error(`Failed to load groups: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    name: row.name,
    type: row.type as GroupOption["type"],
  }));
}

export async function getPersonalPointTotal(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("point_events")
    .select("id, user_id, points, reason, period_label, created_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to load personal points: ${error.message}`);
  }

  return sumPersonalPoints(toPointEvents((data ?? []) as PointEventRow[]));
}

export async function getGroupPointPool(
  groupId: string,
): Promise<GroupPointPool> {
  const supabase = await createServerSupabaseClient();
  // RLS scopes point_events to the current user's group, so a join through
  // profiles returns exactly this group's members' events.
  const { data, error } = await supabase
    .from("point_events")
    .select(
      "id, user_id, points, reason, period_label, created_at, profiles!inner(group_id)",
    )
    .eq("profiles.group_id", groupId);

  if (error) throw new Error(`Failed to load group pool: ${error.message}`);

  const events = toPointEvents((data ?? []) as unknown as PointEventRow[]);

  const byUser = new Map<string, number>();
  for (const event of events) {
    byUser.set(event.userId, (byUser.get(event.userId) ?? 0) + event.points);
  }
  const contributions: GroupContribution[] = [...byUser.entries()].map(
    ([userId, points]) => ({ userId, points }),
  );

  return calculateGroupPointPool(groupId, contributions);
}

export async function getMyPointEvents(userId: string): Promise<PointEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("point_events")
    .select("id, user_id, points, reason, period_label, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(`Failed to load point events: ${error.message}`);
  return toPointEvents((data ?? []) as PointEventRow[]);
}

export async function getGroupEstateSubjectId(
  groupId: string,
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("estate_subjects")
    .select("subject_id")
    .eq("owner_group_id", groupId)
    .order("subject_id")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`Failed to load group estate subject: ${error.message}`);
  }
  return (data as { subject_id: string } | null)?.subject_id ?? null;
}
