"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPastEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const numeric = (value: FormDataEntryValue | null) =>
    value && String(value).trim() !== "" ? Number(value) : null;

  const { error } = await supabase.from("past_events").insert({
    posted_by: user.id,
    name: String(formData.get("name")),
    domain: String(formData.get("domain")),
    event_date: (formData.get("event_date") as string) || null,
    prize_pool: numeric(formData.get("prize_pool")),
    sponsorship_details: (formData.get("sponsorship_details") as string) || null,
    industry_person_name: (formData.get("industry_person_name") as string) || null,
    industry_company: (formData.get("industry_company") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  if (error) {
    redirect("/events/new?error=" + encodeURIComponent(error.message));
  }

  redirect("/events");
}
