import { getPracticeTopic } from "../tutor/topics";
import { topicFollowup } from "./topicLessons";
import "server-only";
import { readRequest, errorResponse } from "../tutor/http";
import { InputError, isCorrections } from "../tutor/validation";
import { corePrompt } from "../tutor/corePrompt";
import { levelRules } from "../tutor/levelRules";
import {
  structuredResponse,
  localTutorConfig,
  type TutorConfig,
} from "../tutor/llm";
import { generateActivity } from "./generateActivity";
import { evaluateAnswer } from "./evaluateAnswer";
import type { EvaluationResult, StudentAnswer } from "./activityTypes";
import {
  personalFollowup,
  petChoices,
  type PetChoice,
} from "./personalFollowup";
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["success", "feedback", "corrections", "creative"],
  properties: {
    success: { type: "boolean" },
    feedback: { type: "string" },
    creative: { type: "boolean" },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["original", "corrected"],
        properties: {
          original: { type: "string" },
          corrected: { type: "string" },
        },
      },
    },
  },
};
export async function handleAnswer(
  request: Request,
  config: TutorConfig = localTutorConfig(),
) {
  try {
    const body = await readRequest(request);
    if (
      !body ||
      (body.topicId !== undefined && !getPracticeTopic(body.topicId)) ||
      body.guardianAcknowledged !== true ||
      !["A1", "A2", "B1"].includes(body.level) ||
      !Number.isInteger(body.age) ||
      body.age < 7 ||
      body.age > 12 ||
      ![0, 1].includes(body.variant)
    )
      throw new InputError("Choose a valid activity and age.");
    const activity = generateActivity(
      body.level,
      body.variant,
      body.topicId || "animals",
    );
    let q = activity.questions.find((q) => q.id === body.questionId);
    if (
      q &&
      activity.topic === "animals" &&
      body.questionId === "pet-followup"
    ) {
      if (body.petChoice !== undefined && !petChoices.includes(body.petChoice))
        throw new InputError("Choose a valid follow-up.");
      q = personalFollowup(body.petChoice as PetChoice | undefined);
    }
    if (q && body.questionId === "followup") {
      if (
        body.choiceId !== undefined &&
        !activity.scene.objects.some((o) => o.id === body.choiceId)
      )
        throw new InputError("Choose a valid follow-up.");
      q = topicFollowup(activity.topic, body.choiceId);
    }
    const a = body.answer;
    if (
      !q ||
      !a ||
      !["text", "speech", "click"].includes(a.type) ||
      (a.type === "click"
        ? typeof a.objectId !== "string" ||
          !activity.scene.objects.some((o) => o.id === a.objectId)
        : typeof a.text !== "string" || !a.text.trim() || a.text.length > 1000)
    )
      throw new InputError("Send an answer for this question.");
    const answer = a as StudentAnswer;
    let result = evaluateAnswer(activity, q, answer);
    if (
      config.apiKey &&
      answer.type !== "click" &&
      !/\b(address|email|phone number|school is called)\b/i.test(answer.text)
    ) {
      try {
        const response = (await structuredResponse(
          [
            corePrompt,
            levelRules[body.level as "A1" | "A2" | "B1"],
            `For this visual activity, evaluate the single finished answer. Game success is based on meaning, never grammatical accuracy. Accept short answers and synonyms. For personal opinions there is no wrong preference; uncertainty is a good attempt, not a factual success. Give one brief natural spoken feedback sentence, including any useful correction. Do not ask a question: the game supplies the next question. Do not invent image content. Only use this authored scene and question: ${JSON.stringify({ objects: activity.scene.objects, question: q })}`,
          ].join("\n\n"),
          [{ role: "user", content: answer.text }],
          schema,
          "activity_feedback",
          request.signal,
          config,
        )) as Partial<EvaluationResult>;
        if (
          typeof response.success !== "boolean" ||
          typeof response.feedback !== "string" ||
          response.feedback.length > 800 ||
          !response.feedback.trim() ||
          !isCorrections(response.corrections) ||
          typeof response.creative !== "boolean"
        )
          throw new Error("Invalid evaluation");
        result = { ...result, ...response, source: "ai" } as EvaluationResult;
        // Vocabulary is grounded in the child's words; the model cannot award arbitrary points.
        result.vocabularyBonus =
          result.success &&
          evaluateAnswer(activity, { ...q, type: "personal" }, answer)
            .vocabularyBonus;
      } catch {
        /* Known local semantics remain usable when the provider is unavailable. */
      }
    }
    return Response.json(
      { result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
