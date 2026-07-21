// Show Groq rate-limit usage without seeding anything.
// One tiny request, then print how much of each per-minute period is consumed.
// Run: npm run showUsage

const key = process.env.GROQ_API_KEY;
if (!key) {
  console.error("GROQ_API_KEY not set. Add it to .env.local.");
  process.exit(1);
}

const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
  body: JSON.stringify({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1,
    messages: [{ role: "user", content: "hi" }],
  }),
});

if (!res.ok) {
  console.error(`Groq returned ${res.status} ${res.statusText}.`);
  process.exit(1);
}

const pct = (kind) => {
  const limit = Number(res.headers.get(`x-ratelimit-limit-${kind}`));
  const remaining = Number(res.headers.get(`x-ratelimit-remaining-${kind}`));
  if (!limit) return `${kind}: n/a`;
  const used = (((limit - remaining) / limit) * 100).toFixed(1);
  return `${kind}: ${used}% used (${remaining}/${limit} left)`;
};

console.log(`Groq usage — ${pct("requests")} | ${pct("tokens")}`);
