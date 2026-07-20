// Turns text into a 384-dim vector. Runs on Supabase Edge Runtime, which is
// the only place the gte-small model is available.
// Deploy: supabase functions deploy embed
const model = new Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "POST only" }, { status: 405 });
  }

  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "text required" }, { status: 400 });
  }

  // gte-small truncates past ~512 tokens; slice first so long descriptions
  // don't silently lose their tail mid-word.
  const embedding = await model.run(text.slice(0, 2000), {
    mean_pool: true,
    normalize: true,
  });

  return Response.json({ embedding });
});
