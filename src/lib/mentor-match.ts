// Mentor recommendations for the "Post a requirement" form.
//
// ponytail: transparent rule-based scoring rather than an ML/LLM call. It runs in
// the browser on every keystroke with no network hop, every suggestion can be
// explained in one line, and there is no per-request cost or API key. The ceiling
// is vocabulary: a field of work missing from CONCEPTS below is only matched by
// literal word overlap. Add a row there when a new field starts coming up.
//
// This file is deliberately framework-free (no React, no "@/" imports) so the
// same code runs in the browser and in scripts/check-mentor-match.mjs.

// ── Types ───────────────────────────────────────────────────────────────────

export interface MentorEvent {
  name: string;
  domain: string;
  notes: string | null;
  role: string | null;
  start: string | null;
  end: string | null;
}

export interface MentorSignal {
  id: string;
  name: string;
  designation: string | null;
  company: string | null;
  education: string | null;
  notes: string | null;
  domains: string[];
  minCost: number | null;
  hasEmail: boolean;
  events: MentorEvent[]; // events they attended, from past_events
  commitments: { label: string; start: string | null; end: string | null }[];
  accepted: number; // earlier requests they accepted
  rejected: number; // earlier requests they declined
}

export interface EventInput {
  domain: string;
  description: string;
  sponsorship: string;
  startDate: string; // yyyy-mm-dd or ""
  endDate: string;
  offer: number | null; // what the college is offering the mentor
}

export interface Recommendation {
  id: string;
  name: string;
  designation: string | null;
  company: string | null;
  domains: string[];
  minCost: number | null;
  eventCount: number;
  score: number; // 0-100
  tagline: string;
  cautions: string[];
}

export type RankResult =
  | { state: "idle" }
  | { state: "none" }
  | { state: "ok"; items: Recommendation[] };

// ── Vocabulary ──────────────────────────────────────────────────────────────
// Each concept groups the many ways people write the same field ("ML", "machine
// learning", "deep learning" are all `ai`). Concepts in one family are related:
// a data-science mentor is a reasonable, if weaker, suggestion for an AI event.

