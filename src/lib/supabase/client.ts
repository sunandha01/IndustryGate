import { createBrowserClient } from "@supabase/ssr";

// No generated `Database` type yet (see src/lib/types.ts) — table calls are
// untyped until `supabase gen types` is run against the linked project.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
