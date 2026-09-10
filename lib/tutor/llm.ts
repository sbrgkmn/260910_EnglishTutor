import "server-only";
export type TutorConfig = { apiKey?: string; model?: string };
export function localTutorConfig(): TutorConfig {
  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
  };
}
export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function structuredResponse(
  instructions: string,
  input: { role: "user" | "assistant"; content: string }[],
  schema: object,
  name: string,
  signal?: AbortSignal,
  config: TutorConfig = localTutorConfig(),
): Promise<unknown> {
  const key = config.apiKey;
  if (!key)
    throw new ProviderError(
      "AI practice is not configured yet. Set OPENAI_API_KEY in server settings, or choose demo mode.",
      503,
    );
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(45000)])
      : AbortSignal.timeout(45000),
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "gpt-4.1-mini",
      store: false,
      instructions,
      input,
      max_output_tokens: 1800,
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
  });
  if (!response.ok)
    throw new ProviderError(
      response.status === 429
        ? "The tutor is busy. Please wait a moment and try again."
        : response.status === 401
          ? "The API key needs checking. Ask an adult to check the server settings."
          : "The tutor could not connect. Please try again.",
      response.status === 429 ? 429 : 502,
    );
  const data = await response.json();
  if (data.status !== "completed")
    throw new ProviderError(
      "The tutor did not finish its reply. Please try again.",
    );
  const content =
    data.output?.flatMap(
      (item: { content?: { type: string; text?: string }[] }) =>
        item.content || [],
    ) || [];
  const output = content
    .filter((c: { type: string }) => c.type === "output_text")
    .map((c: { text: string }) => c.text)
    .join("");
  if (!output)
    throw new ProviderError("Let’s try a different English practice question.");
  try {
    return JSON.parse(output);
  } catch {
    throw new ProviderError(
      "The tutor returned an incomplete reply. Please try again.",
    );
  }
}
