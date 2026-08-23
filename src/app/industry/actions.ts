"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createIndustryProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const domains = String(formData.get("domains") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const { error } = await supabase.from("industry_profiles").insert({
    added_by: user.id,
    full_name: String(formData.get("full_name")),
    designation: (formData.get("designation") as string) || null,
    company: (formData.get("company") as string) || null,
    education: (formData.get("education") as string) || null,
    linkedin_url: (formData.get("linkedin_url") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    domains,
    min_cost: formData.get("min_cost") ? Number(formData.get("min_cost")) : null,
    notes: (formData.get("notes") as string) || null,
  });

  if (error) {
    redirect("/industry/new?error=" + encodeURIComponent(error.message));
  }

  redirect("/industry");
}

export async function logIndustryPastEvent(industryId: string, formData: FormData) {
  const supabase = await createClient();
  await supabase.from("industry_past_events").insert({
    industry_id: industryId,
    event_name: String(formData.get("event_name")),
    event_date: (formData.get("event_date") as string) || null,
    organization: (formData.get("organization") as string) || null,
    role: (formData.get("role") as string) || null,
  });
  redirect(`/industry/${industryId}`);
}

export async function logIndustryRequest(industryId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("industry_requests").insert({
    industry_id: industryId,
    logged_by: user.id,
    domain: String(formData.get("domain")),
    amount: formData.get("amount") ? Number(formData.get("amount")) : null,
    notes: (formData.get("notes") as string) || null,
  });
  redirect(`/industry/${industryId}`);
}
