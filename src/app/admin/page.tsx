import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, PageHeader } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { setClubAuthorized } from "./actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "faculty") redirect("/dashboard");

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("full_name", { ascending: true });

  const students = (data ?? []) as Profile[];

  return (
    <div>
      <PageHeader title="Manage Club Access" />
      <p className="text-sm text-gray-500 mb-6">
        Authorize the club members who can post events, requirements, and industry contacts on
        behalf of your department.
      </p>

      <div className="flex flex-col gap-3">
        {students.map((student) => (
          <Card key={student.id}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-srm-navy">{student.full_name}</p>
                <p className="text-sm text-gray-500">{student.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {student.is_club_authorized && <Badge>Authorized</Badge>}
                <form action={setClubAuthorized.bind(null, student.id, !student.is_club_authorized)}>
                  <button
                    type="submit"
                    className="text-sm font-medium px-3 py-1.5 rounded-md border border-srm-navy text-srm-navy hover:bg-srm-navy hover:text-white transition-colors"
                  >
                    {student.is_club_authorized ? "Revoke" : "Authorize"}
                  </button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
