import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, NewButton, PageHeader, money } from "@/components/ui";
import type { IndustryProfile } from "@/lib/types";

export default async function IndustryDirectoryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("industry_profiles")
    .select("*")
    .order("full_name", { ascending: true });

  const people = (data ?? []) as IndustryProfile[];

  return (
    <div>
      <PageHeader
        title="Industry Directory"
        action={<NewButton href="/industry/new" label="Add a contact" />}
      />

      {people.length === 0 && (
        <EmptyState message="No industry contacts yet. Add someone a faculty member already knows." />
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {people.map((person) => (
          <Link key={person.id} href={`/industry/${person.id}`}>
            <Card>
              <h2 className="font-semibold text-srm-navy">{person.full_name}</h2>
              <p className="text-sm text-gray-600">
                {person.designation}
                {person.designation && person.company ? " · " : ""}
                {person.company}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {person.domains.map((d) => (
                  <Badge key={d}>{d}</Badge>
                ))}
              </div>
              {money(person.min_cost) && (
                <p className="text-xs text-gray-400 mt-2">From {money(person.min_cost)}</p>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