const CONCEPTS: Record<string, { label: string; family: string; terms: string[] }> = {
  ai: {
    label: "AI/ML",
    family: "ai-data",
    terms: ["ai", "artificial intelligence", "ml", "machine learning", "deep learning", "neural network", "nlp", "natural language processing", "llm", "generative ai", "genai", "computer vision", "chatbot", "prompt engineering"],
  },
  data: {
    label: "Data",
    family: "ai-data",
    terms: ["data", "data science", "data analytics", "analytics", "big data", "data engineering", "business intelligence", "bi", "statistics", "data visualization", "visualization", "database", "sql"],
  },
  web: {
    label: "Web",
    family: "software",
    terms: ["web", "web dev", "web development", "frontend", "front end", "backend", "back end", "full stack", "fullstack", "javascript", "typescript", "html", "css", "nextjs", "reactjs", "nodejs", "website"],
  },
  mobile: {
    label: "Mobile",
    family: "software",
    terms: ["mobile", "android", "ios", "flutter", "react native", "app development", "app dev", "mobile app"],
  },
  cloud: {
    label: "Cloud",
    family: "software",
    terms: ["cloud", "cloud computing", "devops", "aws", "azure", "gcp", "kubernetes", "docker", "sre", "serverless"],
  },
  software: {
    label: "Software",
    family: "software",
    terms: ["software", "software engineering", "programming", "coding", "algorithms", "competitive programming", "dsa", "open source", "python", "java", "developer"],
  },
  security: {
    label: "Cybersecurity",
    family: "security",
    terms: ["cyber", "cybersecurity", "cyber security", "security", "infosec", "information security", "ethical hacking", "hacking", "pentest", "penetration testing", "cryptography", "ctf", "forensics"],
  },
  blockchain: {
    label: "Blockchain",
    family: "fintech",
    terms: ["blockchain", "web3", "crypto", "cryptocurrency", "smart contract", "ethereum", "nft", "defi"],
  },
  finance: {
    label: "Finance",
    family: "fintech",
    terms: ["finance", "fintech", "banking", "investment", "trading", "accounting", "stock market", "insurance"],
  },
  iot: {
    label: "IoT",
    family: "hardware",
    terms: ["iot", "internet of things", "embedded", "embedded systems", "arduino", "raspberry pi", "sensors", "microcontroller", "firmware"],
  },
  robotics: {
    label: "Robotics",
    family: "hardware",
    terms: ["robotics", "robot", "automation", "drone", "uav", "mechatronics", "ros"],
  },
  electronics: {
    label: "Electronics",
    family: "hardware",
    terms: ["electronics", "vlsi", "semiconductor", "circuit", "pcb", "fpga", "ece", "eee", "chip design"],
  },
  arvr: {
    label: "AR/VR & gaming",
    family: "immersive",
    terms: ["ar", "vr", "xr", "augmented reality", "virtual reality", "metaverse", "game", "gaming", "game dev", "game development", "unity", "unreal"],
  },
  design: {
    label: "Design",
    family: "design",
    terms: ["design", "ui", "ux", "ui ux", "user experience", "user interface", "product design", "graphic design", "graphics", "figma", "creative"],
  },
  product: {
    label: "Product",
    family: "business",
    terms: ["product", "product management", "product manager", "roadmap", "saas"],
  },
  startup: {
    label: "Startups",
    family: "business",
    terms: ["startup", "entrepreneurship", "entrepreneur", "founder", "venture", "incubation", "pitch", "innovation", "ideathon", "business plan", "bootstrapping"],
  },
  marketing: {
    label: "Marketing",
    family: "business",
    terms: ["marketing", "branding", "sales", "growth hacking", "advertising", "digital marketing", "seo", "social media"],
  },
  consulting: {
    label: "Consulting",
    family: "business",
    terms: ["consulting", "strategy", "human resources"],
  },
  health: {
    label: "Healthcare",
    family: "life-sciences",
    terms: ["health", "healthcare", "medical", "biotech", "biotechnology", "bioinformatics", "pharma", "biomedical", "medtech"],
  },
  mobility: {
    label: "Automotive & mechanical",
    family: "core-engineering",
    terms: ["automotive", "electric vehicle", "ev", "mechanical", "manufacturing", "aerospace", "aviation", "civil", "structural", "cad"],
  },
  energy: {
    label: "Energy",
    family: "core-engineering",
    terms: ["energy", "renewable", "solar", "power systems", "smart grid", "battery"],
  },
  sustainability: {
    label: "Sustainability",
    family: "core-engineering",
    terms: ["sustainability", "climate", "green", "environment", "clean tech"],
  },
  network: {
    label: "Networking & telecom",
    family: "telecom",
    terms: ["network", "networking", "5g", "telecom", "wireless", "communication", "communications"],
  },
  education: {
    label: "Education & research",
    family: "academia",
    terms: ["education", "edtech", "teaching", "research", "academia", "pedagogy"],
  },
};

// Longest first, so "machine learning" is consumed before a bare "learning".
const TERMS: Array<[string, string]> = [];
for (const [concept, def] of Object.entries(CONCEPTS)) {
  for (const t of def.terms) {
    TERMS.push([t, concept]);
    if (!t.endsWith("s")) TERMS.push([t + "s", concept]);
  }
}
TERMS.sort((a, b) => b[0].length - a[0].length);

const STOP = new Set([
  "and", "the", "for", "with", "from", "that", "this", "our", "your", "you", "are", "will", "need", "needs",
  "needed", "looking", "event", "events", "day", "days", "dev", "development", "tech", "technology",
  "technical", "engineering", "based", "about", "into", "who", "can", "should", "have", "has", "also",
  "more", "new", "all", "any", "using", "use", "etc", "year", "annual", "club", "department", "college",
  "students", "student", "faculty", "srm", "srmist", "like", "such", "per", "its", "their", "they",
]);

