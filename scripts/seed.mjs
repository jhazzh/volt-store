import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } }
);

const categories = [
  { name: "Audio", slug: "audio" },
  { name: "Wearables", slug: "wearables" },
  { name: "Accessories", slug: "accessories" },
  { name: "Gaming", slug: "gaming" },
  { name: "Home", slug: "home" },
  { name: "Cameras", slug: "cameras" },
];

// [name, slug, description, price, stock, image-key, category]. The image-key
// picks a verified photo from `photos` below, so every image is correct.
const products = [
  // Audio
  ["Nimbus Headphones", "nimbus-headphones", "Over-ear ANC headphones with 40h battery.", 189, 24, "headphones", "audio"],
  ["Pulse Earbuds", "pulse-earbuds", "True wireless earbuds, IPX5, low-latency mode.", 89, 60, "earbuds", "audio"],
  ["Echo Mini Speaker", "echo-mini-speaker", "Pocket bluetooth speaker with punchy bass.", 49, 35, "speaker", "audio"],
  ["Sonic Studio Monitors", "sonic-studio-monitors", "Powered desktop studio speakers, 4-inch woofers.", 179, 20, "monitors", "audio"],
  ["Halo Open-Ear Headphones", "halo-open-ear-headphones", "Open-back headphones for airy, natural sound.", 219, 18, "headphones", "audio"],
  ["Pebble Sport Earbuds", "pebble-sport-earbuds", "Secure-fit earbuds for workouts, IPX7.", 69, 75, "earbuds", "audio"],
  ["Boom Party Speaker", "boom-party-speaker", "Loud portable speaker with 24h playtime.", 129, 22, "speaker", "audio"],
  ["Nova Bookshelf Speakers", "nova-bookshelf-speakers", "Compact hi-fi bookshelf pair, wood finish.", 259, 14, "monitors", "audio"],
  ["Whisper Noise Buds", "whisper-noise-buds", "ANC earbuds with adaptive transparency.", 149, 40, "earbuds", "audio"],

  // Wearables
  ["Orbit Watch S", "orbit-watch-s", "AMOLED smartwatch, GPS, 7-day battery.", 249, 18, "watch", "wearables"],
  ["Stride Band", "stride-band", "Slim fitness tracker with sleep insights.", 59, 80, "band", "wearables"],
  ["Orbit Watch Pro", "orbit-watch-pro", "Titanium smartwatch, LTE, dual-band GPS.", 399, 12, "watch", "wearables"],
  ["Pace Running Watch", "pace-running-watch", "Lightweight GPS watch for runners.", 179, 30, "watch", "wearables"],
  ["Vital Health Band", "vital-health-band", "Tracker with ECG and blood-oxygen sensing.", 99, 50, "band", "wearables"],
  ["Nimbus Kids Watch", "nimbus-kids-watch", "Playful smartwatch with GPS and calls.", 89, 45, "watch", "wearables"],
  ["Flow Sleep Band", "flow-sleep-band", "Comfortable band focused on sleep tracking.", 49, 60, "band", "wearables"],

  // Accessories
  ["Volt Charger 65W", "volt-charger-65w", "GaN USB-C charger, dual port.", 39, 100, "charger", "accessories"],
  ["Drift Mouse Pro", "drift-mouse-pro", "Ergonomic wireless mouse, 4000 DPI.", 69, 45, "mouse", "accessories"],
  ["Atlas Backpack", "atlas-backpack", "Water-resistant 20L tech backpack.", 99, 22, "backpack", "accessories"],
  ["Volt Charger 100W", "volt-charger-100w", "Four-port GaN charger for laptops.", 59, 70, "charger", "accessories"],
  ["Volt Power Bank 20K", "volt-power-bank-20k", "20,000mAh USB-C power bank, fast charge.", 49, 90, "charger", "accessories"],
  ["Drift Mouse Lite", "drift-mouse-lite", "Compact silent wireless mouse.", 39, 65, "mouse", "accessories"],
  ["Glide Vertical Mouse", "glide-vertical-mouse", "Vertical mouse for wrist comfort.", 55, 40, "mouse", "accessories"],
  ["Atlas Sling Bag", "atlas-sling-bag", "Compact crossbody bag for daily carry.", 59, 35, "backpack", "accessories"],
  ["Summit Travel Backpack", "summit-travel-backpack", "35L carry-on backpack with laptop sleeve.", 139, 18, "backpack", "accessories"],
  ["Cable Organizer Kit", "cable-organizer-kit", "Braided cables and pouch for travel.", 25, 120, "charger", "accessories"],

  // Gaming
  ["Apex Mechanical Keyboard", "apex-mechanical-keyboard", "Hot-swap RGB keyboard, tactile switches.", 129, 40, "keyboard", "gaming"],
  ["Vortex Gaming Headset", "vortex-gaming-headset", "7.1 surround headset with boom mic.", 99, 33, "headset", "gaming"],
  ["Blaze Controller", "blaze-controller", "Wireless controller with hall-effect sticks.", 59, 55, "controller", "gaming"],
  ["Apex TKL Keyboard", "apex-tkl-keyboard", "Tenkeyless hot-swap board, PBT keycaps.", 109, 45, "keyboard", "gaming"],
  ["Apex 60% Keyboard", "apex-60-keyboard", "Compact 60% layout, gasket mount.", 99, 38, "keyboard", "gaming"],
  ["Vortex Pro Headset", "vortex-pro-headset", "Wireless headset, low-latency dongle.", 149, 25, "headset", "gaming"],
  ["Blaze Arcade Stick", "blaze-arcade-stick", "Fight stick with clicky microswitches.", 129, 15, "controller", "gaming"],
  ["Blaze Controller Elite", "blaze-controller-elite", "Pro controller with back paddles.", 99, 28, "controller", "gaming"],

  // Home
  ["Lumen Desk Lamp", "lumen-desk-lamp", "LED desk lamp, adjustable warmth and brightness.", 45, 70, "lamp", "home"],
  ["Brew Precision Kettle", "brew-precision-kettle", "Gooseneck kettle with variable temperature.", 89, 28, "kettle", "home"],
  ["Aura Air Purifier", "aura-air-purifier", "HEPA purifier for rooms up to 40 m2.", 149, 25, "purifier", "home"],
  ["Lumen Floor Lamp", "lumen-floor-lamp", "Dimmable floor lamp with reading arm.", 89, 30, "lamp", "home"],
  ["Lumen Clip Light", "lumen-clip-light", "Clip-on task light, USB-C rechargeable.", 29, 90, "lamp", "home"],
  ["Brew Milk Frother", "brew-milk-frother", "Induction frother for lattes and foam.", 49, 40, "kettle", "home"],
  ["Aura Mini Purifier", "aura-mini-purifier", "Desktop HEPA purifier for small rooms.", 79, 45, "purifier", "home"],
  ["Aura Humidifier", "aura-humidifier", "Ultrasonic humidifier, quiet night mode.", 59, 50, "purifier", "home"],

  // Cameras
  ["Focus Mirrorless Camera", "focus-mirrorless-camera", "24MP mirrorless body, 4K video.", 699, 12, "camera", "cameras"],
  ["Range Zoom Lens 70-200", "range-zoom-lens-70-200", "Fast telephoto zoom, optical stabilization.", 899, 8, "lens", "cameras"],
  ["Scout Action Cam", "scout-action-cam", "Waterproof 5K action camera with stabilization.", 249, 30, "actioncam", "cameras"],
  ["Focus Mirrorless Camera II", "focus-mirrorless-camera-ii", "33MP body with in-body stabilization.", 1099, 8, "camera", "cameras"],
  ["Range Prime Lens 35mm", "range-prime-lens-35mm", "Sharp f/1.8 prime for everyday shooting.", 429, 15, "lens", "cameras"],
  ["Range Wide Lens 16-35", "range-wide-lens-16-35", "Ultra-wide zoom for landscapes.", 999, 6, "lens", "cameras"],
  ["Scout Action Cam Mini", "scout-action-cam-mini", "Tiny 4K action cam for helmets and bikes.", 179, 35, "actioncam", "cameras"],
  ["Focus Vlog Camera", "focus-vlog-camera", "Flip-screen mirrorless for creators.", 599, 14, "camera", "cameras"],

  // --- Batch 2 ---
  // Audio
  ["Nimbus Headphones Lite", "nimbus-headphones-lite", "Lightweight on-ear headphones, 30h battery.", 129, 40, "headphones", "audio"],
  ["Studio Reference Headphones", "studio-reference-headphones", "Closed-back monitors for mixing.", 199, 16, "headphones", "audio"],
  ["Pulse Earbuds Pro", "pulse-earbuds-pro", "ANC earbuds with wireless charging case.", 129, 50, "earbuds", "audio"],
  ["Trek Bluetooth Speaker", "trek-bluetooth-speaker", "Rugged speaker with carabiner clip.", 39, 60, "speaker", "audio"],

  // Wearables
  ["Orbit Watch SE", "orbit-watch-se", "Everyday smartwatch with essentials.", 149, 40, "watch", "wearables"],
  ["Summit GPS Watch", "summit-gps-watch", "Rugged outdoor watch with altimeter.", 299, 16, "watch", "wearables"],
  ["Stride Band 2", "stride-band-2", "Slimmer tracker with brighter display.", 69, 70, "band", "wearables"],
  ["Pulse Heart Band", "pulse-heart-band", "Chest-free 24/7 heart-rate band.", 79, 45, "band", "wearables"],

  // Accessories
  ["Volt Wall Charger 30W", "volt-wall-charger-30w", "Compact single-port GaN charger.", 25, 120, "charger", "accessories"],
  ["Volt Car Charger", "volt-car-charger", "Dual USB-C car charger, 45W.", 29, 90, "charger", "accessories"],
  ["Drift Trackball Mouse", "drift-trackball-mouse", "Thumb-operated trackball, no desk space.", 65, 30, "mouse", "accessories"],
  ["Nomad Camera Bag", "nomad-camera-bag", "Padded sling for camera and two lenses.", 89, 25, "backpack", "accessories"],
  ["Everyday Laptop Bag", "everyday-laptop-bag", "Slim 15-inch laptop backpack.", 79, 40, "backpack", "accessories"],

  // Gaming
  ["Apex Wireless Keyboard", "apex-wireless-keyboard", "Low-profile wireless mechanical board.", 139, 30, "keyboard", "gaming"],
  ["Vortex Studio Headset", "vortex-studio-headset", "Detachable-mic headset for stream + play.", 119, 28, "headset", "gaming"],
  ["Blaze Controller Lite", "blaze-controller-lite", "Budget wireless controller, USB-C.", 39, 70, "controller", "gaming"],
  ["Apex Numpad", "apex-numpad", "Hot-swap macro numpad, RGB.", 49, 45, "keyboard", "gaming"],

  // Home
  ["Lumen Ring Light", "lumen-ring-light", "Adjustable ring light for calls and video.", 39, 60, "lamp", "home"],
  ["Brew Cold Kettle", "brew-cold-kettle", "Double-wall kettle with cold-brew mode.", 99, 22, "kettle", "home"],
  ["Aura Tower Purifier", "aura-tower-purifier", "Tall HEPA purifier for large rooms.", 199, 18, "purifier", "home"],

  // Cameras
  ["Focus Compact Camera", "focus-compact-camera", "Pocket 1-inch sensor compact.", 499, 20, "camera", "cameras"],
  ["Range Macro Lens 90mm", "range-macro-lens-90mm", "1:1 macro prime, weather-sealed.", 649, 10, "lens", "cameras"],
  ["Scout 360 Cam", "scout-360-cam", "Dual-lens 360 action camera.", 329, 20, "actioncam", "cameras"],
  ["Range Portrait Lens 85mm", "range-portrait-lens-85mm", "f/1.4 portrait prime with creamy bokeh.", 799, 9, "lens", "cameras"],
  ["Scout Dive Cam", "scout-dive-cam", "Waterproof to 60m action camera.", 279, 18, "actioncam", "cameras"],
];

