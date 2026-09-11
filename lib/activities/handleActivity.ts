import { getPracticeTopic } from "../tutor/topics";
import "server-only";
import { readRequest, errorResponse } from "../tutor/http";
import { InputError } from "../tutor/validation";
import { generateActivity } from "./generateActivity";
import { generateActivityImage } from "../images/generateActivityImage";
import { localImageConfig, type ImageConfig } from "../images/provider";
import { sceneCache } from "../images/sceneCache";
export async function handleActivity(
  request: Request,
  config: ImageConfig = localImageConfig(),
) {
  try {
    const body = await readRequest(request);
    if (
      !body ||
      (body.topicId !== undefined && !getPracticeTopic(body.topicId)) ||
      body.guardianAcknowledged !== true ||
      !["A1", "A2", "B1"].includes(body.level) ||
      ![0, 1].includes(body.variant) ||
      typeof body.regenerate !== "boolean"
    )
      throw new InputError("Choose a valid picture activity.");
    const activity = generateActivity(
      body.level,
      body.variant,
      body.topicId || "animals",
    );
    const key = [
      activity.id,
      config.provider || "sample",
      !!config.apiKey,
      config.model || "default",
    ].join(":");
    const result = await sceneCache.get(
      key,
      () => generateActivityImage(activity, config),
      body.regenerate,
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
