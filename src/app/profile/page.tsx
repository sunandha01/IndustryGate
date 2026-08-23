import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, NewButton, PageHeader } from "@/components/ui";
import type { Profile } from "@/lib/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile;

  return (
    <div className="max-w-xl">
      <PageHeader title="My Profile" action={<NewButton href="/profile/edit" label="Edit" />} />
      <Card>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg text-srm-navy">{profile.full_name}</h2>
          <Badge>{profile.role}</Badge>
          {profile.is_club_authorized && <Badge>Club authorized</Badge>}
        </div>
        <p className="text-sm text-gray-500">{profile.email}</p>

        <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          {profile.department && (
            <div>
              <dt className="text-gray-400">Department</dt>
              <dd className="text-gray-700">{profile.department}</dd>
            </div>
          )}
          {profile.domain && (
            <div>
              <dt className="text-gray-400">Domain</dt>
              <dd className="text-gray-700">{profile.domain}</dd>
            </div>
          )}
          {profile.phone && (
            <div>
              <dt className="text-gray-400">Phone</dt>
              <dd className="text-gray-700">{profile.phone}</dd>
            </div>
          )}
          {profile.linkedin_url && (
            <div>
              <dt className="text-gray-400">LinkedIn</dt>
              <dd>
                <a href={profile.linkedin_url} target="_blank" className="text-srm-navy underline">
                  View profile
                </a>
              </dd>
            </div>
          )}
        </dl>
        {profile.experience && (
          <div className="mt-4">
            <p className="text-gray-400 text-sm">Experience</p>
            <p className="text-sm text-gray-700 mt-1">{profile.experience}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
