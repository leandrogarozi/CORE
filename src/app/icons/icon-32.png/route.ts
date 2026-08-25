import { ICONS } from "@/lib/icon-data";

export async function GET() {
  const body = Buffer.from(ICONS["32"], "base64");
  return new Response(body, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
