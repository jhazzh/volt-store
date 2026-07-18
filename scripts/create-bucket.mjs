import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "digital-goods";

// Private bucket for purchased files. Served only via short-lived signed URLs
// minted in /api/download after an ownership + paid check.
const { error } = await supabase.storage.createBucket(BUCKET, {
  public: false,
  fileSizeLimit: "50MB",
});

if (error && !/already exists/i.test(error.message)) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(error ? `Bucket "${BUCKET}" already exists.` : `Created private bucket "${BUCKET}".`);
