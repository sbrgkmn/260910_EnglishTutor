import "server-only";
export type ImageConfig = {
  provider?: string;
  apiKey?: string;
  model?: string;
};
export type GeneratedImage = { dataUrl: string };
export interface ImageProvider {
  generate(prompt: string, signal?: AbortSignal): Promise<GeneratedImage>;
}
export function localImageConfig(): ImageConfig {
  return {
    provider: process.env.IMAGE_PROVIDER,
    apiKey: process.env.IMAGE_API_KEY,
    model: process.env.IMAGE_MODEL,
  };
}
export class OpenAIImageProvider implements ImageProvider {
  constructor(private config: ImageConfig) {}
  async generate(prompt: string, signal?: AbortSignal) {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(85000)])
          : AbortSignal.timeout(85000),
        body: JSON.stringify({
          model: this.config.model || "gpt-image-2.5-sunburst",
          prompt,
          n: 1,
          size: "1536x1024",
          quality: "low",
          output_format: "png",
        }),
      },
    );
    if (!response.ok) throw new Error("Image provider unavailable");
    const data = await response.json();
    const image = data?.data?.[0]?.b64_json;
    if (
      typeof image !== "string" ||
      !image ||
      image.length > 8_000_000 ||
      !/^[A-Za-z0-9+/=\r\n]+$/.test(image)
    )
      throw new Error("Image provider returned invalid image");
    return { dataUrl: `data:image/png;base64,${image}` };
  }
}
export function imageProvider(config: ImageConfig): ImageProvider | null {
  return config.provider === "openai" && config.apiKey
    ? new OpenAIImageProvider(config)
    : null;
}
