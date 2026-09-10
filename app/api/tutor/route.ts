import { handleTutor } from "@/lib/tutor/handleTutor";
export const runtime = "nodejs";
export async function GET() {
  return Response.json(
    { configured: !!process.env.OPENAI_API_KEY },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  return handleTutor(request);
}