// Words that name the *kind* of event rather than its subject. They still help
// (a mentor who has judged hackathons is a fit for a hackathon) but must not
// dilute the score of someone who is an excellent match on the actual domain.
const KIND = new Set([
  "hackfest", "competition", "contest", "symposium", "conference", "summit", "workshop", "seminar",
  "webinar", "challenge", "bootcamp", "meetup", "expo", "conclave", "olympiad", "championship",
  "fest", "festival",
]);
const isKind = (t: string) => KIND.has(t) || t.endsWith("athon");

const RELATED = 0.45; // a same-family concept counts for this fraction of an exact one

// ── Text analysis ───────────────────────────────────────────────────────────

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function stem(t: string): string {
  if (t.length <= 4) return t;
  if (t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.endsWith("ing") && t.length > 5) return t.slice(0, -3);
  if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

const tokens = (text: string) =>
  norm(text)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t))
    .map(stem);

// Pull the known concepts out of free text; `rest` is what was left over, so
// words that are not in the vocabulary can still be matched literally.
function extract(text: string): { concepts: Set<string>; rest: string } {
  let s = ` ${norm(text)} `;
  const concepts = new Set<string>();
  for (const [term, concept] of TERMS) {
    const needle = ` ${term} `;
    if (!s.includes(needle)) continue;
    concepts.add(concept);
    while (s.includes(needle)) s = s.split(needle).join(" ");
  }
  return { concepts, rest: s.trim() };
}

type Role = "judge" | "guest" | "sponsor" | "mentor";

const ROLE_WORDS: Array<[Role, RegExp]> = [
  ["judge", /\b(judg\w*|jury|evaluat\w*|assess\w*)\b/],
  ["guest", /\b(chief guest|guest of honou?r|inaugur\w*|keynote|valedictor\w*|speakers?|talk)\b/],
  ["sponsor", /\b(sponsor\w*|funding|grant|patron\w*)\b/],
  ["mentor", /\b(workshop|train\w*|bootcamp|hands on|mentor\w*|coach\w*|masterclass|lecture)\b/],
];

function roleOf(raw: string | null): Role | null {
  const t = norm(raw ?? "");
  if (!t) return null;
  if (/judg|jury|evaluat/.test(t)) return "judge";
  if (/chief|guest|keynote|speaker|inaugur|talk|panel/.test(t)) return "guest";
  if (/sponsor|fund|patron/.test(t)) return "sponsor";
  if (/mentor|train|workshop|coach|lectur/.test(t)) return "mentor";
  return null;
}

const SENIOR = /\b(vp|vice president|svp|evp|director|head|chief|cto|ceo|cio|coo|cxo|founder|co founder|cofounder|president|partner|managing|general manager)\b/;
const LEAD = /\b(lead|manager|senior|principal|architect|staff|specialist|consultant|scientist|expert)\b/;

const ROLE_VERB: Record<Role, string> = {
  judge: "has judged before",
  guest: "has been a chief guest before",
  sponsor: "has sponsored before",
  mentor: "has mentored before",
};

// ── Dates ───────────────────────────────────────────────────────────────────

const DAY = 86400000;

function parseDay(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : Math.floor(t / DAY);
}

// ── Event analysis ──────────────────────────────────────────────────────────

interface Unit {
  type: "concept" | "literal" | "kind";
  key: string;
  weight: number;
}

export interface EventProfile {
  units: Unit[]; // what the domain field says, in matchable pieces
  secondary: string[]; // extra concepts only the description/sponsorship mention
  roles: Set<Role>;
  days: number | null;
  start: number | null;
  end: number | null;
  offer: number | null;
  hasSignal: boolean;
}

export function analyzeEvent(input: EventInput): EventProfile {
  const dom = extract(input.domain);
  const txt = extract(`${input.description} ${input.sponsorship}`);

  const units: Unit[] = [];
  for (const key of dom.concepts) units.push({ type: "concept", key, weight: 1 });
  for (const key of new Set(tokens(dom.rest))) {
    const kind = isKind(key);
    units.push({ type: kind ? "kind" : "literal", key, weight: kind ? 0.3 : 0.6 });
  }

  const secondary = [...txt.concepts].filter((c) => !dom.concepts.has(c));

  const roleText = norm(`${input.domain} ${input.description}`);
  const roles = new Set<Role>();
  for (const [role, re] of ROLE_WORDS) if (re.test(roleText)) roles.add(role);
  // Asking for sponsorship means they want a sponsor, whatever the description says.
  if (input.sponsorship.trim()) roles.add("sponsor");

  let start = parseDay(input.startDate);
  let end = parseDay(input.endDate);
  if (start === null && end !== null) start = end;
  if (start !== null && (end === null || end < start)) end = start;
  const days = start !== null && end !== null ? end - start + 1 : null;

  return {
    units,
    secondary,
    roles,
    days,
    start,
    end,
    offer: input.offer,
    hasSignal: units.length > 0 || secondary.length > 0,
  };
}

