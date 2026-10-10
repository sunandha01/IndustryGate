import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, NewButton, PageHeader, dateRange, money } from "@/components/ui";
import type { IndustryProfile, Requirement } from "@/lib/types";
import { closeRequirement } from "./actions";

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("requirements")
    .select("*")
    .order("created_at", { ascending: false });

  const requirements = (data ?? []) as Requirement[];

  // Resolve the industry contacts that fulfilled requirements, in one query.
  const fulfillerIds = [...new Set(requirements.map((r) => r.fulfilled_by).filter(Boolean))];
  const fulfillers = new Map<string, IndustryProfile>();
  if (fulfillerIds.length) {
    const { data: people } = await supabase
      .from("industry_profiles")
      .select("*")
      .in("id", fulfillerIds as string[]);
    for (const person of (people ?? []) as IndustryProfile[]) fulfillers.set(person.id, person);
  }

  return (
    <div>
      <PageHeader
        title="Current Requirements"
        action={<NewButton href="/requirements/new" label="Post a requirement" />}
      />

      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          Couldn&apos;t close that requirement: {error}
        </p>
      )}

      {requirements.length === 0 && (
        <EmptyState message="No open requirements. Post what an upcoming event still needs." />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {requirements.map((req) => {
          const filler = req.fulfilled_by ? fulfillers.get(req.fulfilled_by) : undefined;
          return (
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
              <h2 className="mt-2 font-semibold text-srm-navy">{req.event_name ?? req.domain}</h2>
              {req.event_name && <p className="text-xs text-gray-500">{req.domain}</p>}
              {req.description && <p className="text-sm text-gray-600 mt-1">{req.description}</p>}
              {filler && (
                <p className="text-sm text-gray-600 mt-1">
                  Fulfilled by{" "}
                  <Link href={`/industry/${filler.id}`} className="text-srm-navy underline">
                    {filler.full_name}
                  </Link>
                  {filler.company ? ` (${filler.company})` : ""}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {dateRange(req.start_date, req.end_date)}
                {req.sponsorship_needed ? ` · needs ${req.sponsorship_needed}` : ""}
              </p>
              <div className="mt-2 flex gap-4">
                {money(req.offer_amount) && (
                  <p className="text-sm font-semibold text-srm-navy">
                    Offer: {money(req.offer_amount)}
                  </p>
                )}
                {money(req.prize_pool) && (
                  <p className="text-sm text-gray-500">Prize pool: {money(req.prize_pool)}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
