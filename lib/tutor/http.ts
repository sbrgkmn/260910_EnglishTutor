import { InputError } from "./validation";
import { ProviderError } from "./llm";
export async function readRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new InputError("Invalid request origin.");
    }
    if (
      originHost !== (request.headers.get("host") || new URL(request.url).host)
    )
      throw new InputError("This request must come from the practice app.");
  }
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new InputError("Use a JSON request.");
  if (Number(request.headers.get("content-length")) > 60000)
    throw new InputError("This conversation is too long.");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 60000)
    throw new InputError("This conversation is too long.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new InputError("Invalid request.");
  }
}
export function errorResponse(error: unknown) {
  const status =
    error instanceof InputError
      ? 400
      : error instanceof ProviderError
        ? error.status
        : 502;
  const message =
    error instanceof InputError || error instanceof ProviderError
      ? error.message
      : "The tutor could not finish. Please try again.";
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