// ── Mentor preparation (done once, not per keystroke) ───────────────────────

interface PreparedEvent {
  name: string;
  domain: string;
  concepts: Set<string>;
  tokens: Set<string>;
  role: Role | null;
}

interface Range {
  label: string;
  start: number;
  end: number;
}

export interface Prepared {
  m: MentorSignal;
  concepts: Map<string, number>; // concept -> how strongly this mentor is tied to it
  families: Map<string, number>;
  tokens: Map<string, number>; // stemmed word -> strength
  events: PreparedEvent[];
  roles: Map<Role, number>;
  maxDays: number;
  dated: Range[];
  senior: boolean;
  lead: boolean;
}

// Evidence is weighted by how much it can be trusted: a domain they listed
// themselves beats one inferred from events they attended, which beats a
// passing mention in their notes.
const DECLARED = 1;
const FROM_EVENTS = 0.85;
const FROM_TEXT = 0.5;

function bump<K>(map: Map<K, number>, key: K, value: number) {
  if (value > (map.get(key) ?? 0)) map.set(key, value);
}

function prepareOne(m: MentorSignal): Prepared {
  const concepts = new Map<string, number>();
  const toks = new Map<string, number>();
  const take = (text: string, strength: number) => {
    const ex = extract(text);
    for (const c of ex.concepts) bump(concepts, c, strength);
    const own = tokens(text);
    for (const t of own) bump(toks, t, strength);
    return { concepts: ex.concepts, tokens: new Set(own) };
  };

  for (const d of m.domains) take(d, DECLARED);

  const events: PreparedEvent[] = [];
  const roles = new Map<Role, number>();
  const dated: Range[] = [];
  let maxDays = 0;

  for (const e of m.events) {
    const got = take(`${e.domain} ${e.name} ${e.notes ?? ""}`, FROM_EVENTS);
    const role = roleOf(e.role);
    if (role) roles.set(role, (roles.get(role) ?? 0) + 1);
    events.push({ name: e.name, domain: e.domain, concepts: got.concepts, tokens: got.tokens, role });

    const s = parseDay(e.start);
    if (s !== null) {
      let en = parseDay(e.end);
      if (en === null || en < s) en = s;
      maxDays = Math.max(maxDays, en - s + 1);
      dated.push({ label: e.name, start: s, end: en });
    }
  }

  // Bookings that are not past events still make someone unavailable.
  for (const c of m.commitments) {
    const s = parseDay(c.start);
    if (s === null) continue;
    let en = parseDay(c.end);
    if (en === null || en < s) en = s;
    dated.push({ label: c.label, start: s, end: en });
  }

  take(`${m.designation ?? ""} ${m.company ?? ""} ${m.notes ?? ""} ${m.education ?? ""}`, FROM_TEXT);

  const families = new Map<string, number>();
  for (const [c, strength] of concepts) bump(families, CONCEPTS[c].family, strength);

  const title = norm(m.designation ?? "");
  return {
    m,
    concepts,
    families,
    tokens: toks,
    events,
    roles,
    maxDays,
    dated,
    senior: SENIOR.test(title),
    lead: LEAD.test(title),
  };
}

export const prepareMentors = (mentors: MentorSignal[]) => mentors.map(prepareOne);

// ── Scoring ─────────────────────────────────────────────────────────────────

const strengthOf = (p: Prepared, concept: string) =>
  Math.max(p.concepts.get(concept) ?? 0, RELATED * (p.families.get(CONCEPTS[concept].family) ?? 0));

