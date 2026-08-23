import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, NewButton, PageHeader, money } from "@/components/ui";
import type { Requirement } from "@/lib/types";
import { closeRequirement } from "./actions";

export default async function RequirementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("requirements")
    .select("*")
    .order("created_at", { ascending: false });

  const requirements = (data ?? []) as Requirement[];

  return (
    <div>
      <PageHeader
        title="Current Requirements"
        action={<NewButton href="/requirements/new" label="Post a requirement" />}
      />

      {requirements.length === 0 && (
        <EmptyState message="No open requirements. Post what an upcoming event still needs." />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {requirements.map((req) => (
          <Card key={req.id}>
            <div className="flex items-center justify-between">
              <Badge>{req.status}</Badge>
              {req.posted_by === user?.id && req.status === "open" && (
                <form action={closeRequirement.bind(null, req.id)}>
                  <button type="submit" className="text-xs text-gray-400 underline">
                    Mark closed
                  </button>
                </form>
              )}
            </div>
            <h2 className="mt-2 font-semibold text-srm-navy">{req.domain}</h2>
            {req.description && <p className="text-sm text-gray-600 mt-1">{req.description}</p>}
            <p className="text-xs text-gray-400 mt-2">
              {req.event_date ?? "Date TBD"}
              {req.sponsorship_needed ? ` · needs ${req.sponsorship_needed}` : ""}
            </p>
            <div className="mt-2 flex gap-4">
              {money(req.offer_amount) && (
                <p className="text-sm font-semibold text-srm-navy">Offer: {money(req.offer_amount)}</p>
              )}
              {money(req.prize_pool) && (
                <p className="text-sm text-gray-500">Prize pool: {money(req.prize_pool)}</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
