import { handleTts, voiceSettings } from "@/lib/voice/server";
export const runtime = "nodejs";
export async function GET() {
  return voiceSettings();
}
export async function POST(request: Request) {
  return handleTts(request);
}
