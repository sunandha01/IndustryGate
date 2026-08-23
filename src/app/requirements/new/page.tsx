import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import { createRequirement } from "@/app/requirements/actions";

export default async function NewRequirementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <PageHeader title="Post a Requirement" />
      <Card>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}
        <form action={createRequirement} className="flex flex-col gap-4">
          {formField(
            "Domain",
            <input name="domain" required className={inputClass} placeholder="AI/ML, Web Dev, Robotics..." />
          )}
          {formField("Event date", <input name="event_date" type="date" className={inputClass} />)}
          {formField(
            "Sponsorship needed",
            <input name="sponsorship_needed" className={inputClass} placeholder="Cash, goodies, venue..." />
          )}
          {formField(
            "Prize pool (₹)",
            <input name="prize_pool" type="number" min="0" className={inputClass} />
          )}
          {formField(
            "Amount offering the industry person (₹)",
            <input name="offer_amount" type="number" min="0" className={inputClass} />
          )}
          {formField("Description", <textarea name="description" rows={3} className={inputClass} />)}

          <button
            type="submit"
            className="mt-2 bg-srm-navy text-white font-semibold rounded-md py-2.5 text-sm hover:bg-srm-navy-dark transition-colors"
          >
            Post requirement
          </button>
        </form>
      </Card>
    </div>
  );
}
