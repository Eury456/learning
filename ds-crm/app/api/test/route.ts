import { getServiceClient } from "@/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.includes("placeholder")) {
    return Response.json({ error: "Supabase URL not configured", url });
  }
  if (!key || key.includes("placeholder")) {
    return Response.json({ error: "Supabase service role key not configured" });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.from("contacts").select("id").limit(1);
    if (error) return Response.json({ error: error.message, hint: error.hint });
    return Response.json({ ok: true, message: "Supabase connected", rowsFound: data.length });
  } catch (err) {
    return Response.json({ error: String(err) });
  }
}
