"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const numeric = (value: FormDataEntryValue | null) =>
  value && String(value).trim() !== "" ? Number(value) : null;

const text = (value: FormDataEntryValue | null) => {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
};

export async function createPastEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const domain = String(formData.get("domain"));
  let industryId = text(formData.get("industry_id"));

  // Not in the directory yet? Create the contact here so it shows up in both
  // the event and the industry directory, instead of being dead free text.
  const newContactName = text(formData.get("new_industry_name"));
  if (!industryId && newContactName) {
    const { data, error } = await supabase
      .from("industry_profiles")
      .insert({
        added_by: user.id,
        full_name: newContactName,
        designation: text(formData.get("new_industry_designation")),
        company: text(formData.get("new_industry_company")),
        email: text(formData.get("new_industry_email")),
        linkedin_url: text(formData.get("new_industry_linkedin")),
        domains: domain ? [domain] : [],
      })
      .select("id")
      .single();

    if (error) {
      redirect("/events/new?error=" + encodeURIComponent(error.message));
    }
    industryId = data!.id;
  }

  const { error } = await supabase.from("past_events").insert({
    posted_by: user.id,
    name: String(formData.get("name")),
    domain,
    start_date: text(formData.get("start_date")),
    end_date: text(formData.get("end_date")),
    prize_pool: numeric(formData.get("prize_pool")),
    sponsorship_details: text(formData.get("sponsorship_details")),
    industry_id: industryId,
    industry_role: text(formData.get("industry_role")),
    notes: text(formData.get("notes")),
  });

  if (error) {
    redirect("/events/new?error=" + encodeURIComponent(error.message));
  }

  redirect(industryId ? `/industry/${industryId}` : "/events");
}
