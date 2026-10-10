"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Badge, Card, money } from "@/components/ui";
import {
  analyzeEvent,
  prepareMentors,
  rankMentors,
  validateEventForRequest,
  type EventInput,
  type MentorSignal,
  type Recommendation,
} from "@/lib/mentor-match";
import {
  sendMentorRequest,
  type SendRequestInput,
  type SendRequestResult,
} from "@/app/requirements/send-request";

const EMPTY: EventInput = {
  name: "",
  domain: "",
  description: "",
  sponsorship: "",
  startDate: "",
  endDate: "",
  offer: null,
  prize: null,
};

const num = (raw: string) => (raw.trim() === "" || Number.isNaN(Number(raw)) ? null : Number(raw));

function readForm(form: HTMLFormElement): EventInput {
  const data = new FormData(form);
  const text = (key: string) => String(data.get(key) ?? "");
  return {
    name: text("event_name"),
    domain: text("domain"),
    description: text("description"),
    sponsorship: text("sponsorship_needed"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    offer: num(text("offer_amount")),
    prize: num(text("prize_pool")),
  };
}

type EmailOutcome = { sent: true } | { sent: false; reason: string };

const primaryBtn =
  "bg-srm-navy text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-srm-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-srm-navy";
const secondaryBtn =
  "border border-srm-navy text-srm-navy text-xs font-medium px-3 py-1.5 rounded-md hover:bg-srm-navy hover:text-white transition-colors";

// Suggests mentors for the requirement being typed, and lets the teacher send
// each one a request. It watches the form inside the nearest [data-mentor-source]
// element rather than owning any of its fields, so the form itself stays as it was.
export default function MentorSuggestions({
  mentors,
  send = sendMentorRequest,
}: {
  mentors: MentorSignal[];
  send?: (input: SendRequestInput) => Promise<SendRequestResult>;
}) {
  const prepared = useMemo(() => prepareMentors(mentors), [mentors]);
  const [input, setInput] = useState<EventInput>(EMPTY);
  const deferred = useDeferredValue(input);
  const result = useMemo(() => rankMentors(prepared, analyzeEvent(deferred)), [prepared, deferred]);

  // The event this teacher is building. Null until the first request posts it;
  // from then on every request attaches to the same one.
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, EmailOutcome>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-mentor-source]");
    const form = root?.querySelector("form");
    if (!root || !form) return;

    const read = () => {
      const next = readForm(form);
      setInput((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    // Deferred a tick: picks up browser autofill / restored values on load, and
    // reads the cleared values after a reset rather than the pre-reset ones.
    const soon = () => setTimeout(read, 0);

    const initial = soon();
    root.addEventListener("input", read);
    root.addEventListener("change", read);
    form.addEventListener("reset", soon);
    return () => {
      clearTimeout(initial);
      root.removeEventListener("input", read);
      root.removeEventListener("change", read);
      form.removeEventListener("reset", soon);
    };
  }, []);

  // Hand the posted event's id to the form, so pressing "Post requirement" later
  // saves onto that same record instead of creating a second one.
  const remember = (id: string) => {
    setRequirementId(id);
    const hidden = document.querySelector<HTMLInputElement>(
      '[data-mentor-source] input[name="requirement_id"]'
    );
    if (hidden) hidden.value = id;
  };

  const problem = validateEventForRequest(input);

  const submit = async (mentor: Recommendation) => {
    if (sendingId) return;
    setSendingId(mentor.id);
    setConfirming(null);
    setErrors((prev) => ({ ...prev, [mentor.id]: "" }));
    try {
      const res = await send({
        mentorId: mentor.id,
        requirementId,
        event: {
          name: input.name ?? "",
          domain: input.domain,
          description: input.description,
          sponsorship: input.sponsorship,
          startDate: input.startDate,
          endDate: input.endDate,
          offer: input.offer,
          prize: input.prize ?? null,
        },
      });
      if (res.requirementId) remember(res.requirementId);
      if (res.ok) setSent((prev) => ({ ...prev, [mentor.id]: res.email }));
      else setErrors((prev) => ({ ...prev, [mentor.id]: res.error }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        [mentor.id]: "Couldn't reach the server. Check your connection and try again.",
      }));
    } finally {
      setSendingId(null);
    }
  };

  const sendControl = (mentor: Recommendation) => {
    const outcome = sent[mentor.id];
    if (outcome) {
      return (
        <p className="text-xs text-green-700">
          Request sent ✓
          {!outcome.sent && (
            <span className="text-amber-700"> — but {outcome.reason}, so they weren&apos;t emailed.</span>
          )}
        </p>
      );
    }
    if (sendingId === mentor.id) {
      return (
        <button type="button" disabled className={primaryBtn}>
          Sending…
        </button>
      );
    }
    if (!mentor.hasEmail) {
      return (
        <>
          <button type="button" disabled className={primaryBtn}>
            Send request
          </button>
          <span className="text-xs text-gray-500">No email on file</span>
        </>
      );
    }
    if (problem) {
      return (
        <>
          <button type="button" disabled className={primaryBtn}>
            Send request
          </button>
          <span className="text-xs text-gray-500">{problem}</span>
        </>
      );
    }
    if (confirming === mentor.id) {
      return (
        <>
          <span className="text-xs text-gray-700">
            Send {money(input.offer)} request to {mentor.name}?
          </span>
          <button type="button" onClick={() => submit(mentor)} className={primaryBtn}>
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="text-xs text-gray-500 underline"
          >
            Cancel
          </button>
        </>
      );
    }
    return (
      <button
        type="button"
        disabled={sendingId !== null}
        onClick={() => setConfirming(mentor.id)}
        className={primaryBtn}
      >
        Send request
      </button>
    );
  };

  return (
    <aside className="mt-8 lg:mt-14 lg:sticky lg:top-24" aria-label="Suggested mentors">
      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-srm-navy">Suggested mentors</h2>
          {result.state === "ok" && (
            <span className="text-xs text-gray-400">
              {result.items.length} {result.items.length === 1 ? "match" : "matches"}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Ranked by domain fit, fee, event duration and past experience. Updates as you type.
        </p>

        {requirementId && (
          <p className="text-xs text-srm-navy bg-srm-gold/20 rounded-md px-3 py-2 mt-3">
            This event is now on the requirements board. Pressing Post requirement saves your
            latest details to it instead of adding a second copy.
          </p>
        )}

        <div className="mt-4" aria-live="polite">
          {result.state === "idle" && (
            <p className="text-sm text-gray-500 py-8 text-center border border-dashed border-card-border rounded-lg">
              Enter the domain and a few details, and mentors from the directory who fit will
              appear here.
            </p>
          )}

          {result.state === "none" && (
            <p className="text-sm text-gray-500 py-8 px-4 text-center border border-dashed border-card-border rounded-lg">
              No mentors in the directory match this event yet.{" "}
              <a
                href="/industry/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-srm-navy underline"
              >
                Add a contact
              </a>
            </p>
          )}

          {result.state === "ok" && (
            <ul className="divide-y divide-card-border lg:max-h-[calc(100vh-17rem)] lg:overflow-y-auto lg:pr-1">
              {result.items.map((mentor) => (
                <li key={mentor.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={`/industry/${mentor.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-srm-navy hover:underline"
                      >
                        {mentor.name}
                      </a>
                      {(mentor.designation || mentor.company) && (
                        <p className="text-sm text-gray-600">
                          {mentor.designation}
                          {mentor.designation && mentor.company ? " · " : ""}
                          {mentor.company}
                        </p>
                      )}
                    </div>
                    <Badge>{mentor.score}% match</Badge>
                  </div>

                  <p className="text-sm text-gray-700 mt-2">{mentor.tagline}</p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {mentor.domains.slice(0, 4).map((d) => (
                      <Badge key={d}>{d}</Badge>
                    ))}
                    {money(mentor.minCost) && (
                      <span className="text-xs text-gray-400 ml-1">From {money(mentor.minCost)}</span>
                    )}
                    {mentor.eventCount > 0 && (
                      <span className="text-xs text-gray-400">
                        · {mentor.eventCount} {mentor.eventCount === 1 ? "event" : "events"} attended
                      </span>
                    )}
                  </div>

                  {mentor.cautions.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {mentor.cautions.map((c) => (
                        <li key={c} className="text-xs text-amber-700">
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <a
                      href={`/industry/${mentor.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={secondaryBtn}
                    >
                      View details
                    </a>
                    {sendControl(mentor)}
                  </div>

                  {errors[mentor.id] && (
                    <p className="text-xs text-red-700 mt-2" role="alert">
                      {errors[mentor.id]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </aside>
  );
}
