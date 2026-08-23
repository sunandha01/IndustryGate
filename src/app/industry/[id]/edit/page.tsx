import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import type { IndustryProfile } from "@/lib/types";
import { updateIndustryProfile } from "@/app/industry/actions";

export default async function EditIndustryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase.from("industry_profiles").select("*").eq("id", id).single();
  if (!data) notFound();
  const profile = data as IndustryProfile;

  return (
    <div className="max-w-xl">
      <PageHeader title={`Edit ${profile.full_name}`} />
      <Card>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}
        <form action={updateIndustryProfile.bind(null, id)} className="flex flex-col gap-4">
          {formField(
            "Full name",
            <input name="full_name" required defaultValue={profile.full_name} className={inputClass} />
          )}
          {formField(
            "Designation",
            <input name="designation" defaultValue={profile.designation ?? ""} className={inputClass} />
          )}
          {formField(
            "Company",
            <input name="company" defaultValue={profile.company ?? ""} className={inputClass} />
          )}
          {formField(
            "Education",
            <input name="education" defaultValue={profile.education ?? ""} className={inputClass} />
          )}
          {formField(
            "LinkedIn URL",
            <input
              name="linkedin_url"
              type="url"
              defaultValue={profile.linkedin_url ?? ""}
              className={inputClass}
            />
          )}
          {formField(
            "Email",
            <input name="email" type="email" defaultValue={profile.email ?? ""} className={inputClass} />
          )}
          {formField(
            "Phone",
            <input name="phone" defaultValue={profile.phone ?? ""} className={inputClass} />
          )}
          {formField(
            "Domains (comma separated)",
            <input name="domains" defaultValue={profile.domains.join(", ")} className={inputClass} />
          )}
          {formField(
            "Minimum cost they charge (₹)",
            <input
              name="min_cost"
              type="number"
              min="0"
              defaultValue={profile.min_cost ?? ""}
              className={inputClass}
            />
          )}
          {formField(
            "Notes",
            <textarea name="notes" rows={2} defaultValue={profile.notes ?? ""} className={inputClass} />
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
