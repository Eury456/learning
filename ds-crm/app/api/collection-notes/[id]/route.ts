import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { id } = await params;
  const { error } = await supabase.from("collection_notes").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
