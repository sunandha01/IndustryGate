"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { invitationEmail, sendEmail } from "@/lib/email";
import { validateEventForRequest } from "@/lib/mentor-match";

export interface SendRequestInput {
  mentorId: string;
  // Set once an earlier send has posted the requirement; later sends reuse it so
  // the event stays one record.
  requirementId: string | null;
  event: {
    name: string;
    domain: string;
    description: string;
    sponsorship: string;
    startDate: string;
    endDate: string;
    offer: number | null;
    prize: number | null;
  };
}

export type SendRequestResult =
  | {
      ok: true;
      requirementId: string;
      mentorName: string;
      email: { sent: true } | { sent: false; reason: string };
    }
  | { ok: false; error: string; requirementId: string | null };

const friendly = (message: string) => {
  if (message.includes("row-level security")) {
    return "You don't have permission to send requests. Ask a faculty member to authorise you.";
  }
  // PostgREST says this when the code is newer than the database it talks to.
  if (message.includes("schema cache")) {
    return "This feature needs a database update. Ask whoever runs the project to apply the latest migration.";
  }
  return message;
};

// Raises a request to one mentor for the event described in the form. The first
// call also posts the requirement; later calls attach to that same requirement,
// so sending to several mentors never creates several events.
export async function sendMentorRequest(input: SendRequestInput): Promise<SendRequestResult> {
  const e = input.event;
  const fail = (error: string, requirementId = input.requirementId): SendRequestResult => ({
    ok: false,
    error,
    requirementId,
  });

  const problem = validateEventForRequest(e);
  if (problem) return fail(problem);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Your session has expired. Sign in again.");

  const { data: mentorRow } = await supabase
    .from("industry_profiles")
    .select("id, full_name, email")
    .eq("id", input.mentorId)
    .single();
  const mentor = mentorRow as { id: string; full_name: string; email: string | null } | null;
  if (!mentor) return fail("That mentor is no longer in the directory.");
  if (!mentor.email?.trim()) return fail(`${mentor.full_name} has no email on file.`);

  const fields = {
    event_name: e.name.trim(),
    domain: e.domain.trim(),
    start_date: e.startDate,
    end_date: e.endDate,
    sponsorship_needed: e.sponsorship.trim() || null,
    prize_pool: e.prize,
    offer_amount: e.offer,
    description: e.description.trim(),
  };

  // 1. The event: reuse the one already posted, or post it now.
  let requirementId = input.requirementId;
  let postedHere = false;
  if (requirementId) {
    const { data: updated, error } = await supabase
      .from("requirements")
      .update(fields)
      .eq("id", requirementId)
      .eq("status", "open")
      .select("id")
      .maybeSingle();
    if (error) return fail(friendly(error.message));
    if (!updated) {
      return fail("This event has already been filled or closed. Reload the page to start a new one.");
    }
  } else {
    const { data: created, error } = await supabase
      .from("requirements")
      .insert({ posted_by: user.id, ...fields })
      .select("id")
      .single();
    if (error) return fail(friendly(error.message));
    requirementId = (created as { id: string }).id;
    postedHere = true;
  }

  // 2. The request itself. The unique index stops a second request to the same
  // mentor for the same event, however it happens.
  const { error: requestError } = await supabase.from("industry_requests").insert({
    industry_id: mentor.id,
    logged_by: user.id,
    requirement_id: requirementId,
    domain: fields.domain,
    event_name: fields.event_name,
    amount: e.offer,
    notes: fields.description,
    start_date: e.startDate,
    end_date: e.endDate,
  });
  if (requestError) {
    // If this very call posted the event, a failed send must not leave it on the
    // public board with nobody asked. Undo it. An event posted by an earlier send
    // stays, since other mentors have already been asked about it.
    if (postedHere) await supabase.from("requirements").delete().eq("id", requirementId);

    return fail(
      requestError.code === "23505"
        ? `A request to ${mentor.full_name} for this event already exists.`
        : friendly(requestError.message),
      postedHere ? null : requirementId
    );
  }

  // 3. Tell them. A failed email never undoes the request: it is recorded and
  // visible in their portal either way.
  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const mail = invitationEmail({
    personName: mentor.full_name,
    facultyName: (me as { full_name: string } | null)?.full_name ?? "SRM faculty",
    domain: fields.domain,
    eventName: fields.event_name,
    amount: e.offer,
    notes: fields.description,
    startDate: e.startDate,
    endDate: e.endDate,
  });
  const sent = await sendEmail(mentor.email, mail.subject, mail.html);

  revalidatePath("/requirements");
  revalidatePath(`/industry/${mentor.id}`);

  return {
    ok: true,
    requirementId,
    mentorName: mentor.full_name,
    email: sent.ok
      ? { sent: true }
      : {
          sent: false,
          reason:
            sent.error === "RESEND_API_KEY is not set"
              ? "email delivery isn't set up yet"
              : "the email service rejected it",
        },
  };
}
