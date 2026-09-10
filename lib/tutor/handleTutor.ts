import { buildTutorPrompt } from "@/lib/tutor/buildTutorPrompt";
import { validateRequest, validateTutorReply } from "@/lib/tutor/validation";
import { structuredResponse, type TutorConfig } from "@/lib/tutor/llm";
import { replySchema } from "@/lib/tutor/schemas";
import { demoReply } from "@/lib/tutor/demo";
import { readRequest, errorResponse } from "@/lib/tutor/http";
export async function handleTutor(request: Request, config?: TutorConfig) {
  try {
    const { student, topic, turns, demo } = validateRequest(
      await readRequest(request),
    );
    const prompt = buildTutorPrompt(student, topic, turns);
    const reply = demo
      ? demoReply(topic, turns)
      : validateTutorReply(
          await structuredResponse(
            prompt.instructions,
            prompt.input,
            replySchema,
            "tutor_reply",
            request.signal,
            config,
          ),
        );
    return Response.json(
      { ...reply, mode: demo ? "demo" : "ai" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