// How well the mentor's field matches what the event is about (0..1, or null
// when the form says nothing about the field yet).
function domainScore(p: Prepared, ev: EventProfile): number | null {
  const weighted = (units: Unit[]) => {
    let num = 0;
    let den = 0;
    for (const u of units) {
      const s = u.type === "concept" ? strengthOf(p, u.key) : (p.tokens.get(u.key) ?? 0);
      num += u.weight * s;
      den += u.weight;
    }
    return den > 0 ? num / den : null;
  };

  let secondary: number | null = null;
  if (ev.secondary.length) {
    const top = ev.secondary
      .map((c) => strengthOf(p, c))
      .sort((a, b) => b - a)
      .slice(0, 2);
    secondary = top.reduce((a, b) => a + b, 0) / top.length;
  }

  const hasSubject = ev.units.some((u) => u.type !== "kind");

  if (hasSubject) {
    // The domain field leads; the description can lift or temper it by up to 20%.
    const primary = weighted(ev.units) as number;
    return secondary === null ? primary : 0.8 * primary + 0.2 * secondary;
  }

  // The domain only names a kind of event ("Hackathon"), so the subject has to
  // come from the description ("...an AI hackathon") rather than being ignored.
  const kind = weighted(ev.units);
  if (secondary !== null) return kind === null ? 0.8 * secondary : 0.85 * secondary + 0.15 * kind;
  return kind;
}

function isSimilar(e: PreparedEvent, ev: EventProfile): boolean {
  const hasSubject = ev.units.some((u) => u.type !== "kind");
  for (const u of ev.units) {
    if (u.type === "concept" && e.concepts.has(u.key)) return true;
    if (u.type === "literal" && e.tokens.has(u.key)) return true;
    if (u.type === "kind" && !hasSubject && e.tokens.has(u.key)) return true;
  }
  return ev.units.length === 0 && ev.secondary.some((c) => e.concepts.has(c));
}

function feeFit(min: number | null, offer: number | null): number | null {
  if (offer === null) return null;
  if (min === null) return 0.6; // unknown fee: neither good nor bad
  if (min <= 0) return 1;
  const r = offer / min;
  if (r >= 1) return 1;
  if (r >= 0.85) return 0.7;
  if (r >= 0.6) return 0.35;
  return 0.1;
}

function durationFit(p: Prepared, days: number | null): number | null {
  if (days === null) return null;
  if (days <= 1) return p.events.length > 0 ? 1 : 0.6;
  if (p.maxDays === 0) return 0.5; // no dated history to judge by
  return 0.35 + 0.65 * (Math.min(p.maxDays, days) / days);
}

function roleFit(p: Prepared, roles: Set<Role>): number | null {
  if (roles.size === 0) return null;
  let best = 0;
  for (const role of roles) {
    let s: number;
    if ((p.roles.get(role) ?? 0) > 0) s = 1;
    else if (role === "guest" || role === "sponsor") s = p.senior ? 0.75 : 0.35;
    else s = p.senior || p.lead ? 0.6 : 0.4;
    best = Math.max(best, s);
  }
  return best;
}

const inr = (() => {
  const f = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  return (n: number) => f.format(n);
})();

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const upFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const MIN_DOMAIN = 0.25; // below this a mentor is simply not relevant
const MAX_RESULTS = 6;

// Relative importance of each factor. A factor the form gives no information
// about is dropped and the rest re-balanced, so leaving a field empty never
// counts against a mentor.
const WEIGHTS = { domain: 0.5, fee: 0.18, duration: 0.07, track: 0.15, role: 0.1 };
const CLASH_PENALTY = 0.8;

