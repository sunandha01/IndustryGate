import Image from "next/image";
import Link from "next/link";
import { getViewer } from "@/lib/viewer";
import { signOut } from "@/lib/actions/auth";

const linkClass = "hover:text-srm-gold transition-colors";

export default async function Navbar() {
  const viewer = await getViewer();

  const home = viewer?.kind === "industry" ? "/mentor" : "/dashboard";
  const displayName =
    viewer && viewer.kind !== "orphan" ? viewer.profile.full_name : null;
  const profileHref = viewer?.kind === "industry" ? "/mentor/profile" : "/profile";

  return (
    <header className="bg-srm-navy text-white sticky top-0 z-10 shadow-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href={home} className="flex items-center gap-3 shrink-0">
          <Image src="/srm-seal.png" alt="SRM" width={36} height={36} />
          <span className="font-semibold text-sm sm:text-base leading-tight">
            Industry Mentor Portal
          </span>
        </Link>

        {viewer?.kind === "campus" && (
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link href="/dashboard" className={linkClass}>
              Feed
            </Link>
            <Link href="/events" className={linkClass}>
              Past Events
            </Link>
            <Link href="/requirements" className={linkClass}>
              Requirements
            </Link>
            <Link href="/industry" className={linkClass}>
              Industry Directory
            </Link>
            {viewer.profile.role === "faculty" && (
              <Link href="/admin" className={linkClass}>
                Manage Club Access
              </Link>
            )}
          </nav>
        )}

        {viewer?.kind === "industry" && (
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link href="/mentor" className={linkClass}>
              Feed
            </Link>
            <Link href="/mentor/profile" className={linkClass}>
              My Profile
            </Link>
          </nav>
        )}

        {viewer && (
          <div className="flex items-center gap-3 shrink-0">
            {displayName && (
              <Link href={profileHref} className={`text-sm ${linkClass}`}>
                {displayName}
              </Link>
            )}
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
