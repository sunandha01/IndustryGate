// Run with:  node scripts/check-mentor-match.mjs
// Exercises the mentor-recommendation logic against realistic fixtures.
import assert from "node:assert/strict";
import {
  analyzeEvent,
  buildMentorSignals,
  prepareMentors,
  rankMentors,
  validateEventForRequest,
} from "../src/lib/mentor-match.ts";

const profile = (id, name, extra = {}) => ({
  id,
  full_name: name,
  designation: null,
  company: null,
  education: null,
  notes: null,
  domains: [],
  min_cost: null,
  email: `${id}@example.com`,
  ...extra,
});

const ev = (industry_id, name, domain, extra = {}) => ({
  industry_id,
  name,
  domain,
  notes: null,
  industry_role: null,
  start_date: null,
  end_date: null,
  ...extra,
});

const profiles = [
  profile("ai1", "Asha AI", { designation: "VP Engineering", company: "Neuron Labs", domains: ["AI/ML"], min_cost: 10000 }),
  profile("ai2", "Bala Budget", { designation: "Senior Engineer", domains: ["Machine Learning", "Cloud"], min_cost: 40000 }),
  profile("data1", "Chitra Data", { designation: "Data Scientist", domains: ["Data Science"], min_cost: 8000 }),
  profile("web1", "Dev Web", { designation: "Tech Lead", domains: ["Web Dev"], min_cost: 5000 }),
  profile("none1", "Esha Empty", { email: null }),
  profile("rob1", "Farid Robotics", { designation: "Director", domains: ["Robotics", "IoT"], min_cost: 20000 }),
];

const events = [
  ev("ai1", "Hackfest 2025", "AI", { industry_role: "judge", start_date: "2025-03-10", end_date: "2025-03-12" }),
  ev("ai1", "Neural Nights", "Machine Learning", { industry_role: "judge", start_date: "2025-08-01", end_date: "2025-08-01" }),
  ev("ai2", "Cloud Summit", "Cloud", { industry_role: "guest", start_date: "2025-05-05", end_date: "2025-05-05" }),
  ev("rob1", "RoboWars", "Robotics", { industry_role: "sponsor", start_date: "2026-06-04", end_date: "2026-06-06" }),
  ev(null, "Orphan event", "AI"), // must be ignored, not crash
];

const requests = [
  { industry_id: "ai1", status: "accepted" },
  { industry_id: "ai1", status: "accepted" },
  { industry_id: "ai2", status: "rejected" },
  { industry_id: "ai2", status: "rejected" },
  { industry_id: "ghost", status: "accepted" }, // unknown mentor, must be ignored
];

const mentors = buildMentorSignals(profiles, events, requests, []);
const prepared = prepareMentors(mentors);

const base = { domain: "", description: "", sponsorship: "", startDate: "", endDate: "", offer: null };
const run = (input) => rankMentors(prepared, analyzeEvent({ ...base, ...input }));
const names = (r) => (r.state === "ok" ? r.items.map((i) => i.id) : []);

// ── signal building ──
assert.equal(mentors.length, profiles.length);
assert.equal(mentors.find((m) => m.id === "ai1").events.length, 2, "events attach to their mentor");
assert.equal(mentors.find((m) => m.id === "ai1").accepted, 2);
assert.equal(mentors.find((m) => m.id === "ai2").rejected, 2);
assert.equal(mentors.find((m) => m.id === "none1").hasEmail, false);

// ── nothing typed yet ──
assert.equal(run({}).state, "idle", "empty form shows the prompt, not suggestions");
assert.equal(run({ domain: "   " }).state, "idle");

// ── domain understanding ──
let r = run({ domain: "AI/ML" });
assert.equal(r.state, "ok");
assert.equal(r.items[0].id, "ai1", "the AI specialist with AI events ranks first");
assert.ok(names(r).includes("data1"), "a same-family mentor is still suggested");
assert.ok(names(r).indexOf("data1") > names(r).indexOf("ai1"), "...but below the specialist");
assert.ok(!names(r).includes("web1"), "an unrelated mentor is not suggested");
assert.ok(!names(r).includes("none1"), "an empty profile is not suggested");

r = run({ domain: "Machine Learning" });
assert.equal(r.items[0].id, "ai1", "synonyms resolve to the same concept (ML == AI)");

r = run({ domain: "Web Dev, Robotics" });
assert.ok(names(r).includes("web1") && names(r).includes("rob1"), "multiple domains match either mentor");

r = run({ domain: "Quantum cryptozoology" });
assert.equal(r.state, "none", "an unmatched domain says so instead of guessing");

// ── the description is read, not just the domain ──
r = run({ domain: "Hackathon", description: "A 24 hour AI hackathon, we need judges" });
assert.equal(r.items[0].id, "ai1", "description concepts and 'judges' steer the ranking");
assert.ok(/judged/i.test(r.items[0].tagline), "judge history is called out");

