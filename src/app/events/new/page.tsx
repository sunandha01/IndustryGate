import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import { createPastEvent } from "@/app/events/actions";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
          {formField("Event date", <input name="event_date" type="date" className={inputClass} />)}
          {formField(
            "Prize pool (₹)",
            <input name="prize_pool" type="number" min="0" className={inputClass} />
          )}
          {formField(
            "Sponsorship details",
            <textarea name="sponsorship_details" rows={2} className={inputClass} />
          )}
          {formField(
            "Industry guest name",
            <input name="industry_person_name" className={inputClass} placeholder="If not yet in the directory" />
          )}
          {formField("Industry company", <input name="industry_company" className={inputClass} />)}
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
