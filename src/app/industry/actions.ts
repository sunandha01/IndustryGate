"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invitationEmail, sendEmail } from "@/lib/email";

const text = (value: FormDataEntryValue | null) => {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
};

const domainList = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

export async function createIndustryProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("industry_profiles").insert({
    added_by: user.id,
    full_name: String(formData.get("full_name")),
    designation: text(formData.get("designation")),
    company: text(formData.get("company")),
    education: text(formData.get("education")),
    linkedin_url: text(formData.get("linkedin_url")),
    email: text(formData.get("email")),
    phone: text(formData.get("phone")),
    domains: domainList(formData.get("domains")),
    min_cost: formData.get("min_cost") ? Number(formData.get("min_cost")) : null,
    notes: text(formData.get("notes")),
  });

  if (error) {
    redirect("/industry/new?error=" + encodeURIComponent(error.message));
  }

  redirect("/industry");
}

// `returnTo` differs by caller: faculty edit the directory entry, professionals
// edit their own copy from /mentor and must land back there.
export async function updateIndustryProfile(
  industryId: string,
  returnTo: string,
  formData: FormData
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("industry_profiles")
    .update({
      full_name: String(formData.get("full_name")),
      designation: text(formData.get("designation")),
      company: text(formData.get("company")),
      education: text(formData.get("education")),
      linkedin_url: text(formData.get("linkedin_url")),
      email: text(formData.get("email")),
      phone: text(formData.get("phone")),
      domains: domainList(formData.get("domains")),
      min_cost: formData.get("min_cost") ? Number(formData.get("min_cost")) : null,
      notes: text(formData.get("notes")),
    })
    .eq("id", industryId);

  if (error) {
    const sep = returnTo.includes("?") ? "&" : "?";
    redirect(`${returnTo}/edit${sep}error=` + encodeURIComponent(error.message));
  }

  revalidatePath(returnTo);
  redirect(returnTo);
}

// Attach an already-logged past event to this contact, instead of retyping it.
export async function linkPastEvent(industryId: string, formData: FormData) {
  const eventId = text(formData.get("event_id"));
  if (!eventId) redirect(`/industry/${industryId}`);

  const supabase = await createClient();
  const { error } = await supabase
    .from("past_events")
    .update({ industry_id: industryId, industry_role: text(formData.get("industry_role")) })
    .eq("id", eventId);

  if (error) {
    redirect(`/industry/${industryId}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath(`/industry/${industryId}`);
  redirect(`/industry/${industryId}`);
}

export async function logIndustryRequest(industryId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const domain = String(formData.get("domain"));
  const eventName = text(formData.get("event_name"));
  const amount = formData.get("amount") ? Number(formData.get("amount")) : null;
  const notes = text(formData.get("notes"));

  const { error } = await supabase.from("industry_requests").insert({
    industry_id: industryId,
    logged_by: user.id,
    domain,
    event_name: eventName,
    amount,
    notes,
  });

  if (error) {
    redirect(`/industry/${industryId}?error=` + encodeURIComponent(error.message));
  }

  // Tell the professional they have been asked, and link them to the page
  // where they can accept or decline. A failed email must not lose the request.
  const { data: contact } = await supabase
    .from("industry_profiles")
    .select("full_name, email")
    .eq("id", industryId)
    .single();
  const person = contact as { full_name: string; email: string | null } | null;

  const { data: me } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  const facultyName = (me as { full_name: string } | null)?.full_name ?? "SRM faculty";

  let notice = "Request logged.";
  if (!person?.email) {
    notice = "Request logged. No email on file for this contact, so nothing was sent.";
  } else {
    const mail = invitationEmail({
      personName: person.full_name,
      facultyName,
      domain,
      eventName,
      amount,
      notes,
      startDate: null, // requests logged from this page have no event dates
      endDate: null,
    });
    const result = await sendEmail(person.email, mail.subject, mail.html);

    notice = result.ok
      ? `Request logged and an invitation was emailed to ${person.email}.`
      : `Request logged, but the invitation email failed: ${result.error}`;
  }

  revalidatePath(`/industry/${industryId}`);
  redirect(`/industry/${industryId}?notice=` + encodeURIComponent(notice));
}
