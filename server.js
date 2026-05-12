import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { removeBackground } from "@imgly/background-removal-node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

const VISION_RESIZE_THRESHOLD_BYTES = 5 * 1024 * 1024;
const VISION_TARGET_BYTES = 1024 * 1024;

async function prepareBufferForVisionClaude(inputBuffer, incomingMime) {
  let mediaType = incomingMime || "image/jpeg";
  if (mediaType === "image/jpg") mediaType = "image/jpeg";
  const allowedMt = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  if (!allowedMt.has(mediaType)) mediaType = "image/jpeg";

  if (inputBuffer.length <= VISION_RESIZE_THRESHOLD_BYTES) {
    return { buffer: inputBuffer, mediaType, resized: false };
  }

  let maxDimension = 2048;
  let quality = 80;
  let out = await sharp(inputBuffer, { failOn: "none", animated: false })
    .rotate()
    .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
    .jpeg({ mozjpeg: true, quality })
    .toBuffer();

  let guard = 0;
  while (out.length > VISION_TARGET_BYTES && maxDimension >= 400 && guard < 24) {
    guard += 1;
    maxDimension = Math.floor(maxDimension * 0.7);
    quality = Math.max(45, quality - 5);
    out = await sharp(inputBuffer, { failOn: "none", animated: false })
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .jpeg({ mozjpeg: true, quality })
      .toBuffer();
  }

  if (out.length > VISION_TARGET_BYTES) {
    out = await sharp(inputBuffer, { failOn: "none", animated: false })
      .rotate()
      .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
      .jpeg({ mozjpeg: true, quality: 38 })
      .toBuffer();
  }

  console.log(
    "[vision-cutout] input >5MB → resized for Claude",
    inputBuffer.length,
    "→",
    out.length,
    "bytes",
    out.length <= VISION_TARGET_BYTES ? "(≤1MB)" : "(still >1MB, best effort)",
  );

  return { buffer: out, mediaType: "image/jpeg", resized: true };
}

async function prepareImageForCollageCopyVision(inputBuffer, incomingMime) {
  const out = await sharp(inputBuffer, { failOn: "none", animated: false })
    .rotate()
    .resize({ width: 768, height: 768, fit: "inside", withoutEnlargement: true })
    .jpeg({ mozjpeg: true, quality: 82 })
    .toBuffer();
  return { buffer: out, mediaType: "image/jpeg" };
}

const COLLAGE_COPY_PROMPT = `CRITICAL: Respond in English ONLY. Never use Korean, Japanese, Chinese, or any non-English language, even if the photos contain Korean text or Korean people.

You see photos for a tiny scrapbook collage UI.

Infer the vibe (travel, birthday, friends, beach, city night, pets, etc.) and write VERY SHORT English — like handwritten stickers, not sentences.

Reply with ONLY valid JSON (no markdown), one line, one object:
{"note":"...","place":"...","title":"..."}

Field rules (count words by spaces across the whole string unless noted):

- "note" — REQUIRED two-line caption (this is different from the other fields):
  - "note" MUST contain exactly ONE newline \\n so it becomes TWO short lines (line 1, then line 2). Do NOT leave "note" as a single line.
  - Use \\n on purpose: a tiny emotional two-line sticker caption. Example shape only (do not copy): "sweetest little\\ndumpling"
  - Aim for 1–4 words on line 1 and 1–3 words on line 2. Total words in "note" (both lines together): at most 8.
  - Keep each line punchy and handwritten-sticker short. No hashtags, no third line, no extra \\n.

- "place": one line only, at most 3 words (vibe or spot).

- "title": one line only, at most 5 words.

Tone: warm, casual English — like sticker captions. No long clauses.

Bad: "note" without \\n, more than two lines in "note", more than 8 words in "note", diary paragraphs, hashtags.

English only. No HTML. Escape double quotes in JSON properly (inside the JSON string use a real newline escape: \\n between the two lines of "note").`;

const COLLAGE_FIELD_MAX = { note: 64, place: 36, title: 56 };

function truncateToWordsAndLines(text, maxWords, maxLines) {
  const segments = String(text).split(/\n/).slice(0, maxLines);
  const lines = [];
  let used = 0;
  for (const seg of segments) {
    const words = seg.trim().split(/\s+/).filter(Boolean);
    const buf = [];
    for (const w of words) {
      if (used >= maxWords) break;
      buf.push(w);
      used += 1;
    }
    if (buf.length) lines.push(buf.join(" "));
    if (used >= maxWords) break;
  }
  return lines.join("\n").trim();
}

