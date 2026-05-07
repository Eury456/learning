import { getServiceClient } from "@/lib/supabase";

export async function POST() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getServiceClient() as any;

  // Fetch all active + prospect matters with their client
  const { data: matters, error: mErr } = await supabase
    .from("matters")
    .select("id, matter_number, title, status, description, client_id, client:contacts(id,name)")
    .in("status", ["active", "prospect"]);

  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  // Fetch existing projects that were synced from matters (have matter_id set)
  // Graceful: if matter_id column doesn't exist yet, fall back to matching by name
  let existingMatterIds = new Set<string>();
  const { data: existingProjects, error: pErr } = await supabase
    .from("projects")
    .select("matter_id, name");

  if (!pErr && existingProjects) {
    for (const p of existingProjects) {
      if (p.matter_id) existingMatterIds.add(p.matter_id);
    }
  }

  // Also collect existing project names to avoid title duplicates when matter_id column absent
  const existingNames = new Set(
    (existingProjects ?? []).map((p: { name: string }) => p.name.toLowerCase().trim())
  );

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const matter of matters ?? []) {
    // Skip if already synced by matter_id
    if (existingMatterIds.has(matter.id)) { skipped++; continue; }

    // Skip if a project with the same name already exists (fallback dedup)
    if (existingNames.has(matter.title.toLowerCase().trim())) { skipped++; continue; }

    const projectBody: Record<string, unknown> = {
      name:        matter.title,
      status:      matter.status,          // active → active, prospect → prospect
      description: matter.description ?? null,
      developer_id: matter.client_id ?? null,
      zoning_programs: [],
    };

    // Include matter_id if the column exists (schema migration has been run)
    // The insert will simply ignore unknown columns if not present — actually
    // Supabase/Postgres will error, so we catch and retry without it.
    const { error: insertErr } = await supabase
      .from("projects")
      .insert({ ...projectBody, matter_id: matter.id });

    if (insertErr) {
      // Retry without matter_id (migration not yet run)
      const { error: retryErr } = await supabase
        .from("projects")
        .insert(projectBody);
      if (retryErr) {
        errors.push(`"${matter.title}": ${retryErr.message}`);
        continue;
      }
    }

    existingNames.add(matter.title.toLowerCase().trim());
    created++;
  }

  return Response.json({ created, skipped, errors });
}
