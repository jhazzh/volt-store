import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const BUCKET = "digital-goods";
const FILE_PATH = "guides/getting-started.pdf";

// Minimal valid one-page PDF ("Sample digital product").
const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 58>>stream
BT /F1 18 Tf 20 80 Td (Sample digital product) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

// 1. Upload to the private bucket (upsert so re-running is safe).
const up = await supabase.storage
  .from(BUCKET)
  .upload(FILE_PATH, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
if (up.error) {
  console.error("Upload failed:", up.error.message);
  process.exit(1);
}
console.log(`Uploaded ${FILE_PATH}`);

// 2. Insert (or update) the digital product pointing at that file.
const product = {
  name: "Getting Started Guide (PDF)",
  slug: "getting-started-guide",
  description: "A downloadable PDF guide. Instant delivery after purchase.",
  price: 12,
  stock: null, // digital = unlimited
  product_type: "digital",
  delivery_type: "file",
  delivery_value: FILE_PATH,
  image_url: null,
};

const { data, error } = await supabase
  .from("products")
  .upsert(product, { onConflict: "slug" })
  .select("id, slug")
  .single();
if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}
console.log(`Product ready: ${data.slug} (${data.id})`);
