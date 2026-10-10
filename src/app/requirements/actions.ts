"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createRequirement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const numeric = (value: FormDataEntryValue | null) =>
    value && String(value).trim() !== "" ? Number(value) : null;

  const values = {
    event_name: ((formData.get("event_name") as string) || "").trim() || null,
    domain: String(formData.get("domain")),
    start_date: (formData.get("start_date") as string) || null,
    end_date: (formData.get("end_date") as string) || null,
    sponsorship_needed: (formData.get("sponsorship_needed") as string) || null,
    prize_pool: numeric(formData.get("prize_pool")),
    offer_amount: numeric(formData.get("offer_amount")),
    description: (formData.get("description") as string) || null,
  };

  // Sending a request to a mentor already posted this event and handed us its
  // id. Posting it now just saves the latest details onto that same record, so
  // one event is never on the board twice.
  const existingId = String(formData.get("requirement_id") ?? "").trim();
  const { error } = UUID.test(existingId)
    ? await supabase.from("requirements").update(values).eq("id", existingId)
    : await supabase.from("requirements").insert({ posted_by: user.id, ...values });

  if (error) {
    redirect("/requirements/new?error=" + encodeURIComponent(error.message));
  }

  redirect("/requirements");
}

export async function closeRequirement(id: string) {
  const supabase = await createClient();
  // .select() so we can tell "closed it" from "matched nothing", which RLS does
  // silently when the row isn't yours.
  const { data, error } = await supabase
    .from("requirements")
    .update({ status: "closed" })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    const why = error?.message ?? "You can only close requirements you posted.";
    redirect("/requirements?error=" + encodeURIComponent(why));
  }

  redirect("/requirements");
}