function sanitizeCollageCopyField(value, maxLen) {
  const s = String(value ?? "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .trim()
    .slice(0, maxLen);
  return truncateToWordsAndLines(s, 5, 2);
}

/** "note" is two lines with \\n — allow a few more words than place/title. */
function sanitizeCollageCopyNote(value, maxLen) {
  const s = String(value ?? "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .trim()
    .slice(0, maxLen);
  return truncateToWordsAndLines(s, 8, 2);
}

const VISION_CUTOUT_PROMPT = `Look at this image and answer one question:

"Is a real human OR animal clearly the MAIN subject of the photo — the thing the viewer is meant to notice first?"

Answer true when:
- One real person (any age) is clearly the primary subject
- A pet or animal (dog, cat, etc.) is clearly the main subject (close-up, portrait, dominant in frame)

Answer false for:
- Buildings, architecture, or cityscapes as the main subject
- Food, dishes, or drinks as the hero
- Pure landscapes, nature, sky, oceans without a person or animal as the clear main subject
- Objects, vehicles, screenshots, art/illustrations
- Tiny or distant people/animals where the scene is clearly the main subject

Reply with ONLY valid JSON (no markdown), one line:
{"person_main_subject":true|false}`;

function parseAnthropicVisionJson(text) {
  if (!text || typeof text !== "string") return null;
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

app.post("/api/vision-cutout-eligible", upload.single("image"), async (req, res) => {
  const displayName = req.file?.originalname || "(no file)";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[vision-cutout] ANTHROPIC_API_KEY not set —", displayName);
    res.status(503).json({
      error: "ANTHROPIC_API_KEY is not set on the server",
      person_main_subject: false,
      tags: [],
    });
    return;
  }

  if (!req.file?.buffer) {
    res.status(400).json({ error: "Missing multipart field `image` (file)", person_main_subject: false, tags: [] });
    return;
  }

  const incomingMime = req.file.mimetype || "image/jpeg";
  const model = process.env.CLAUDE_VISION_MODEL || "claude-sonnet-4-5";

  let visionBuffer;
  let mediaType;
  try {
    const prepared = await prepareBufferForVisionClaude(req.file.buffer, incomingMime);
    visionBuffer = prepared.buffer;
    mediaType = prepared.mediaType;
  } catch (shrinkErr) {
    console.error("[vision-cutout] sharp resize failed", displayName, shrinkErr?.message || shrinkErr);
    res.status(500).json({
      error: "Failed to process image for vision",
      person_main_subject: false,
      tags: [],
    });
    return;
  }

  const b64 = visionBuffer.toString("base64");

  try {
    const upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: b64 },
              },
              { type: "text", text: VISION_CUTOUT_PROMPT },
            ],
          },
        ],
      }),
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      console.error("[vision-cutout] Claude FAILED", upstream.status, displayName, raw.slice(0, 400));
      res.status(upstream.status).json({
        error: "Claude vision request failed",
        status: upstream.status,
        detail: raw.slice(0, 800),
        person_main_subject: false,
        tags: [],
      });
      return;
    }

    let textBlock = "";
    try {
      const j = JSON.parse(raw);
      const blocks = j?.content;
      if (Array.isArray(blocks)) {
        textBlock = blocks
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");
      }
    } catch {
      textBlock = "";
    }

    const parsed = parseAnthropicVisionJson(textBlock);
    const pm = parsed?.person_main_subject;
    const personMain = pm === true || pm === "true" || pm === 1;
    const tags = personMain ? ["person_main", "person"] : [];

    console.log("[vision-cutout] Claude OK", displayName, "person_main_subject=", personMain);

    res.json({
      person_main_subject: personMain,
      tags,
    });
  } catch (err) {
    console.error("[vision-cutout] exception", displayName, err?.message || err);
    res.status(500).json({ error: err?.message || String(err), person_main_subject: false, tags: [] });
  }
});

app.post("/api/vision-collage-copy", upload.array("images", 8), async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const files = Array.isArray(req.files) ? req.files : [];
  if (!apiKey) {
    console.error("[vision-collage-copy] ANTHROPIC_API_KEY not set");
    res.status(503).json({
      error: "ANTHROPIC_API_KEY is not set on the server",
      note: "",
      place: "",
      title: "",
    });
    return;
  }
  if (!files.length) {
    res.status(400).json({
      error: "Missing one or more files in multipart field `images`",
      note: "",
      place: "",
      title: "",
    });
    return;
  }

  const model = process.env.CLAUDE_VISION_MODEL || "claude-sonnet-4-5";

  try {
    const content = [];
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      const prepared = await prepareImageForCollageCopyVision(f.buffer, f.mimetype || "image/jpeg");
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: prepared.mediaType,
          data: prepared.buffer.toString("base64"),
        },
      });
    }
    content.push({ type: "text", text: COLLAGE_COPY_PROMPT });

    const upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [{ role: "user", content }],
      }),
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      console.error("[vision-collage-copy] Claude FAILED", upstream.status, raw.slice(0, 400));
      res.status(upstream.status).json({
        error: "Claude collage copy request failed",
        status: upstream.status,
        detail: raw.slice(0, 600),
        note: "",
        place: "",
        title: "",
      });
      return;
    }

    let textBlock = "";
    try {
      const j = JSON.parse(raw);
      const blocks = j?.content;
      if (Array.isArray(blocks)) {
        textBlock = blocks
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");
      }
    } catch {
      textBlock = "";
    }

    const parsed = parseAnthropicVisionJson(textBlock);
    const note = sanitizeCollageCopyNote(parsed?.note, COLLAGE_FIELD_MAX.note);
    const place = sanitizeCollageCopyField(parsed?.place, COLLAGE_FIELD_MAX.place);
    const title = sanitizeCollageCopyField(parsed?.title, COLLAGE_FIELD_MAX.title);

    console.log("[vision-collage-copy] OK", files.length, "images");
    res.json({ note, place, title });
  } catch (err) {
    console.error("[vision-collage-copy] exception", err?.message || err);
    res.status(500).json({ error: err?.message || String(err), note: "", place: "", title: "" });
  }
});

