import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import { updateIndustryProfile } from "@/app/industry/actions";

export default async function EditMentorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await getViewer();
  if (viewer?.kind !== "industry") redirect("/mentor");
  const me = viewer.profile;

  return (
    <div className="max-w-xl">
      <PageHeader title="Edit My Profile" />
      <Card>
        <p className="text-sm text-gray-500 mb-4">
          Keeping this current helps SRM faculty match you to the right events.
        </p>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}
        <form
          action={updateIndustryProfile.bind(null, me.id, "/mentor/profile")}
          className="flex flex-col gap-4"
        >
          {formField(
            "Full name",
            <input name="full_name" required defaultValue={me.full_name} className={inputClass} />
          )}
          {formField(
            "Designation",
            <input name="designation" defaultValue={me.designation ?? ""} className={inputClass} />
          )}
          {formField(
            "Company",
            <input name="company" defaultValue={me.company ?? ""} className={inputClass} />
          )}
          {formField(
            "Domain (comma separated)",
            <input
              name="domains"
              defaultValue={me.domains.join(", ")}
              placeholder="AI/ML, Cloud, Product"
              className={inputClass}
            />
          )}
          {formField(
            "LinkedIn profile",
            <input
              name="linkedin_url"
              type="url"
              defaultValue={me.linkedin_url ?? ""}
              className={inputClass}
            />
          )}
          {formField(
            "Email",
            <input name="email" type="email" defaultValue={me.email ?? ""} className={inputClass} />
          )}
          {formField(
            "Phone",
            <input name="phone" defaultValue={me.phone ?? ""} className={inputClass} />
          )}
          {formField(
            "Education",
            <input name="education" defaultValue={me.education ?? ""} className={inputClass} />
          )}
          {formField(
            "Minimum cost you charge (₹)",
            <input
              name="min_cost"
              type="number"
              min="0"
              defaultValue={me.min_cost ?? ""}
              className={inputClass}
            />
          )}
          {formField(
            "Notes",
            <textarea name="notes" rows={2} defaultValue={me.notes ?? ""} className={inputClass} />
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
