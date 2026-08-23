import { createClient } from "@/lib/supabase/server";
import type { IndustryProfile, Profile } from "@/lib/types";

// Two kinds of account share one auth system:
//   campus   — students and faculty, a row in `profiles`
//   industry — professionals, a row in `industry_profiles` with user_id set
// RLS makes the "wrong" lookup return nothing, so whichever hits is the answer.
export type Viewer =
  | { kind: "campus"; userId: string; profile: Profile }
  | { kind: "industry"; userId: string; profile: IndustryProfile }
  | { kind: "orphan"; userId: string }
  | null;

export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campus } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (campus) return { kind: "campus", userId: user.id, profile: campus as Profile };

  const { data: industry } = await supabase
    .from("industry_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (industry) {
    return { kind: "industry", userId: user.id, profile: industry as IndustryProfile };
  }

  // Signed in but no profile row — should not happen, but never crash on it.
  return { kind: "orphan", userId: user.id };
}
