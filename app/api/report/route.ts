import { handleReport } from "@/lib/tutor/handleReport";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleReport(request);
}
