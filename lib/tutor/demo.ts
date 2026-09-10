import type { Topic } from "./topics";
import type { Turn, TutorReply } from "../types";
// Deliberately limited local sample responses. Never presented as live AI tutoring.
export function demoReply(topic: Topic, turns: Turn[]): TutorReply {
  const latest = turns.at(-1)?.content.toLowerCase() || "";
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
      message: `You can say, “${corrected}” What did you do there?`,
      corrections: [{ original: turns.at(-1)!.content, corrected }],
      newVocabulary: [],
    };
  }
  if (topic.id === "animals" && /dolphin/.test(latest))
    return {
      message:
        "Dolphins are intelligent — that means clever! Why do you like dolphins?",
      corrections: [],
      newVocabulary: ["intelligent"],
    };
  if (topic.id === "animals" && /cute|intelligent|clever/.test(latest))
    return {
      message: "Have you ever seen one in real life?",
      corrections: [],
      newVocabulary: [],
    };
  if (topic.id === "food" && /pizza/.test(latest))
    return {
      message:
        "Pizza has so many tasty toppings! What do you like on your pizza?",
      corrections: [],
      newVocabulary: ["toppings"],
    };
  if (/address|email|school is called/.test(latest))
    return {
      message:
        "You don’t need to share private details here. What is something you like doing?",
      corrections: [],
      newVocabulary: [],
    };
  const count = turns.filter((t) => t.role === "user").length;
  return {
    message:
      topic.followUpQuestions[(count - 1) % topic.followUpQuestions.length],
    corrections: [],
    newVocabulary: [],
  };
}
