import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { signOut } from "@/lib/actions/auth";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Pick<Profile, "full_name" | "role"> | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    profile = data as Pick<Profile, "full_name" | "role"> | null;
  }

  return (
    <header className="bg-srm-navy text-white sticky top-0 z-10 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
          <Image src="/srm-seal.png" alt="SRM" width={36} height={36} />
          <span className="font-semibold text-sm sm:text-base leading-tight">
            Industry Mentor Portal
          </span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-srm-gold transition-colors">
              Feed
            </Link>
            <Link href="/events" className="hover:text-srm-gold transition-colors">
              Past Events
            </Link>
            <Link href="/requirements" className="hover:text-srm-gold transition-colors">
              Requirements
            </Link>
            <Link href="/industry" className="hover:text-srm-gold transition-colors">
              Industry Directory
            </Link>
            {profile?.role === "faculty" && (
              <Link href="/admin" className="hover:text-srm-gold transition-colors">
                Manage Club Access
              </Link>
            )}
          </nav>
        )}

        {user && (
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/profile" className="text-sm hover:text-srm-gold transition-colors">
              {profile?.full_name ?? user.email}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm bg-srm-gold text-srm-navy-dark font-semibold px-3 py-1.5 rounded-md hover:bg-srm-gold-dark hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
