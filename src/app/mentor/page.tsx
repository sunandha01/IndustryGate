import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader, dateRange, money } from "@/components/ui";
import type { Requirement } from "@/lib/types";

// The professional's feed: what SRM is currently looking for. Posted by
// faculty and authorized club members through the campus side of the portal.
export default async function MentorFeedPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("requirements")
    .select("*")
    .eq("status", "open")
    .order("start_date", { ascending: true, nullsFirst: false });

  const openings = (data ?? []) as Requirement[];

  return (
    <div className="max-w-3xl">
      <PageHeader title="Upcoming Opportunities" />
      <p className="text-sm text-gray-500 -mt-4 mb-6">
        Events SRM is currently looking for industry support on. Click any post to expand.
      </p>

      {openings.length === 0 && (
        <EmptyState message="Nothing open right now. New opportunities will appear here." />
      )}

      <div className="flex flex-col gap-4">
        {openings.map((req) => (
          <Card key={req.id}>
            <details className="group">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge>{req.domain}</Badge>
                    <h2 className="mt-2 font-semibold text-srm-navy">
                      {req.event_name || req.description?.split("\n")[0] || `${req.domain} opportunity`}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {dateRange(req.start_date, req.end_date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {money(req.offer_amount) && (
                      <p className="text-sm font-semibold text-srm-navy">
                        {money(req.offer_amount)}
                      </p>
                    )}
                    <span className="text-xs text-gray-400 group-open:hidden">Show details ▾</span>
                    <span className="text-xs text-gray-400 hidden group-open:inline">Hide ▴</span>
                  </div>
                </div>
              </summary>

              <dl className="mt-4 pt-4 border-t border-card-border grid sm:grid-cols-2 gap-3 text-sm">
                <div className="sm:col-span-2">
                  <dt className="text-gray-400">Domain</dt>
                  <dd className="text-gray-700">{req.domain}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Dates</dt>
                  <dd className="text-gray-700">{dateRange(req.start_date, req.end_date)}</dd>
                </div>
                {req.sponsorship_needed && (
                  <div>
                    <dt className="text-gray-400">Support needed</dt>
                    <dd className="text-gray-700">{req.sponsorship_needed}</dd>
                  </div>
                )}
                {money(req.offer_amount) && (
                  <div>
                    <dt className="text-gray-400">Offered to you</dt>
                    <dd className="text-gray-700">{money(req.offer_amount)}</dd>
                  </div>
                )}
                {money(req.prize_pool) && (
                  <div>
                    <dt className="text-gray-400">Event prize pool</dt>
                    <dd className="text-gray-700">{money(req.prize_pool)}</dd>
                  </div>
                )}
                {req.description && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-400">Description</dt>
                    <dd className="text-gray-700 whitespace-pre-line">{req.description}</dd>
                  </div>
                )}
              </dl>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
