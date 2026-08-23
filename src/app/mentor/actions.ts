"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, siteUrl } from "@/lib/email";

type RespondRow = {
  r_domain: string;
  r_event_name: string | null;
  r_amount: number | null;
  r_email: string | null;
  r_full_name: string;
  r_faculty_email: string | null;
  r_faculty_name: string;
};

// The professional answers a request raised by faculty. All the privileged work
// (status change, mirroring an accepted request into the feed, and reading the
// requesting faculty's address) happens inside the respond_to_request DB
// function — see migrations 005 and 006 for why.
export async function respondToRequest(requestId: string, status: "accepted" | "rejected") {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("respond_to_request", {
    request_id: requestId,
    new_status: status,
  });

  if (error) {
    redirect("/mentor/profile?error=" + encodeURIComponent(error.message));
  }

  const row = (Array.isArray(data) ? data[0] : data) as RespondRow | undefined;

  const verb = status === "accepted" ? "accepted" : "declined";
  const what = row?.r_event_name ?? `an event in the ${row?.r_domain} domain`;
  const amountLine =
    row?.r_amount !== null && row?.r_amount !== undefined
      ? `<p>Agreed amount: <strong>₹${row.r_amount}</strong></p>`
      : "";

  const problems: string[] = [];

  // 1. Confirm back to the professional who just answered.
  if (row?.r_email) {
    const result = await sendEmail(
      row.r_email,
      `SRM Industry Mentor Portal — you ${verb} a request`,
      `<p>Dear ${row.r_full_name},</p>
       <p>This confirms that you have <strong>${verb}</strong> SRM Institute of Science &amp;
       Technology's request for <strong>${what}</strong>.</p>
       ${status === "accepted" ? amountLine : ""}
       ${
         status === "accepted"
           ? "<p>The organising team will reach out shortly with the schedule and other details.</p>"
           : "<p>Thank you for letting us know.</p>"
       }
       <p>Warm regards,<br/>SRM Industry Mentor Portal</p>`
    );
    if (!result.ok) problems.push(`your confirmation (${result.error})`);
  }

  // 2. Tell the faculty member who raised it, so they are not left checking.
  if (row?.r_faculty_email) {
    const result = await sendEmail(
      row.r_faculty_email,
      `${row.r_full_name} ${verb} your request — ${what}`,
      `<p>Dear ${row.r_faculty_name},</p>
       <p><strong>${row.r_full_name}</strong> has <strong>${verb}</strong> your request for
       <strong>${what}</strong>.</p>
       <p>Domain: <strong>${row.r_domain}</strong></p>
       ${status === "accepted" ? amountLine : ""}
       <p>View the full details here:<br/>
       <a href="${siteUrl()}/industry">${siteUrl()}/industry</a></p>
       <p>SRM Industry Mentor Portal</p>`
    );
    if (!result.ok) problems.push(`the notice to ${row.r_faculty_name} (${result.error})`);
  }

  const base = status === "accepted" ? "Request accepted." : "Request declined.";
  const notice = problems.length
    ? `${base} Some emails failed: ${problems.join("; ")}`
    : `${base} SRM has been notified.`;

  revalidatePath("/mentor/profile");
  redirect("/mentor/profile?notice=" + encodeURIComponent(notice));
}
