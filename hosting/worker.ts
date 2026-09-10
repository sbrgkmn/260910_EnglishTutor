import { handleTutor } from "../lib/tutor/handleTutor";
import { handleReport } from "../lib/tutor/handleReport";
type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const config = { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL };
    let response: Response;
    if (url.pathname === "/api/tutor" || url.pathname === "/api/report") {
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
      // the two API endpoints above are handled by the same code as Next.js.
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
