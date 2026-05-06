import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "NOT SET";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "NOT SET";

  const urlOk = url !== "NOT SET" && !url.includes("placeholder");
  const keyOk = key !== "NOT SET" && !key.includes("placeholder");

  if (!urlOk || !keyOk) {
    return Response.json({
      error: "Missing env vars",
      NEXT_PUBLIC_SUPABASE_URL: urlOk ? url : "NOT SET or placeholder",
      SUPABASE_SERVICE_ROLE_KEY: keyOk ? "SET (hidden)" : "NOT SET or placeholder",
    });
  }

  // Show partial URL so we can verify it's correct
  const urlPreview = url.slice(0, 40) + "...";

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("contacts").select("id").limit(1);
    if (error) return Response.json({ error: error.message, code: error.code, urlPreview });
    return Response.json({ ok: true, message: "Supabase connected", urlPreview, rowsFound: data.length });
  } catch (err) {
    return Response.json({ error: String(err), urlPreview });
  }
}
