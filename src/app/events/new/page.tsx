import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import { createPastEvent } from "@/app/events/actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; industry?: string }>;
}) {
  const { error, industry } = await searchParams;
  const supabase = await createClient();

  const { data: contacts } = await supabase
    .from("industry_profiles")
    .select("id, full_name, company")
    .order("full_name", { ascending: true });

  const options = (contacts ?? []) as { id: string; full_name: string; company: string | null }[];

  return (
    <div className="max-w-xl">
      <PageHeader title="Log a Past Event" />
      <Card>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}
        <form action={createPastEvent} className="flex flex-col gap-4">
          {formField(
            "Event name",
            <input name="name" required className={inputClass} placeholder="Hackfest 2025" />
          )}
          {formField(
            "Domain",
            <input name="domain" required className={inputClass} placeholder="AI/ML, Web Dev, Robotics..." />
          )}

          <div className="grid grid-cols-2 gap-4">
            {formField("Start date", <input name="start_date" type="date" className={inputClass} />)}
            {formField("End date", <input name="end_date" type="date" className={inputClass} />)}
          </div>

          {formField(
            "Prize pool (₹)",
            <input name="prize_pool" type="number" min="0" className={inputClass} />
          )}
          {formField(
            "Sponsorship details",
            <textarea name="sponsorship_details" rows={2} className={inputClass} />
          )}

          <fieldset className="border border-card-border rounded-lg p-4">
            <legend className="text-sm font-semibold text-srm-navy px-1">Industry guest</legend>

            {formField(
              "Pick from the directory",
              <select name="industry_id" defaultValue={industry ?? ""} className={inputClass}>
                <option value="">— Not in the directory / add below —</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                    {c.company ? ` (${c.company})` : ""}
                  </option>
                ))}
              </select>
            )}

            <div className="mt-3">
              {formField(
                "Their role at this event",
                <input
                  name="industry_role"
                  className={inputClass}
                  placeholder="Judge, chief guest, sponsor"
                />
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4 mb-2">
              Not in the list? Fill this in instead and they&apos;ll be added to the directory.
            </p>
            <div className="flex flex-col gap-3">
              {formField("Name", <input name="new_industry_name" className={inputClass} />)}
              {formField("Designation", <input name="new_industry_designation" className={inputClass} />)}
              {formField("Company", <input name="new_industry_company" className={inputClass} />)}
              {formField("Email", <input name="new_industry_email" type="email" className={inputClass} />)}
              {formField(
                "LinkedIn URL",
                <input name="new_industry_linkedin" type="url" className={inputClass} />
              )}
            </div>
          </fieldset>

          {formField("Notes", <textarea name="notes" rows={2} className={inputClass} />)}

          <button
            type="submit"
            className="mt-2 bg-srm-navy text-white font-semibold rounded-md py-2.5 text-sm hover:bg-srm-navy-dark transition-colors"
          >
            Save event
          </button>
        </form>
      </Card>
    </div>
  );
}
