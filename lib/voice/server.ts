import "server-only";
import type { VoiceConfig } from "./types";
import { readRequest } from "../tutor/http";
export function localVoiceConfig(): VoiceConfig {
  return {
    provider: process.env.VOICE_PROVIDER,
    apiKey: process.env.ELEVENLABS_API_KEY,
    voiceId: process.env.ELEVENLABS_VOICE_ID,
  };
}
export function effectiveVoiceProvider(config: VoiceConfig) {
  return config.provider === "elevenlabs" && !!config.apiKey && !!config.voiceId
    ? "elevenlabs"
    : "browser";
}
const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export function voiceSettings(config = localVoiceConfig()) {
  return json({ provider: effectiveVoiceProvider(config) });
}
export async function handleTts(
  request: Request,
  config = localVoiceConfig(),
): Promise<Response> {
  let body: unknown;
  try {
    body = await readRequest(request);
  } catch {
    return json({ error: "Invalid speech request." }, 400);
  }
  const value = body as { text?: unknown; guardianAcknowledged?: unknown };
  if (
    !value ||
    value.guardianAcknowledged !== true ||
    typeof value.text !== "string" ||
    !value.text.trim() ||
    value.text.length > 2000
  )
    return json(
      {
        error:
          "Speech requests need acknowledgement and 1–2,000 characters of text.",
      },
      400,
    );
  if (effectiveVoiceProvider(config) !== "elevenlabs")
    return json({ provider: "browser" }, 200);
  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId!)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.apiKey!,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]),
        body: JSON.stringify({
          text: value.text.trim(),
          model_id: "eleven_flash_v2_5",
          language_code: "en",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 0.95,
          },
        }),
      },
    );
    if (
      !upstream.ok ||
      !upstream.body ||
      !upstream.headers.get("content-type")?.startsWith("audio/")
    )
      return json(
        {
          error:
            "Custom voice is unavailable. Browser voice can be used instead.",
        },
        502,
      );
    // Pass through audio only. Never expose vendor headers or provider error bodies.
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json(
      {
        error:
          "Custom voice could not connect. Browser voice can be used instead.",
      },
      502,
    );
  }
}
