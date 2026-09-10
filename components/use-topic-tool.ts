"use client";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { getTopic, topics } from "@/lib/tutor/topics";
type ModelContext = {
  registerTool(
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute(input: unknown): unknown;
    },
    options: { signal: AbortSignal },
  ): void | Promise<void>;
};
// Optional browser capability. No dependency, no network calls, no access to history or consent.
export function useTopicTool(onSelect: (id: string) => void, isHome: boolean) {
  const current = useRef({ onSelect, isHome });
  useEffect(() => {
    current.current = { onSelect, isHome };
  }, [onSelect, isHome]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "select_practice_topic",
            title: "Select an English practice topic",
            description:
              "Select a topic on the setup screen. Does not start a session or acknowledge guardian consent.",
            inputSchema: {
              type: "object",
              properties: {
                topicId: { type: "string", enum: topics.map((t) => t.id) },
              },
              required: ["topicId"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              const data = input as { topicId?: unknown };
              const topic =
                typeof data?.topicId === "string"
                  ? getTopic(data.topicId)
                  : undefined;
              if (!topic) throw new Error("Choose a valid topic ID.");
              if (!current.current.isHome)
                throw new Error("Return to the topic selection screen first.");
              flushSync(() => current.current.onSelect(topic.id));
              return {
                selectedTopic: topic.id,
                title: topic.title,
                sessionStarted: false,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional experimental browser API; the visible UI stays available. */
    }
    return () => lifecycle.abort();
  }, []);
}
