import { handleActivity } from "@/lib/activities/handleActivity";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleActivity(request);
}
