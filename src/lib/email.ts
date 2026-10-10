// ponytail: one fetch to Resend's REST API instead of pulling in their SDK
// for a single call. Swap providers by changing this file only.
//
// Needs RESEND_API_KEY in .env.local. Without it, sends are skipped rather
// than throwing — accepting a request must never fail just because email did.
export function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false as const, error: "RESEND_API_KEY is not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "SRM Industry Mentor Portal <onboarding@resend.dev>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) return { ok: false as const, error: await res.text() };
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "send failed" };
  }
}

// ── Invitation email ────────────────────────────────────────────────────────
// Shared by every way a request can be raised, so the wording cannot drift.
// Teacher-typed text is escaped: it ends up inside HTML sent to a real person.

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const niceDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export function invitationEmail(o: {
  personName: string;
  facultyName: string;
  domain: string;
  eventName: string | null;
  amount: number | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
}) {
  const what = o.eventName ? esc(o.eventName) : `an event in the ${esc(o.domain)} domain`;
  const dates = o.startDate
    ? o.endDate && o.endDate !== o.startDate
      ? `${niceDate(o.startDate)} to ${niceDate(o.endDate)}`
      : niceDate(o.startDate)
    : null;
  const link = `${siteUrl()}/mentor/profile`;

  return {
    subject: `SRM invitation — ${o.eventName ?? o.domain}`,
    html: `<p>Dear ${esc(o.personName)},</p>
       <p>${esc(o.facultyName)} of SRM Institute of Science &amp; Technology would like to invite you
       to take part in <strong>${what}</strong>.</p>
       <p>Domain: <strong>${esc(o.domain)}</strong></p>
       ${dates ? `<p>Dates: <strong>${dates}</strong></p>` : ""}
       ${o.amount !== null ? `<p>Offered amount: <strong>₹${o.amount}</strong></p>` : ""}
       ${o.notes ? `<p>${esc(o.notes)}</p>` : ""}
       <p>You can accept or decline this invitation here:<br/>
       <a href="${link}">${link}</a></p>
       <p>Sign in with this email address to see the full details under “Requests”.</p>
       <p>Warm regards,<br/>SRM Industry Mentor Portal</p>`,
  };
}
