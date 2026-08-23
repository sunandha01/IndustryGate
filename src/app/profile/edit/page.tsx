import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { updateProfile } from "@/app/profile/actions";

export default async function EditProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile;

  return (
    <div className="max-w-xl">
      <PageHeader title="Edit Profile" />
      <Card>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}
        <form action={updateProfile} className="flex flex-col gap-4">
          {formField(
            "Full name",
            <input name="full_name" required defaultValue={profile.full_name} className={inputClass} />
          )}
          {formField(
            "LinkedIn URL",
            <input name="linkedin_url" type="url" defaultValue={profile.linkedin_url ?? ""} className={inputClass} />
          )}
          {formField("Phone", <input name="phone" defaultValue={profile.phone ?? ""} className={inputClass} />)}
          {formField(
            "Domain of work",
            <input
              name="domain"
              defaultValue={profile.domain ?? ""}
              placeholder="AI/ML, Web Dev, Robotics..."
              className={inputClass}
            />
          )}
          {formField(
            "Department",
            <input name="department" defaultValue={profile.department ?? ""} className={inputClass} />
          )}
          {formField(
            "Experience",
            <textarea
              name="experience"
              rows={3}
              defaultValue={profile.experience ?? ""}
              placeholder="Paste from the SRM staff-finder page, or describe your relevant experience"
              className={inputClass}
            />
          )}

          <button
            type="submit"
            className="mt-2 bg-srm-navy text-white font-semibold rounded-md py-2.5 text-sm hover:bg-srm-navy-dark transition-colors"
          >
            Save changes
          </button>
        </form>
      </Card>
    </div>
  );
}
