"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createRequirement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const numeric = (value: FormDataEntryValue | null) =>
    value && String(value).trim() !== "" ? Number(value) : null;

  const { error } = await supabase.from("requirements").insert({
    posted_by: user.id,
    domain: String(formData.get("domain")),
    event_date: (formData.get("event_date") as string) || null,
    sponsorship_needed: (formData.get("sponsorship_needed") as string) || null,
    prize_pool: numeric(formData.get("prize_pool")),
    offer_amount: numeric(formData.get("offer_amount")),
    description: (formData.get("description") as string) || null,
  });

  if (error) {
    redirect("/requirements/new?error=" + encodeURIComponent(error.message));
  }

  redirect("/requirements");
}

export async function closeRequirement(id: string) {
  const supabase = await createClient();
  await supabase.from("requirements").update({ status: "closed" }).eq("id", id);
  redirect("/requirements");
}
