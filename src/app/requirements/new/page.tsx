import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import { createRequirement } from "@/app/requirements/actions";
import { createClient } from "@/lib/supabase/server";
import MentorSuggestions from "@/components/mentor-suggestions";
import {
  buildMentorSignals,
  type CommitmentRow,
  type EventRow,
  type ProfileRow,
  type RequestRow,
} from "@/lib/mentor-match";

export default async function NewRequirementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  // Everything the suggestions need, fetched once up front so scoring in the
  // browser is instant. A failed query just means fewer suggestions — the form
  // itself never depends on it.
  const supabase = await createClient();
  const [people, pastEvents, requests, commitments] = await Promise.all([
    supabase
      .from("industry_profiles")
      .select("id, full_name, designation, company, education, notes, domains, min_cost, email"),
    supabase
      .from("past_events")
      .select("industry_id, name, domain, notes, industry_role, start_date, end_date")
      .not("industry_id", "is", null),
    supabase.from("industry_requests").select("industry_id, status"),
    supabase
      .from("requirements")
      .select("fulfilled_by, description, start_date, end_date")
      .not("fulfilled_by", "is", null),
  ]);
  const mentors = buildMentorSignals(
    (people.data ?? []) as ProfileRow[],
    (pastEvents.data ?? []) as EventRow[],
    (requests.data ?? []) as RequestRow[],
    (commitments.data ?? []) as CommitmentRow[]
  );

  return (
    <div className="lg:grid lg:grid-cols-[36rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
      <div className="max-w-xl" data-mentor-source>
        <PageHeader title="Post a Requirement" />
        <Card>
          {error && (
            <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </p>
          )}
          <form action={createRequirement} className="flex flex-col gap-4">
            {/* Filled in by the mentor suggestions once a request has posted this event. */}
            <input type="hidden" name="requirement_id" />
            {formField(
              "Event name",
              <input name="event_name" required className={inputClass} placeholder="Smart India Hackathon 2026" />
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
      <MentorSuggestions mentors={mentors} />
    </div>
  );
}