const u = (id) =>
  `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop`;

// Per-type verified photos — fallback if a slug has no distinct image below.
const photos = {
  headphones: u("1505740420928-5e560c06d30e"),
  earbuds: u("1590658268037-6bf12165a8df"),
  speaker: u("1608043152269-423dbba4e7e1"),
  watch: u("1523275335684-37898b6baf30"),
  band: u("1575311373937-040b8e1fd5b6"),
  charger: u("1583863788434-e58a36330cf0"),
  mouse: u("1527864550417-7fd91fc51a46"),
  backpack: u("1553062407-98eeb64c6a62"),
  monitors: u("1558537348-c0f8e733989d"),
  keyboard: u("1587829741301-dc798b83add3"),
  headset: u("1599669454699-248893623440"),
  controller: u("1592840496694-26d035b52b48"),
  lamp: u("1507473885765-e6ed057f782c"),
  kettle: u("1594213114663-d94db9b17125"),
  purifier: u("1585771724684-38269d6639fd"),
  camera: u("1516035069371-29a1b244cc32"),
  lens: u("1617005082133-548c4dd27f35"),
  actioncam: u("1526170375885-4d8ecf77b99f"),
};

// Distinct per-product photo (one unique Unsplash id each). The first 18 reuse
// the verified ids from `photos`; the rest are best-guess — SPOT-CHECK these,
// some may show the wrong item. To fix one: swap its id, keep it unique.
const distinct = {
  // Audio
  "nimbus-headphones": u("1505740420928-5e560c06d30e"),
  "pulse-earbuds": u("1590658268037-6bf12165a8df"),
  "echo-mini-speaker": u("1608043152269-423dbba4e7e1"),
  "sonic-studio-monitors": u("1558537348-c0f8e733989d"),
  "halo-open-ear-headphones": u("1546435770-a3e426bf472b"),
  "pebble-sport-earbuds": u("1606220588913-b3aacb4d2f46"),
  "boom-party-speaker": u("1589003077984-894e133dabab"),
  "nova-bookshelf-speakers": u("1545454675-3531b543be5d"),
  "whisper-noise-buds": u("1605464315542-bda3e2f4e605"),
  "nimbus-headphones-lite": u("1583394838336-acd977736f90"),
  "studio-reference-headphones": u("1487215078519-e21cc028cb29"),
  "pulse-earbuds-pro": u("1631867675167-90a456a90863"),
  "trek-bluetooth-speaker": u("1612444530582-fc66183b16f7"),
  // Wearables
  "orbit-watch-s": u("1523275335684-37898b6baf30"),
  "stride-band": u("1575311373937-040b8e1fd5b6"),
  "orbit-watch-pro": u("1546868871-7041f2a55e12"),
  "pace-running-watch": u("1508685096489-7aacd43bd3b1"),
  "vital-health-band": u("1557935728-e6d1eaabe558"),
  "nimbus-kids-watch": u("1544117519-31a4b719223d"),
  "flow-sleep-band": u("1434494878577-86c23bcb06b9"),
  "orbit-watch-se": u("1579586337278-3befd40fd17a"),
  "summit-gps-watch": u("1522312346375-d1a52e2b99b3"),
  "stride-band-2": u("1510017803434-a899398421b3"),
  "pulse-heart-band": u("1576243345690-4e4b79b63288"),
  // Accessories
  "volt-charger-65w": u("1583863788434-e58a36330cf0"),
  "drift-mouse-pro": u("1527864550417-7fd91fc51a46"),
  "atlas-backpack": u("1553062407-98eeb64c6a62"),
  "volt-charger-100w": u("1526406915894-7bcd65f60845"),
  "volt-power-bank-20k": u("1609091839311-d5365f9ff1c5"),
  "drift-mouse-lite": u("1615663245857-ac93bb7c39e7"),
  "glide-vertical-mouse": u("1629429407759-01cd3d7cfb38"),
  "atlas-sling-bag": u("1548036328-c9fa89d128fa"),
  "summit-travel-backpack": u("1622560480605-d83c853bc5c3"),
  "cable-organizer-kit": u("1601524909162-ae8725290836"),
  "volt-wall-charger-30w": u("1600490722773-35753aea6332"),
  "volt-car-charger": u("1625961332771-3f40b0e2bdcf"),
  "nomad-camera-bag": u("1553545204-4f7d339aa06a"),
  "everyday-laptop-bag": u("1547949003-9792a18a2601"),
  // Gaming
  "apex-mechanical-keyboard": u("1587829741301-dc798b83add3"),
  "vortex-gaming-headset": u("1599669454699-248893623440"),
  "blaze-controller": u("1592840496694-26d035b52b48"),
  "apex-tkl-keyboard": u("1618384887929-16ec33fab9ef"),
  "apex-60-keyboard": u("1595225476474-87563907a212"),
  "blaze-arcade-stick": u("1550745165-9bc0b252726f"),
  "blaze-controller-elite": u("1580327344181-c1163234e5a0"),
  "apex-wireless-keyboard": u("1541140532154-b024d705b90a"),
  "vortex-studio-headset": u("1618366712010-f4ae9c647dcb"),
  "blaze-controller-lite": u("1607853202273-797f1c22a38e"),
  "apex-numpad": u("1563191911-e65f8655ebf9"),
  // Home
  "lumen-desk-lamp": u("1507473885765-e6ed057f782c"),
  "brew-precision-kettle": u("1594213114663-d94db9b17125"),
  "aura-air-purifier": u("1585771724684-38269d6639fd"),
  "lumen-floor-lamp": u("1524484485831-a92ffc0de03f"),
  "lumen-clip-light": u("1534073737927-85f1ebff1f5d"),
  "brew-milk-frother": u("1517668808822-9ebb02f2a0e6"),
  "aura-humidifier": u("1605810230434-7631ac76ec81"),
  "brew-cold-kettle": u("1570222094114-d054a817e56b"),
  "aura-tower-purifier": u("1600166898405-da9535204843"),
  // Cameras
  "focus-mirrorless-camera": u("1516035069371-29a1b244cc32"),
  "range-zoom-lens-70-200": u("1617005082133-548c4dd27f35"),
  "scout-action-cam": u("1526170375885-4d8ecf77b99f"),
  "focus-mirrorless-camera-ii": u("1502920917128-1aa500764cbd"),
  "range-wide-lens-16-35": u("1519638831568-d9897f54ed69"),
  "scout-action-cam-mini": u("1564466809058-bf4114d55352"),
  "focus-vlog-camera": u("1495707902641-75cac588d2e9"),
  "focus-compact-camera": u("1554048612-b6a482bc67e5"),
  "range-macro-lens-90mm": u("1550009158-9ebf69173e03"),
  "scout-360-cam": u("1600861194942-f883de0dfe96"),
  "range-portrait-lens-85mm": u("1613323593608-abc90fec84ff"),
  "scout-dive-cam": u("1518877593221-1f28583780b4"),
};

const { data: cats, error: catErr } = await supabase
  .from("categories")
  .upsert(categories, { onConflict: "slug" })
  .select("id, slug");
if (catErr) throw catErr;

const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

const rows = products.map(([name, slug, description, price, stock, img, cat]) => {
  // Prefer the product's distinct photo; fall back to the type photo.
  const image_url = distinct[slug] ?? photos[img];
  if (!image_url) throw new Error(`${slug}: no image (key "${img}")`);
  return { name, slug, description, price, stock, image_url, category_id: catId[cat] };
});

const { error: prodErr } = await supabase
  .from("products")
  .upsert(rows, { onConflict: "slug" });
if (prodErr) throw prodErr;

const { count } = await supabase
  .from("products")
  .select("*", { count: "exact", head: true });
console.log(`Seeded. products in DB: ${count}`);