function recommend(p: Prepared, ev: EventProfile): Recommendation | null {
  const domain = domainScore(p, ev);
  if (domain === null || domain < MIN_DOMAIN) return null;

  const similar = p.events.filter((e) => isSimilar(e, ev));
  const fee = feeFit(p.m.minCost, ev.offer);
  const duration = durationFit(p, ev.days);
  const role = roleFit(p, ev.roles);

  // Track record: relevant experience counts most, then volume, then how
  // readily they have said yes to SRM before.
  const { accepted, rejected } = p.m;
  const responsiveness = (accepted + 1) / (accepted + rejected + 2);
  const track =
    0.5 * (1 - Math.exp(-similar.length / 1.5)) +
    0.2 * (1 - Math.exp(-p.events.length / 2)) +
    0.3 * responsiveness;

  let acc = 0;
  let sum = 0;
  const add = (w: number, s: number | null) => {
    if (s === null) return;
    acc += w * s;
    sum += w;
  };
  add(WEIGHTS.domain, domain);
  add(WEIGHTS.fee, fee);
  add(WEIGHTS.duration, duration);
  add(WEIGHTS.track, track);
  add(WEIGHTS.role, role);

  const clash =
    ev.start !== null && ev.end !== null
      ? p.dated.find((r) => r.start <= (ev.end as number) && (ev.start as number) <= r.end)
      : undefined;

  const score = Math.round(100 * (acc / sum) * (clash ? CLASH_PENALTY : 1));

  return {
    id: p.m.id,
    name: p.m.name,
    designation: p.m.designation,
    company: p.m.company,
    domains: p.m.domains,
    minCost: p.m.minCost,
    eventCount: p.events.length,
    score,
    tagline: tagline(p, ev, similar, domain),
    cautions: cautions(p, ev, clash?.label),
  };
}

// ── Explanations ────────────────────────────────────────────────────────────

function tagline(p: Prepared, ev: EventProfile, similar: PreparedEvent[], domain: number): string {
  const parts: string[] = [];

  // 1. Field of work
  const toks = ev.units.filter((u) => u.type === "literal").map((u) => u.key);
  const matched = p.m.domains.filter((d) => {
    const ex = extract(d);
    const own = new Set(tokens(d));
    return ev.units.some((u) => (u.type === "concept" ? ex.concepts.has(u.key) : toks.includes(u.key) && own.has(u.key)));
  });
  if (matched.length) {
    parts.push(`${matched.slice(0, 2).join(" & ")} specialist`);
  } else if (similar.length) {
    parts.push(`has worked on ${similar[0].domain} events`);
  } else {
    const fams = new Set(ev.units.filter((u) => u.type === "concept").map((u) => CONCEPTS[u.key].family));
    const adjacent = p.m.domains.find((d) => [...extract(d).concepts].some((c) => fams.has(CONCEPTS[c].family)));
    if (adjacent) parts.push(`adjacent expertise in ${adjacent}`);
    else if (domain >= MIN_DOMAIN) parts.push("relevant background in their profile");
  }

  // 2. Experience with similar events
  let judgeCounted = false;
  if (similar.length) {
    const judged = similar.filter((e) => e.role === "judge").length;
    if (judged === similar.length) {
      parts.push(`judged ${plural(judged, "similar event")}`);
      judgeCounted = true;
    } else if (judged > 0) {
      // Keep the full count honest: "judged 1" alone would undersell two events.
      parts.push(`attended ${plural(similar.length, "similar event")} (judged ${judged})`);
      judgeCounted = true;
    } else {
      parts.push(`attended ${plural(similar.length, "similar event")}`);
    }
  } else if (p.events.length) {
    parts.push(`attended ${plural(p.events.length, "SRM event")}`);
  }

  // 3. Role the event is asking for
  for (const role of ev.roles) {
    if ((p.roles.get(role) ?? 0) > 0) {
      if (!(role === "judge" && judgeCounted)) parts.push(ROLE_VERB[role]);
      break;
    }
  }
  if (p.senior && (ev.roles.has("guest") || ev.roles.has("sponsor")) && !parts.some((x) => x.includes("chief guest") || x.includes("sponsored"))) {
    parts.push(`senior leader (${p.m.designation})`);
  }

  // 4. Fee
  const min = p.m.minCost;
  if (ev.offer !== null && min !== null && min > 0 && ev.offer >= min) {
    parts.push(`fee ${inr(min)} within your ${inr(ev.offer)} offer`);
  }

  // 5. Duration
  if (ev.days !== null && ev.days > 1 && p.maxDays >= 2 && Math.min(p.maxDays, ev.days) / ev.days >= 0.5) {
    parts.push("experienced with multi-day events");
  }

  // 6. Something the description asks for beyond the main domain
  const extra = ev.secondary.find((c) => strengthOf(p, c) >= 0.85);
  if (extra) parts.push(`also covers ${CONCEPTS[extra].label}`);

  // 7. Reliability
  if (p.m.accepted >= 1 && p.m.accepted >= p.m.rejected) {
    parts.push(`accepted ${plural(p.m.accepted, "earlier request")}`);
  }

  return upFirst(parts.slice(0, 4).join(", ") || "Relevant match from the directory");
}

