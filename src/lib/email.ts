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