// ── fee fit ──
r = run({ domain: "AI/ML", offer: 12000 });
assert.ok(!r.items.find((i) => i.id === "ai1").cautions.some((c) => /above/.test(c)), "affordable mentor has no fee warning");
// Same domain strength for both, so the only real difference is the fee.
r = run({ domain: "AI/ML", offer: 12000 });
const costly = r.items.find((i) => i.id === "ai2");
assert.ok(costly.cautions.some((c) => /Minimum fee/.test(c)), "mentor above budget is flagged");
assert.ok(r.items.find((i) => i.id === "ai1").score > costly.score, "affordable beats unaffordable");
assert.ok(/within your/.test(r.items.find((i) => i.id === "ai1").tagline), "tagline mentions the fee fit");

// ── duration ──
const oneDay = run({ domain: "Robotics", startDate: "2026-09-01", endDate: "2026-09-01" }).items.find((i) => i.id === "rob1");
const threeDay = run({ domain: "Robotics", startDate: "2026-09-01", endDate: "2026-09-03" }).items.find((i) => i.id === "rob1");
assert.ok(/multi-day/.test(threeDay.tagline), "multi-day experience is credited for a multi-day event");
assert.ok(!/multi-day/.test(oneDay.tagline), "...and not for a one-day event");

// ── date clash ──
r = run({ domain: "Robotics", startDate: "2026-06-05", endDate: "2026-06-07" });
const clashed = r.items.find((i) => i.id === "rob1");
assert.ok(clashed.cautions.some((c) => /clash/i.test(c)), "overlapping dates raise a clash warning");
const free = run({ domain: "Robotics", startDate: "2026-07-05", endDate: "2026-07-07" }).items.find((i) => i.id === "rob1");
assert.ok(!free.cautions.some((c) => /clash/i.test(c)), "non-overlapping dates do not");
assert.ok(free.score > clashed.score, "a clash lowers the score");

// ── sponsorship ask implies a sponsor ──
r = run({ domain: "Robotics", sponsorship: "Cash and prizes" });
assert.ok(/sponsored before/.test(r.items.find((i) => i.id === "rob1").tagline), "sponsor history surfaces when sponsorship is requested");

// ── cautions & tagline shape ──
r = run({ domain: "AI/ML" });
for (const i of r.items) {
  assert.ok(i.score >= 0 && i.score <= 100, `score in range: ${i.score}`);
  assert.ok(i.tagline.length > 0, "every suggestion explains itself");
  assert.ok(i.tagline[0] === i.tagline[0].toUpperCase(), "tagline starts capitalised");
}
assert.ok(r.items[0].tagline.includes(","), "tagline is comma separated");

// ── the event name is read too ──
r = run({ name: "National Robotics Challenge", domain: "Hackathon" });
assert.equal(r.state, "ok");
assert.ok(names(r).includes("rob1"), "a robotics event name finds the robotics mentor even when the domain says only 'Hackathon'");

// ── Send-request gate: what must be filled in, and the message when it is not ──
const full = { name: "Hackfest 2026", domain: "AI", description: "Hackathon", startDate: "2026-11-10", endDate: "2026-11-12", offer: 5000 };
assert.equal(validateEventForRequest(full), null, "a complete event can be sent");
assert.equal(validateEventForRequest({ ...full, offer: 0 }), null, "a fee of zero is still a fee");
assert.equal(
  validateEventForRequest({ name: "", domain: "", description: "", startDate: "", endDate: "", offer: null }),
  "Add event name, domain, start date, end date, fee offered and description to send a request",
  "everything missing is listed"
);
assert.equal(validateEventForRequest({ ...full, endDate: "", offer: null }), "Add end date and fee offered to send a request", "names exactly what is missing");
assert.equal(validateEventForRequest({ ...full, name: "  " }), "Add event name to send a request", "a blank event name does not count");
assert.equal(validateEventForRequest({ ...full, description: "   " }), "Add description to send a request", "whitespace does not count as filled");
assert.equal(validateEventForRequest({ ...full, startDate: "2026-11-12", endDate: "2026-11-10" }), "The end date is before the start date");
assert.equal(validateEventForRequest({ ...full, startDate: "not-a-date" }), "Enter valid start and end dates");
assert.equal(validateEventForRequest({ ...full, offer: -5 }), "The fee can't be negative");
assert.equal(validateEventForRequest({ ...full, sponsorship: "", prize: null }), null, "sponsorship and prize pool stay optional");

// ── the Send button needs to know who can actually be emailed ──
r = run({ domain: "Machine Learning" });
assert.equal(r.items.find((i) => i.id === "ai1").hasEmail, true);
const noMail = buildMentorSignals([profile("nm", "No Mail", { domains: ["AI"], email: "  " })], [], [], []);
const nm = rankMentors(prepareMentors(noMail), analyzeEvent({ ...base, domain: "AI" }));
assert.equal(nm.items[0].hasEmail, false, "a blank email counts as no email");

// ── robustness ──
assert.doesNotThrow(() => run({ domain: "AI", startDate: "garbage", endDate: "2026-02-31" }));
assert.doesNotThrow(() => run({ domain: "AI", startDate: "2026-09-05", endDate: "2026-09-01" }), "end before start does not crash");
assert.doesNotThrow(() => run({ domain: "<script>alert(1)</script> & ::: --" }));
assert.equal(rankMentors([], analyzeEvent({ ...base, domain: "AI" })).state, "none", "empty directory is handled");
assert.ok(run({ domain: "AI" }).items.length <= 6, "result list is capped");

console.log("mentor-match: all checks passed");
