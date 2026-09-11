import { handleAnswer } from "@/lib/activities/handleAnswer";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleAnswer(request);
}
