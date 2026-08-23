import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

// Everything under /mentor is for industry professionals only.
export default async function MentorLayout({ children }: LayoutProps<"/mentor">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.kind === "campus") redirect("/dashboard");

  if (viewer.kind === "orphan") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <h1 className="text-lg font-semibold text-srm-navy">Account not set up</h1>
        <p className="text-sm text-gray-500 mt-2">
          Your sign-in worked, but no profile is attached to it. Ask the SRM team to add you to
          the industry directory with this email address.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
