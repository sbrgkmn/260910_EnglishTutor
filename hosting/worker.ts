import { handleTts, voiceSettings } from "../lib/voice/server";
import { handleTutor } from "../lib/tutor/handleTutor";
import { handleReport } from "../lib/tutor/handleReport";
type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  VOICE_PROVIDER?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
};
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const config = { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL };
    let response: Response;
    if (url.pathname === "/api/tts") {
      const voice = {
        provider: env.VOICE_PROVIDER,
        apiKey: env.ELEVENLABS_API_KEY,
        voiceId: env.ELEVENLABS_VOICE_ID,
      };
      response =
        request.method === "GET"
          ? voiceSettings(voice)
          : request.method === "POST"
            ? await handleTts(request, voice)
            : Response.json({ error: "Method not allowed." }, { status: 405 });
    } else if (
      url.pathname === "/api/tutor" ||
      url.pathname === "/api/report"
    ) {
      if (request.method === "GET" && url.pathname === "/api/tutor")
        response = Response.json({ configured: !!config.apiKey });
      else if (request.method === "POST")
        response = await (url.pathname === "/api/tutor"
          ? handleTutor(request, config)
          : handleReport(request, config));
      else
        response = Response.json(
          { error: "Method not allowed." },
          { status: 405 },
        );
      response.headers.set("Cache-Control", "no-store");
    } else {
      // This app has one prerendered page. All interaction remains in React;
      // the API endpoints above are handled by the same code as Next.js.
      response = await env.ASSETS.fetch(request);
    }
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Permissions-Policy",
      "microphone=(self), camera=(), geolocation=()",
    );
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
