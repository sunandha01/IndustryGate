import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, PageHeader, dateRange, formField, inputClass, money } from "@/components/ui";
import type { IndustryProfile, IndustryRequest, PastEvent } from "@/lib/types";
import { linkPastEvent, logIndustryRequest } from "@/app/industry/actions";

export default async function IndustryProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { id } = await params;
  const { error, notice } = await searchParams;
  const supabase = await createClient();

  const [{ data: person }, { data: attended }, { data: requests }, { data: unlinked }] =
    await Promise.all([
      supabase.from("industry_profiles").select("*").eq("id", id).single(),
      // Past events are the single source of truth now — no separate re-entry.
      supabase
        .from("past_events")
        .select("*")
        .eq("industry_id", id)
        .order("start_date", { ascending: false }),
      supabase
        .from("industry_requests")
        .select("*")
        .eq("industry_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("past_events")
        .select("id, name, start_date")
        .is("industry_id", null)
        .order("start_date", { ascending: false }),
    ]);

  if (!person) notFound();

  const profile = person as IndustryProfile;
  const events = (attended ?? []) as PastEvent[];
  const asks = (requests ?? []) as IndustryRequest[];
  const linkable = (unlinked ?? []) as { id: string; name: string; start_date: string | null }[];

  const boundLink = linkPastEvent.bind(null, id);
  const boundLogRequest = logIndustryRequest.bind(null, id);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PageHeader
          title={profile.full_name}
          action={
            <Link
              href={`/industry/${id}/edit`}
              className="bg-srm-navy text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-srm-navy-dark transition-colors"
            >
              Edit
            </Link>
          }
        />

        {notice && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
            {notice}
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}

        <Card>
          <p className="text-sm text-gray-600">
            {profile.designation}
            {profile.designation && profile.company ? " · " : ""}
            {profile.company}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.domains.map((d) => (
              <Badge key={d}>{d}</Badge>
            ))}
          </div>
          <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            {profile.education && (
              <div>
                <dt className="text-gray-400">Education</dt>
                <dd className="text-gray-700">{profile.education}</dd>
              </div>
            )}
            {profile.email && (
              <div>
                <dt className="text-gray-400">Email</dt>
                <dd className="text-gray-700">{profile.email}</dd>
              </div>
            )}
            {profile.phone && (
              <div>
                <dt className="text-gray-400">Phone</dt>
                <dd className="text-gray-700">{profile.phone}</dd>
              </div>
            )}
            {profile.linkedin_url && (
              <div>
                <dt className="text-gray-400">LinkedIn</dt>
                <dd>
                  <a href={profile.linkedin_url} target="_blank" className="text-srm-navy underline">
                    View profile
                  </a>
                </dd>
              </div>
            )}
            {money(profile.min_cost) && (
              <div>
                <dt className="text-gray-400">Minimum cost</dt>
                <dd className="text-gray-700">{money(profile.min_cost)}</dd>
              </div>
            )}
          </dl>
          {profile.notes && <p className="text-sm text-gray-500 mt-4 italic">{profile.notes}</p>}
        </Card>

        <h2 className="font-semibold text-srm-navy mt-8 mb-3">Past events attended</h2>
        {events.length === 0 && (
          <p className="text-sm text-gray-400">
            No events linked yet — use the panel on the right.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card>
                <p className="font-medium text-srm-navy">{event.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {dateRange(event.start_date, event.end_date)}
                  {event.industry_role ? ` · ${event.industry_role}` : ""}
                  {event.domain ? ` · ${event.domain}` : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        <h2 className="font-semibold text-srm-navy mt-8 mb-3">Requests from this contact</h2>
        {asks.length === 0 && <p className="text-sm text-gray-400">None logged yet.</p>}
        <div className="flex flex-col gap-3">
          {asks.map((ask) => (
            <Card key={ask.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge>{ask.status}</Badge>
                  <p className="font-medium text-srm-navy mt-2">{ask.domain}</p>
                  {ask.event_name && (
                    <p className="text-sm text-gray-600">For: {ask.event_name}</p>
                  )}
                  {ask.start_date && (
                    <p className="text-sm text-gray-600">{dateRange(ask.start_date, ask.end_date)}</p>
                  )}
                  {money(ask.amount) && (
                    <p className="text-sm text-gray-600">{money(ask.amount)}</p>
                  )}
                  {ask.notes && <p className="text-sm text-gray-500 mt-1">{ask.notes}</p>}
                </div>

                {/* Answering is the professional's call, on their own profile. */}
                {ask.status === "sent" && (
                  <p className="text-xs text-gray-400 shrink-0">Awaiting their reply</p>
                )}
                {ask.status === "withdrawn" && (
                  <p className="text-xs text-gray-400 shrink-0">No longer needed</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <h3 className="font-semibold text-srm-navy mb-3">Link a past event</h3>
          {linkable.length > 0 ? (
            <form action={boundLink} className="flex flex-col gap-3">
              {formField(
                "Event",
                <select name="event_id" required className={inputClass}>
                  <option value="">— Choose an event —</option>
                  {linkable.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                      {e.start_date ? ` (${e.start_date})` : ""}
                    </option>
                  ))}
                </select>
              )}
              {formField(
                "Their role",
                <input
                  name="industry_role"
                  className={inputClass}
                  placeholder="Judge, chief guest, sponsor"
                />
              )}
              <button
                type="submit"
                className="bg-srm-navy text-white text-sm font-semibold rounded-md py-2 hover:bg-srm-navy-dark transition-colors"
              >
                Link event
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">Every logged event is already linked to someone.</p>
          )}
          <Link
            href={`/events/new?industry=${id}`}
            className="text-sm text-srm-navy underline mt-4 inline-block"
          >
            + Add a new past event for them
          </Link>
        </Card>

        <Card>
          <h3 className="font-semibold text-srm-navy mb-3">Log a request from them</h3>
          <form action={boundLogRequest} className="flex flex-col gap-3">
            {formField("Domain", <input name="domain" required className={inputClass} />)}
            {formField(
              "Event name",
              <input name="event_name" className={inputClass} placeholder="Used in the email" />
            )}
            {formField("Amount (₹)", <input name="amount" type="number" min="0" className={inputClass} />)}
            {formField("Notes", <textarea name="notes" rows={2} className={inputClass} />)}
            <button
              type="submit"
              className="bg-srm-navy text-white text-sm font-semibold rounded-md py-2 hover:bg-srm-navy-dark transition-colors"
            >
              Save
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
