"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import type { IndustryProfile, IndustryRequest } from "@/lib/types";

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

export async function updateIndustryProfile(industryId: string, formData: FormData) {
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
    redirect(`/industry/${industryId}/edit?error=` + encodeURIComponent(error.message));
  }

  redirect(`/industry/${industryId}`);
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

  const { error } = await supabase.from("industry_requests").insert({
    industry_id: industryId,
    logged_by: user.id,
    domain: String(formData.get("domain")),
    event_name: text(formData.get("event_name")),
    amount: formData.get("amount") ? Number(formData.get("amount")) : null,
    notes: text(formData.get("notes")),
  });

  if (error) {
    redirect(`/industry/${industryId}?error=` + encodeURIComponent(error.message));
  }

  revalidatePath(`/industry/${industryId}`);
  redirect(`/industry/${industryId}`);
}

// Accepting mirrors the request into the feed as a fulfilled requirement and
// emails the contact. Email failure is reported but never rolls back the accept.
export async function setRequestStatus(
  requestId: string,
  industryId: string,
  status: "accepted" | "rejected"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: updated, error } = await supabase
    .from("industry_requests")
    .update({ status })
    .eq("id", requestId)
    .select("*")
    .single();

  if (error) {
    redirect(`/industry/${industryId}?error=` + encodeURIComponent(error.message));
  }

  if (status !== "accepted") {
    revalidatePath(`/industry/${industryId}`);
    redirect(`/industry/${industryId}`);
  }

  const request = updated as IndustryRequest;

  const { error: feedError } = await supabase.from("requirements").insert({
    posted_by: user.id,
    domain: request.domain,
    offer_amount: request.amount,
    description: request.event_name
      ? `Confirmed for ${request.event_name}`
      : "Confirmed from an industry request",
    status: "fulfilled",
    fulfilled_by: industryId,
  });

  if (feedError) {
    redirect(`/industry/${industryId}?error=` + encodeURIComponent(feedError.message));
  }

  const { data: contact } = await supabase
    .from("industry_profiles")
    .select("*")
    .eq("id", industryId)
    .single();
  const person = contact as IndustryProfile | null;

  let notice = "Request accepted.";
  if (!person?.email) {
    notice = "Request accepted. No email on file for this contact, so nothing was sent.";
  } else {
    const eventLine = request.event_name
      ? `<p>Event: <strong>${request.event_name}</strong></p>`
      : "";
    const amountLine =
      request.amount !== null
        ? `<p>Agreed amount: <strong>₹${request.amount}</strong></p>`
        : "";

    const result = await sendEmail(
      person.email,
      `SRM Industry Mentor Portal — your request has been accepted`,
      `<p>Dear ${person.full_name},</p>
       <p>We are glad to confirm that SRM Institute of Science &amp; Technology has
       accepted your request in the <strong>${request.domain}</strong> domain.</p>
       ${eventLine}
       ${amountLine}
       <p>Our team will reach out shortly with the schedule and other details.</p>
       <p>Warm regards,<br/>SRM Industry Mentor Portal</p>`
    );

    notice = result.ok
      ? `Request accepted and email sent to ${person.email}.`
      : `Request accepted, but the email failed: ${result.error}`;
  }

  revalidatePath(`/industry/${industryId}`);
  redirect(`/industry/${industryId}?notice=` + encodeURIComponent(notice));
}
