import { demoQuestions } from "./demoQuestions";
import type { Topic } from "./topics";
import type { Turn, TutorReply } from "../types";
// Deliberately limited local sample responses. Never presented as live AI tutoring.
export function demoReply(topic: Topic, turns: Turn[]): TutorReply {
  const latest = turns.at(-1)?.content.toLowerCase() || "";
  const spoken = turns.filter((turn) => turn.role === "assistant");
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const used = (question: string) => spoken.some((turn) => normalize(turn.content).includes(normalize(question)));
  const nextQuestion = () => [
    ...topic.followUpQuestions,
    ...(demoQuestions[topic.id] || []),
    ...topic.targetVocabulary.map((word) => `Can you make a sentence with “${word}”?`),
    "What was the most interesting thing we talked about?",
    "What would you like to ask me about this topic?",
  ].find((question) => !used(question)
    && !(question === "Why do you like it?" && used("Why do you like dolphins?"))
    && !(question === "Have you ever seen one?" && used("Have you ever seen one in real life?"))
    && !(question === "What do you like on pizza?" && used("What do you like on your pizza?"))) || "We've finished this practice. Tap End to see your recap and choose another topic.";
  // Keep privacy handling ahead of keyword-specific sample replies.
  if (/address|email|school is called/.test(latest))
    return {
      message: `You don’t need to share private details here. ${nextQuestion()}`,
      corrections: [], newVocabulary: [],
    };
  if (!latest)
    return {
      message: `Hello! ${topic.starterQuestions[0]}`,
      corrections: [],
      newVocabulary: [],
    };
  if (
    /^yesterday i go (?:to the )?park(?: with my mother)?[.!]?$/.test(latest)
  ) {
    const corrected = turns
      .at(-1)!
      .content.replace(
        /^yesterday i go (?:to the )?park/i,
        "Yesterday I went to the park",
      );
    return {
      message: `You can say, “${corrected}” ${used("What did you do there?") ? nextQuestion() : "What did you do there?"}`,
      corrections: [{ original: turns.at(-1)!.content, corrected }],
      newVocabulary: [],
    };
  }
  if (topic.id === "animals" && /dolphin/.test(latest) && !used("Why do you like dolphins?") && !used("Why do you like it?"))
    return {
      message:
        "Dolphins are intelligent — that means clever! Why do you like dolphins?",
      corrections: [],
      newVocabulary: ["intelligent"],
    };
  if (topic.id === "animals" && /cute|intelligent|clever/.test(latest) && !used("Have you ever seen one"))
    return {
      message: "Have you ever seen one in real life?",
      corrections: [],
      newVocabulary: [],
    };
  if (topic.id === "food" && /pizza/.test(latest) && !used("What do you like on your pizza?") && !used("What do you like on pizza?"))
    return {
      message:
        "Pizza has so many tasty toppings! What do you like on your pizza?",
      corrections: [],
      newVocabulary: ["toppings"],
    };
  return { message: nextQuestion(), corrections: [], newVocabulary: [] };
}
