"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Badge, Card, money } from "@/components/ui";
import {
  analyzeEvent,
  prepareMentors,
  rankMentors,
  type EventInput,
  type MentorSignal,
} from "@/lib/mentor-match";

const EMPTY: EventInput = {
  domain: "",
  description: "",
  sponsorship: "",
  startDate: "",
  endDate: "",
  offer: null,
};

function readForm(form: HTMLFormElement): EventInput {
  const data = new FormData(form);
  const text = (key: string) => String(data.get(key) ?? "");
  const offer = text("offer_amount").trim();
  return {
    domain: text("domain"),
    description: text("description"),
    sponsorship: text("sponsorship_needed"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    offer: offer === "" || Number.isNaN(Number(offer)) ? null : Number(offer),
  };
}

// Suggests mentors for the requirement being typed. It watches the form inside
// the nearest [data-mentor-source] element rather than owning any of its fields,
// so the form itself stays exactly as it was.
export default function MentorSuggestions({ mentors }: { mentors: MentorSignal[] }) {
  const prepared = useMemo(() => prepareMentors(mentors), [mentors]);
  const [input, setInput] = useState<EventInput>(EMPTY);
  const deferred = useDeferredValue(input);
  const result = useMemo(() => rankMentors(prepared, analyzeEvent(deferred)), [prepared, deferred]);

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
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </aside>
  );
}
