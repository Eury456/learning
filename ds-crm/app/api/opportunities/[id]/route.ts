import { getServiceClient } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { id } = await params;
  const body = await request.json();
  const { data, error } = await supabase
    .from("opportunities")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(`
      *,
      contact:contacts!opportunities_contact_id_fkey(id,name,company),
      company:companies(id,name),
      referral_contact:contacts!opportunities_referral_contact_id_fkey(id,name,company)
    `)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;
  const { id } = await params;
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