function cautions(p: Prepared, ev: EventProfile, clashWith: string | undefined): string[] {
  const out: string[] = [];
  if (clashWith) out.push(`Possible clash with ${clashWith} on those dates`);
  const min = p.m.minCost;
  if (ev.offer !== null && min !== null && min > ev.offer) {
    out.push(`Minimum fee ${inr(min)} is above your ${inr(ev.offer)} offer`);
  }
  if (p.m.rejected >= 2 && p.m.rejected > p.m.accepted) {
    out.push(`Declined ${plural(p.m.rejected, "earlier request")}`);
  }
  if (!p.m.hasEmail) out.push("No email on file, so a request can't be emailed yet");
  return out;
}

// ── Public entry point ──────────────────────────────────────────────────────

export function rankMentors(prepared: Prepared[], ev: EventProfile): RankResult {
  if (!ev.hasSignal) return { state: "idle" };

  const items: Recommendation[] = [];
  for (const p of prepared) {
    const r = recommend(p, ev);
    if (r) items.push(r);
  }
  if (items.length === 0) return { state: "none" };

  items.sort((a, b) => b.score - a.score || b.eventCount - a.eventCount || a.name.localeCompare(b.name));
  return { state: "ok", items: items.slice(0, MAX_RESULTS) };
}

// ── Building signals from database rows (server side) ───────────────────────

export interface ProfileRow {
  id: string;
  full_name: string;
  designation: string | null;
  company: string | null;
  education: string | null;
  notes: string | null;
  domains: string[] | null;
  min_cost: number | string | null;
  email: string | null;
}
export interface EventRow {
  industry_id: string | null;
  name: string;
  domain: string;
  notes: string | null;
  industry_role: string | null;
  start_date: string | null;
  end_date: string | null;
}
export interface RequestRow {
  industry_id: string;
  status: string;
}
export interface CommitmentRow {
  fulfilled_by: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export function buildMentorSignals(
  profiles: ProfileRow[],
  events: EventRow[],
  requests: RequestRow[],
  commitments: CommitmentRow[]
): MentorSignal[] {
  const byId = new Map<string, MentorSignal>();

  for (const p of profiles) {
    byId.set(p.id, {
      id: p.id,
      name: p.full_name,
      designation: p.designation,
      company: p.company,
      education: p.education,
      notes: p.notes,
      domains: p.domains ?? [],
      minCost: p.min_cost === null || p.min_cost === "" ? null : Number(p.min_cost),
      hasEmail: Boolean(p.email && p.email.trim()),
      events: [],
      commitments: [],
      accepted: 0,
      rejected: 0,
    });
  }

  for (const e of events) {
    const m = e.industry_id ? byId.get(e.industry_id) : undefined;
    if (!m) continue;
    m.events.push({
      name: e.name,
      domain: e.domain,
      notes: e.notes,
      role: e.industry_role,
      start: e.start_date,
      end: e.end_date,
    });
  }

  for (const r of requests) {
    const m = byId.get(r.industry_id);
    if (!m) continue;
    if (r.status === "accepted") m.accepted += 1;
    else if (r.status === "rejected") m.rejected += 1;
  }

  for (const c of commitments) {
    const m = c.fulfilled_by ? byId.get(c.fulfilled_by) : undefined;
    if (!m) continue;
    m.commitments.push({
      label: c.description ?? "another confirmed event",
      start: c.start_date,
      end: c.end_date,
    });
  }

  return [...byId.values()];
}
