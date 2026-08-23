import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, NewButton, PageHeader, dateRange, money } from "@/components/ui";
import type { PastEvent } from "@/lib/types";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("past_events")
    .select("*")
    .order("start_date", { ascending: false });

  const events = (data ?? []) as PastEvent[];

  return (
    <div>
      <PageHeader title="Past Events" action={<NewButton href="/events/new" label="Log an event" />} />

      {events.length === 0 && (
        <EmptyState message="No past events logged yet. Add the first one so others can see who's already visited." />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {events.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`}>
            <Card>
              <Badge>{event.domain}</Badge>
              <h2 className="mt-2 font-semibold text-srm-navy">{event.name}</h2>
              <p className="text-xs text-gray-400 mt-1">{dateRange(event.start_date, event.end_date)}</p>
              {event.industry_person_name && (
                <p className="text-sm text-gray-600 mt-2">
                  Guest: {event.industry_person_name}
                  {event.industry_company ? ` (${event.industry_company})` : ""}
                </p>
              )}
              {event.sponsorship_details && (
                <p className="text-sm text-gray-600 mt-1">Sponsorship: {event.sponsorship_details}</p>
              )}
              {money(event.prize_pool) && (
                <p className="text-sm font-semibold text-srm-navy mt-2">
                  Prize pool: {money(event.prize_pool)}
                </p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
