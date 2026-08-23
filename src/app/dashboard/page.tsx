import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader, dateRange, money } from "@/components/ui";
import type { PastEvent, Requirement } from "@/lib/types";

type FeedItem =
  | { kind: "past_event"; created_at: string; data: PastEvent }
  | { kind: "requirement"; created_at: string; data: Requirement };

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: pastEvents }, { data: requirements }] = await Promise.all([
    supabase.from("past_events").select("*").order("created_at", { ascending: false }).limit(10),
    supabase.from("requirements").select("*").order("created_at", { ascending: false }).limit(10),
  ]);

  const feed: FeedItem[] = [
    ...((pastEvents ?? []) as PastEvent[]).map((data) => ({
      kind: "past_event" as const,
      created_at: data.created_at,
      data,
    })),
    ...((requirements ?? []) as Requirement[]).map((data) => ({
      kind: "requirement" as const,
      created_at: data.created_at,
      data,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div>
      <PageHeader
        title="Feed"
        action={
          <div className="flex gap-2">
            <Link
              href="/events/new"
              className="bg-white border border-srm-navy text-srm-navy text-sm font-medium px-4 py-2 rounded-md hover:bg-srm-navy hover:text-white transition-colors"
            >
              Log a past event
            </Link>
            <Link
              href="/requirements/new"
              className="bg-srm-navy text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-srm-navy-dark transition-colors"
            >
              Post a requirement
            </Link>
          </div>
        }
      />

      {feed.length === 0 && (
        <EmptyState message="Nothing posted yet. Be the first to log a past event or a requirement." />
      )}

      <div className="flex flex-col gap-4">
        {feed.map((item) =>
          item.kind === "requirement" ? (
            <Card key={`req-${item.data.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge>Wanted · {item.data.status}</Badge>
                  <h2 className="mt-2 font-semibold text-srm-navy">{item.data.domain}</h2>
                  {item.data.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.data.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {dateRange(item.data.start_date, item.data.end_date)}
                    {item.data.sponsorship_needed ? ` · needs ${item.data.sponsorship_needed}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {money(item.data.offer_amount) && (
                    <p className="text-sm font-semibold text-srm-navy">
                      {money(item.data.offer_amount)}
                    </p>
                  )}
                  {money(item.data.prize_pool) && (
                    <p className="text-xs text-gray-400">Prize pool {money(item.data.prize_pool)}</p>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Link key={`evt-${item.data.id}`} href={`/events/${item.data.id}`}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge>Past event</Badge>
                    <h2 className="mt-2 font-semibold text-srm-navy">{item.data.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">{item.data.domain}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {dateRange(item.data.start_date, item.data.end_date)}
                      {item.data.industry_person_name
                        ? ` · with ${item.data.industry_person_name}${
                            item.data.industry_company ? ` (${item.data.industry_company})` : ""
                          }`
                        : ""}
                    </p>
                  </div>
                  {money(item.data.prize_pool) && (
                    <p className="text-sm font-semibold text-srm-navy shrink-0">
                      {money(item.data.prize_pool)}
                    </p>
                  )}
                </div>
              </Card>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
