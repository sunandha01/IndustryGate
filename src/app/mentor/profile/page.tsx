import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { Badge, Card, PageHeader, dateRange, money } from "@/components/ui";
import type { IndustryRequest, PastEvent } from "@/lib/types";
import { respondToRequest } from "@/app/mentor/actions";

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-srm-navy border-b-2 border-srm-gold pb-2">
        {title}
      </h2>
      <p className="text-xs text-gray-500 mt-2 mb-4">{subtitle}</p>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-gray-700 mt-0.5">{value || <span className="text-gray-300">—</span>}</dd>
    </div>
  );
}

export default async function MentorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { error, notice } = await searchParams;
  const viewer = await getViewer();
  if (viewer?.kind !== "industry") redirect("/mentor");

  const me = viewer.profile;
  const supabase = await createClient();

  const [{ data: attended }, { data: requests }] = await Promise.all([
    // Auto-populated: every event faculty tagged this professional on.
    supabase
      .from("past_events")
      .select("*")
      .eq("industry_id", me.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("industry_requests")
      .select("*")
      .eq("industry_id", me.id)
      .order("created_at", { ascending: false }),
  ]);

  const events = (attended ?? []) as PastEvent[];
  const asks = (requests ?? []) as IndustryRequest[];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My Profile"
        action={
          <Link
            href="/mentor/profile/edit"
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

      {/* ── 1. Basic information ─────────────────────────────────────────── */}
      <Section
        title="Basic Information"
        subtitle="Your details as SRM faculty and event organisers see them."
      >
        <Card>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Field label="Full name" value={me.full_name} />
            <Field label="Designation" value={me.designation} />
            <Field label="Company" value={me.company} />
            <Field label="Domain" value={me.domains.length ? me.domains.join(", ") : null} />
            <Field
              label="LinkedIn profile"
              value={
                me.linkedin_url ? (
                  <a href={me.linkedin_url} target="_blank" className="text-srm-navy underline">
                    View profile
                  </a>
                ) : null
              }
            />
            <Field label="Email" value={me.email} />
            <Field label="Phone" value={me.phone} />
            <Field label="Education" value={me.education} />
            <Field label="Minimum cost you charge" value={money(me.min_cost)} />
          </dl>
        </Card>
      </Section>

      {/* ── 2. Past events (auto-populated) ──────────────────────────────── */}
      <Section
        title="Past Events You Attended"
        subtitle="Added automatically whenever SRM logs an event and tags you as having attended. Nothing to fill in here."
      >
        {events.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">
              No events yet. Once SRM tags you on an event you visited, it will appear here.
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <Card key={event.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge>{event.domain}</Badge>
                    <p className="font-medium text-srm-navy mt-2">{event.name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {dateRange(event.start_date, event.end_date)}
                      {event.industry_role ? ` · you attended as ${event.industry_role}` : ""}
                    </p>
                  </div>
                  {money(event.prize_pool) && (
                    <p className="text-sm text-gray-500 shrink-0">
                      Prize pool {money(event.prize_pool)}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* ── 3. Requests from SRM ─────────────────────────────────────────── */}
      <Section
        title="Requests"
        subtitle="Requests SRM faculty have raised with you. Click one to see the full details."
      >
        {asks.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">No requests yet.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {asks.map((ask) => (
              <Card key={ask.id}>
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge>{ask.status}</Badge>
                        <p className="font-medium text-srm-navy mt-2">
                          {ask.event_name || `${ask.domain} request`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{ask.domain}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {money(ask.amount) && (
                          <p className="text-sm font-semibold text-srm-navy">{money(ask.amount)}</p>
                        )}
                        <span className="text-xs text-gray-400 group-open:hidden">
                          Show details ▾
                        </span>
                        <span className="text-xs text-gray-400 hidden group-open:inline">
                          Hide ▴
                        </span>
                      </div>
                    </div>
                  </summary>

                  <dl className="mt-4 pt-4 border-t border-card-border grid sm:grid-cols-2 gap-3 text-sm">
                    <Field label="Domain" value={ask.domain} />
                    <Field label="Event" value={ask.event_name} />
                    <Field
                      label="Dates"
                      value={ask.start_date ? dateRange(ask.start_date, ask.end_date) : null}
                    />
                    <Field label="Amount" value={money(ask.amount)} />
                    <Field label="Status" value={ask.status} />
                    <div className="sm:col-span-2">
                      <Field label="Notes" value={ask.notes} />
                    </div>
                    <div className="sm:col-span-2">
                      <Field
                        label="Raised on"
                        value={new Date(ask.created_at).toLocaleDateString("en-IN")}
                      />
                    </div>
                  </dl>

                  {ask.status === "withdrawn" && (
                    <p className="mt-4 pt-4 border-t border-card-border text-xs text-gray-500">
                      SRM no longer needs this. The event was filled or closed, so there is nothing
                      to answer.
                    </p>
                  )}

                  {ask.status === "sent" && (
                    <div className="mt-4 pt-4 border-t border-card-border flex items-center gap-2">
                      <form action={respondToRequest.bind(null, ask.id, "accepted")}>
                        <button
                          type="submit"
                          className="text-sm font-semibold px-4 py-2 rounded-md bg-srm-navy text-white hover:bg-srm-navy-dark transition-colors"
                        >
                          Accept
                        </button>
                      </form>
                      <form action={respondToRequest.bind(null, ask.id, "rejected")}>
                        <button
                          type="submit"
                          className="text-sm font-semibold px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Decline
                        </button>
                      </form>
                      <p className="text-xs text-gray-400 ml-2">
                        SRM will be notified of your decision.
                      </p>
                    </div>
                  )}
                </details>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