const VISION_VIBE_STICKERS_PROMPT = `You are choosing scrapbook stickers for a phone collage app.

Look at ALL uploaded photos together and pick the SINGLE best category for the set:

- "party" — birthday, cake, candles, balloons, party hats, group celebration, festive drinks/cups in a party context
- "nature_travel" — beach/ocean/waves, mountains, hiking, outdoor travel landscapes, nature as the main subject
- "daily_mood" — everyday life, friends at cafés/home, cozy casual moments, sentimental still life (not clearly party, not clearly a nature trip, and animals are not the main focus)
- "animal" — dogs, cats, or other pets as a CLEAR main subject (close-up or dominant in frame)
- "fallback" — if unclear, mixed unrelated topics, screenshots, or none of the above fit

Reply with ONLY valid JSON (no markdown), one object:
{"vibe":"party"}

The value of "vibe" must be EXACTLY one of these strings: party, nature_travel, daily_mood, animal, fallback`;

const VIBE_KEYS = new Set(["party", "nature_travel", "daily_mood", "animal", "fallback"]);

function normalizeServerVibe(v) {
  const k = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  return VIBE_KEYS.has(k) ? k : "fallback";
}

app.post("/api/vision-vibe-stickers", upload.array("images", 8), async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const files = Array.isArray(req.files) ? req.files : [];
  if (!apiKey) {
    console.error("[vision-vibe-stickers] ANTHROPIC_API_KEY not set");
    res.status(503).json({ error: "ANTHROPIC_API_KEY is not set on the server", vibe: "fallback" });
    return;
  }
  if (!files.length) {
    res.status(400).json({ error: "Missing one or more files in multipart field `images`", vibe: "fallback" });
    return;
  }

  const model = process.env.CLAUDE_VISION_MODEL || "claude-sonnet-4-5";

  try {
    const content = [];
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      const prepared = await prepareImageForCollageCopyVision(f.buffer, f.mimetype || "image/jpeg");
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: prepared.mediaType,
          data: prepared.buffer.toString("base64"),
        },
      });
    }
    content.push({ type: "text", text: VISION_VIBE_STICKERS_PROMPT });

    const upstream = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        messages: [{ role: "user", content }],
      }),
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      console.error("[vision-vibe-stickers] Claude FAILED", upstream.status, raw.slice(0, 400));
      res.status(upstream.status).json({
        error: "Claude vision vibe request failed",
        vibe: "fallback",
      });
      return;
    }

    let textBlock = "";
    try {
      const j = JSON.parse(raw);
      const blocks = j?.content;
      if (Array.isArray(blocks)) {
        textBlock = blocks
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");
      }
    } catch {
      textBlock = "";
    }

    const parsed = parseAnthropicVisionJson(textBlock);
    const vibe = normalizeServerVibe(parsed?.vibe);
    console.log("[vision-vibe-stickers] OK", files.length, "images →", vibe);
    res.json({ vibe });
  } catch (err) {
    console.error("[vision-vibe-stickers] exception", err?.message || err);
    res.status(500).json({ error: err?.message || String(err), vibe: "fallback" });
  }
});

app.post("/api/remove-bg", upload.single("image"), async (req, res) => {
  const displayName = req.file?.originalname || "(no file)";

  if (!req.file?.buffer) {
    console.error("[remove-bg] server: missing multipart field `image`");
    res.status(400).json({ error: "Missing multipart field `image` (file)" });
    return;
  }

  const kb = (req.file.size / 1024).toFixed(1);
  console.log(`[remove-bg] server: received "${displayName}" (${kb} KB)`);

  try {
    const mime = req.file.mimetype || "image/jpeg";
    const normalized = await sharp(req.file.buffer, { failOn: "none", animated: false }).rotate().toBuffer();
    const blob = new Blob([normalized], { type: mime });
    const result = await removeBackground(blob);
    const buf = Buffer.from(await result.arrayBuffer());

    console.log(`[remove-bg] server: OK "${displayName}" png_bytes=${buf.length}`);
    res.setHeader("Content-Type", "image/png");
    res.send(buf);
  } catch (err) {
    console.error("[remove-bg] server: exception", displayName, err?.message || err);
    res.status(500).json({ error: err?.message || String(err) });
  }
});

app.use(express.static(__dirname));

const PORT = Number(process.env.PORT, 10) || 3000;
app.listen(PORT, async () => {
  console.error(`Dump Dump static + API → http://localhost:${PORT}`);
  try {
    const tiny = await sharp({ create: { width: 10, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const blob = new Blob([tiny], { type: "image/png" });
    await removeBackground(blob);
    console.error("[remove-bg] model warmed up ✓");
  } catch {
    console.error("[remove-bg] warmup done");
  }
});