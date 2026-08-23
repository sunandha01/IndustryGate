import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, PageHeader, dateRange, money } from "@/components/ui";
import type { IndustryProfile, PastEvent } from "@/lib/types";

export default async function PastEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("past_events").select("*").eq("id", id).single();
  if (!data) notFound();
  const event = data as PastEvent;

  let guest: IndustryProfile | null = null;
  if (event.industry_id) {
    const { data: person } = await supabase
      .from("industry_profiles")
      .select("*")
      .eq("id", event.industry_id)
      .single();
    guest = person as IndustryProfile | null;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title={event.name} />

      <Card>
        <Badge>{event.domain}</Badge>
        <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-400">Dates</dt>
            <dd className="text-gray-700">{dateRange(event.start_date, event.end_date)}</dd>
          </div>
          {money(event.prize_pool) && (
            <div>
              <dt className="text-gray-400">Prize pool</dt>
              <dd className="text-gray-700">{money(event.prize_pool)}</dd>
            </div>
          )}
          {event.sponsorship_details && (
            <div className="sm:col-span-2">
              <dt className="text-gray-400">Sponsorship</dt>
              <dd className="text-gray-700">{event.sponsorship_details}</dd>
            </div>
          )}
          {event.notes && (
            <div className="sm:col-span-2">
              <dt className="text-gray-400">Notes</dt>
              <dd className="text-gray-700">{event.notes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <h2 className="font-semibold text-srm-navy mt-8 mb-3">Industry guest</h2>

      {guest ? (
        <Link href={`/industry/${guest.id}`}>
          <Card>
            <p className="font-semibold text-srm-navy">{guest.full_name}</p>
            <p className="text-sm text-gray-600">
              {guest.designation}
              {guest.designation && guest.company ? " · " : ""}
              {guest.company}
            </p>
            {event.industry_role && (
              <p className="text-xs text-gray-400 mt-1">Role at this event: {event.industry_role}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {guest.domains.map((d) => (
                <Badge key={d}>{d}</Badge>
              ))}
            </div>
            <p className="text-xs text-srm-navy underline mt-3">View full profile →</p>
          </Card>
        </Link>
      ) : event.industry_person_name ? (
        <Card>
          <p className="font-semibold text-srm-navy">{event.industry_person_name}</p>
          {event.industry_company && (
            <p className="text-sm text-gray-600">{event.industry_company}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Not in the directory yet — add them so their history is tracked in one place.
          </p>
          <Link href="/industry/new" className="text-xs text-srm-navy underline mt-1 inline-block">
            Add to directory
          </Link>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-gray-500">No industry guest linked to this event.</p>
          <Link href="/industry" className="text-xs text-srm-navy underline mt-2 inline-block">
            Browse the directory to link one
          </Link>
        </Card>
      )}
    </div>
  );
}
