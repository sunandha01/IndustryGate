import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, PageHeader, formField, inputClass, money } from "@/components/ui";
import type { IndustryPastEvent, IndustryProfile, IndustryRequest } from "@/lib/types";
import { logIndustryPastEvent, logIndustryRequest } from "@/app/industry/actions";

export default async function IndustryProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: person }, { data: pastEvents }, { data: requests }] = await Promise.all([
    supabase.from("industry_profiles").select("*").eq("id", id).single(),
    supabase
      .from("industry_past_events")
      .select("*")
      .eq("industry_id", id)
      .order("event_date", { ascending: false }),
    supabase
      .from("industry_requests")
      .select("*")
      .eq("industry_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!person) notFound();

  const profile = person as IndustryProfile;
  const events = (pastEvents ?? []) as IndustryPastEvent[];
  const asks = (requests ?? []) as IndustryRequest[];
  const boundLogEvent = logIndustryPastEvent.bind(null, id);
  const boundLogRequest = logIndustryRequest.bind(null, id);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PageHeader title={profile.full_name} />
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
        {events.length === 0 && <p className="text-sm text-gray-400">Nothing logged yet.</p>}
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <Card key={event.id}>
              <p className="font-medium text-srm-navy">{event.event_name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {event.event_date ?? "Date unknown"}
                {event.organization ? ` · ${event.organization}` : ""}
                {event.role ? ` · ${event.role}` : ""}
              </p>
            </Card>
          ))}
        </div>

        <h2 className="font-semibold text-srm-navy mt-8 mb-3">Requests from this contact</h2>
        {asks.length === 0 && <p className="text-sm text-gray-400">None logged yet.</p>}
        <div className="flex flex-col gap-3">
          {asks.map((ask) => (
            <Card key={ask.id}>
              <p className="font-medium text-srm-navy">{ask.domain}</p>
              {money(ask.amount) && <p className="text-sm text-gray-600">{money(ask.amount)}</p>}
              {ask.notes && <p className="text-sm text-gray-500 mt-1">{ask.notes}</p>}
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Card>
          <h3 className="font-semibold text-srm-navy mb-3">Log a past event</h3>
          <form action={boundLogEvent} className="flex flex-col gap-3">
            {formField("Event name", <input name="event_name" required className={inputClass} />)}
            {formField("Date", <input name="event_date" type="date" className={inputClass} />)}
            {formField("Organization", <input name="organization" className={inputClass} />)}
            {formField("Role", <input name="role" className={inputClass} placeholder="Judge, chief guest, sponsor" />)}
            <button
              type="submit"
              className="bg-srm-navy text-white text-sm font-semibold rounded-md py-2 hover:bg-srm-navy-dark transition-colors"
            >
              Save
            </button>
          </form>
        </Card>

        <Card>
          <h3 className="font-semibold text-srm-navy mb-3">Log a request from them</h3>
          <form action={boundLogRequest} className="flex flex-col gap-3">
            {formField("Domain", <input name="domain" required className={inputClass} />)}
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
