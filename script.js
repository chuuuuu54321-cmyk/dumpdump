const MAX_PHOTOS = 8;
const slotTilts = [-2.2, 3, -3.6, 4.3, -1, 3.5, -2.9, 3.6];
const EXPORT_SCALE = 3;

/** @typedef {'heart'|'sparkle'|'tape'|'clip'|'flower'|'doodle'|'label'} StickerCategory */

/** @returns {boolean} Boost contrast on pale paper — DOM + PNG export */
function stickerNeedsContrastBoost(def) {
  if (!def || def.light === false) return false;
  if (def.light === true) return true;
  return /\bwhite\b/i.test(def.file);
}

/** Result stage CSS px — matches `.phone-screen` */
const RESULT_STAGE_W = 393;
const RESULT_STAGE_H = 852;

/** Sticker center must stay out of these (text, controls, logo). Photos OK for clip/tape edges. */
const RESULT_STICKER_NO_CENTER_RECTS = [
  { x: 6, y: 182, w: 172, h: 98 },
  { x: 188, y: 366, w: 198, h: 72 },
  { x: 182, y: 472, w: 208, h: 138 },
  { x: 0, y: 784, w: RESULT_STAGE_W, h: 68 },
  { x: 228, y: 726, w: 165, h: 108 },
];

/**
 * Fixed result layout (393×852 stage). Order = z / paint order (later items on top within each layer).
 * `left`/`top` = top-left of item; `rotation` deg.
 */
const FIXED_RESULT_LAYOUTS = {
  2: [
    { type: "cutout", w: 520, h: 700, top: -87, left: -227, rotation: -4.34 },
    { type: "polaroid", w: 224, h: 262, top: 482, left: 185, rotation: -4.57 },
  ],
  3: [
    { type: "cutout", w: 520, h: 700, top: -61, left: -139, rotation: -4.34 },
    { type: "plain", w: 219, h: 219, top: 32, left: -26, rotation: -9.71 },
    { type: "polaroid", w: 242, h: 245, top: 542, left: 161, rotation: 8.37 },
  ],
  4: [
    { type: "cutout", w: 540, h: 726, top: 12, left: -175, rotation: -4.34 },
    { type: "plain", w: 279, h: 279, top: 0, left: 98, rotation: -9.71 },
    { type: "polaroid", w: 181, h: 212, top: 89, left: -40, rotation: 6.91 },
    { type: "polaroid", w: 242, h: 245, top: 577, left: 179, rotation: 8.37 },
  ],
  5: [
    { type: "cutout", w: 495, h: 666, top: 48, left: -5.6, rotation: -4.34 },
    { type: "polaroid", w: 146, h: 170, top: 12, left: -9, rotation: 6.91 },
    { type: "plain", w: 219, h: 219, top: 154, left: 27, rotation: -9.71 },
    { type: "polaroid", w: 224, h: 261, top: 383, left: -44, rotation: -4.57 },
    { type: "polaroid", w: 187, h: 218, top: 618, left: 27, rotation: 6.91 },
  ],
  6: [
    { type: "cutout", w: 411, h: 553, top: 84, left: -128, rotation: -4.34 },
    { type: "plain", w: 219, h: 219, top: -10, left: 102, rotation: -9.71 },
    { type: "polaroid", w: 146, h: 170, top: 76, left: -9, rotation: 6.91 },
    { type: "polaroid", w: 224, h: 261, top: 173, left: 157, rotation: -4.57 },
    { type: "polaroid", w: 242, h: 242, top: 577, left: 141, rotation: 8.37 },
    { type: "polaroid", w: 146, h: 170, top: 643, left: -28, rotation: 6.91 },
  ],
  7: [
    { type: "cutout", w: 411, h: 553, top: 84, left: -128, rotation: -4.34 },
    { type: "polaroid", w: 146, h: 170, top: 134, left: -46, rotation: 6.91 },
    { type: "plain", w: 219, h: 219, top: 48, left: 65, rotation: -9.71 },
    { type: "cutout", w: 228, h: 306, top: -42, left: 195, rotation: 7.92 },
    { type: "polaroid", w: 242, h: 261, top: 257, left: 157, rotation: -4.57 },
    { type: "polaroid", w: 146, h: 170, top: 643, left: -23, rotation: -6.91 },
    { type: "polaroid", w: 263, h: 263, top: 532, left: 141, rotation: 8.37 },
  ],
  8: [
    { type: "cutout", w: 411, h: 553, top: 84, left: -162, rotation: -4.34 },
    { type: "polaroid", w: 146, h: 170, top: 76, left: -9, rotation: 6.91 },
    { type: "plain", w: 219, h: 219, top: -10, left: 102, rotation: -9.71 },
    { type: "cutout", w: 228, h: 306, top: -63, left: 186, rotation: 7.92 },
    { type: "polaroid", w: 224, h: 261, top: 173, left: 157, rotation: -4.57 },
    { type: "polaroid", w: 172, h: 172, top: 433, left: 212, rotation: -9.71 },
    { type: "polaroid", w: 146, h: 170, top: 646, left: -28, rotation: 6.91 },
    { type: "polaroid", w: 242, h: 245, top: 603, left: 141, rotation: 8.37 },
  ],
};

/**
 * AI collage titles on the 393×852 result stage. `top`/`left` = top-left; sizes in px; `rotation` deg.
 * Main = 28px, subtitle = 26px (Nothing You Could Do) — CSS + inline width from stage (393 − left).
 */
const RESULT_TITLE_LAYOUTS = {
  2: {
    main: { w: 305, h: 90, top: 186, left: 103, rotation: -8.23 },
    sub: { w: 305, h: 36, top: 693, left: 39, rotation: 0 },
  },
  3: {
    main: { w: 305, h: 90, top: 93, left: 161, rotation: -8.23 },
    sub: { w: 305, h: 36, top: 694, left: -23, rotation: 0 },
  },
  4: {
    main: { w: 305, h: 90, top: 293, left: 146, rotation: -8.23 },
    sub: { w: 305, h: 36, top: 772, left: 9, rotation: 0 },
  },
  5: {
    main: { w: 305, h: 90, top: 62, left: 100, rotation: -8.23 },
    sub: { w: 305, h: 36, top: 764, left: 127, rotation: 0 },
  },
  6: {
    main: { w: 305, h: 90, top: 416, left: 159, rotation: -8.23 },
    sub: { w: 305, h: 36, top: 227, left: -78, rotation: 0 },
  },
  7: {
    main: { w: 305, h: 90, top: 447, left: 172, rotation: -8.23 },
    sub: { w: 305, h: 36, top: 110, left: -93, rotation: 0 },
  },
  8: {
    main: { w: 305, h: 90, top: 328, left: 133, rotation: -8.23 },
    sub: { w: 305, h: 36, top: 49, left: -67, rotation: 0 },
  },
};

const state = {
  photos: [],
  screen: "start",
  pickingPhotos: false,
  /** When non-null, array of photo UUIDs forced as person cutouts (max 2 used). */
  selectedForCutout: null,
  /** If true (`personCutoutDebug=1`), first uploaded photo is the only cutout candidate. */
  debugForceFirstPhotoCutout: false,
  /** Claude Vision: tags per photo id (e.g. person_main, person). */
  analysisTagsByPhotoId: {},
  /** Claude: person is main subject — true / false (analyzed) / unset (not fetched). */
  visionCutoutEligibleByPhotoId: {},
  /** Last photo-set key we injected AI collage copy into the DOM (preserve user edits on re-open). */
  collageTextPhotoKeyApplied: null,
  /** Cached successful `/api/vision-collage-copy` result `{ key, note, place, title }`. */
  collageCopyByPhotoKey: null,
  /** Cached `/api/vision-vibe-stickers` `{ key, vibe }` — `vibe` is `party`|`nature_travel`|… */
  collageVibeByPhotoKey: null,
};

/** Re-read query flags when opening result so URL edits apply without a full reload when possible. */
function refreshCutoutDebugFlagsFromUrl() {
  try {
    const q = new URLSearchParams(window.location.search);
    state.debugForceFirstPhotoCutout = q.get("personCutoutDebug") === "1";
  } catch {
    /* ignore */
  }
}

try {
  refreshCutoutDebugFlagsFromUrl();
} catch {
  /* ignore */
}

const screens = [...document.querySelectorAll(".screen")];
const photoGrid = document.querySelector("#photoGrid");
const photoInput = document.querySelector("#photoInput");
const exportCanvas = document.querySelector("#exportCanvas");
const ctx = exportCanvas.getContext("2d");

const paperTemplate = new Image();
paperTemplate.src = "./assets/result-paper-template.png";

const editableText = {
  main: document.querySelector(".result-title-main"),
  sub: document.querySelector(".result-title-sub"),
};

function resultTitleLayoutKey(photoCount) {
  const raw = !photoCount || photoCount <= 1 ? 2 : photoCount;
  return Math.min(8, Math.max(2, raw));
}

function applyResultTitleTextLayout(photoCount) {
  const key = resultTitleLayoutKey(photoCount);
  const spec = RESULT_TITLE_LAYOUTS[key];
  const mainEl = editableText.main;
  const subEl = editableText.sub;
  if (!spec || !mainEl || !subEl) return;
  const m = spec.main;
  const s = spec.sub;

  const applyTitleBox = (el, block) => {
    const left = Math.max(0, block.left);
    const width = Math.max(68, RESULT_STAGE_W - left);
    el.style.left = `${left}px`;
    el.style.width = `${width}px`;
    el.style.maxWidth = `${width}px`;
    el.style.minHeight = `${block.h}px`;
    el.style.height = "auto";
    el.style.top = `${block.top}px`;
    el.style.whiteSpace = "pre-wrap";
    el.style.wordBreak = "break-word";
    el.style.overflow = "visible";
    el.style.boxSizing = "border-box";
  };

  applyTitleBox(mainEl, m);
  applyTitleBox(subEl, s);
  mainEl.style.transform = `rotate(${m.rotation}deg)`;
  subEl.style.transform = s.rotation ? `rotate(${s.rotation}deg)` : "none";
}

const TITLE_DRAG_THRESHOLD_PX = 10;
const TITLE_POINTER_MOVE_OPTS = { passive: false };

function clientToDesignOnStage(clientX, clientY, stageEl) {
  const r = stageEl.getBoundingClientRect();
  const sc = RESULT_STAGE_W / r.width;
  return {
    x: (clientX - r.left) * sc,
    y: (clientY - r.top) * sc,
  };
}

function parseTitleLeftTop(el) {
  const cs = getComputedStyle(el);
  return {
    left: parseFloat(cs.left) || 0,
    top: parseFloat(cs.top) || 0,
  };
}

function titleVisualBoundsInDesign(el, stageEl) {
  const er = el.getBoundingClientRect();
  const sr = stageEl.getBoundingClientRect();
  const sc = RESULT_STAGE_W / sr.width;
  return {
    left: (er.left - sr.left) * sc,
    top: (er.top - sr.top) * sc,
    right: (er.right - sr.left) * sc,
    bottom: (er.bottom - sr.top) * sc,
  };
}

function clampTitleIntoStage(el, stageEl) {
  for (let i = 0; i < 5; i += 1) {
    const bb = titleVisualBoundsInDesign(el, stageEl);
    const { left, top } = parseTitleLeftTop(el);
    let dx = 0;
    let dy = 0;
    if (bb.left < 0) dx = -bb.left;
    else if (bb.right > RESULT_STAGE_W) dx = RESULT_STAGE_W - bb.right;
    if (bb.top < 0) dy = -bb.top;
    else if (bb.bottom > RESULT_STAGE_H) dy = RESULT_STAGE_H - bb.bottom;
    if (!dx && !dy) break;
    el.style.left = `${left + dx}px`;
    el.style.top = `${top + dy}px`;
  }
}

function parseRotateDegFromTitleEl(el, fallbackDeg) {
  const t = el.style.transform || "";
  const m = t.match(/rotate\(([-0-9.]+)\s*deg\)/i);
  if (m) return parseFloat(m[1]);
  return fallbackDeg ?? 0;
}

/**
 * @returns {{ cx: number, cy: number, maxWidth: number, rotation: number } | null}
 */
function titleBlockExportGeometryFromDom(el, specFallback) {
  const stageEl = document.querySelector("#collageStage");
  if (!el || !stageEl) return null;
  const sr = stageEl.getBoundingClientRect();
  if (!sr.width) return null;
  const sc = RESULT_STAGE_W / sr.width;
  const er = el.getBoundingClientRect();
  const w = er.width * sc;
  const h = er.height * sc;
  const left = (er.left - sr.left) * sc;
  const top = (er.top - sr.top) * sc;
  const rot = parseRotateDegFromTitleEl(el, specFallback?.rotation ?? 0);
  return {
    cx: left + w / 2,
    cy: top + h / 2,
    maxWidth: w,
    rotation: rot,
  };
}

function installResultTitleDrag() {
  const mainEl = editableText.main;
  const subEl = editableText.sub;
  if (!mainEl || !subEl) return;

  /** @type {{ el: HTMLElement, pointerId: number, stage: HTMLElement, startClientX: number, startClientY: number, dragging: boolean, lastDesign: { x: number, y: number } } | null} */
  let active = null;

  const cleanupWindow = () => {
    window.removeEventListener("pointermove", onPointerMove, TITLE_POINTER_MOVE_OPTS);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };

  const finish = () => {
    if (!active) return;
    const cap = active;
    active = null;
    cleanupWindow();
    if (cap.dragging) {
      cap.el.classList.remove("dragging-title");
      cap.el.style.touchAction = "";
      try {
        cap.el.releasePointerCapture(cap.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  function onPointerMove(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    const { el, stage } = active;
    if (!active.dragging) {
      const dx = e.clientX - active.startClientX;
      const dy = e.clientY - active.startClientY;
      if (dx * dx + dy * dy < TITLE_DRAG_THRESHOLD_PX * TITLE_DRAG_THRESHOLD_PX) return;
      active.dragging = true;
      el.classList.add("dragging-title");
      el.style.touchAction = "none";
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      window.getSelection()?.removeAllRanges?.();
      el.blur();
      active.lastDesign = clientToDesignOnStage(e.clientX, e.clientY, stage);
      return;
    }
    e.preventDefault();
    const cur = clientToDesignOnStage(e.clientX, e.clientY, stage);
    const pt = parseTitleLeftTop(el);
    el.style.left = `${pt.left + cur.x - active.lastDesign.x}px`;
    el.style.top = `${pt.top + cur.y - active.lastDesign.y}px`;
    active.lastDesign = cur;
    clampTitleIntoStage(el, stage);
  }

  function onPointerUp(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    finish();
  }

  function onLostPointerCapture(e) {
    if (active && active.dragging && active.el === e.currentTarget && active.pointerId === e.pointerId) {
      finish();
    }
  }

  function onPointerDown(e) {
    if (!e.isPrimary) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const stage = document.querySelector("#collageStage");
    if (!stage || !stage.getBoundingClientRect().width) return;
    const screen = stage.closest('.screen[data-screen="result"]');
    if (!screen || !screen.classList.contains("active")) return;

    const el = /** @type {HTMLElement} */ (e.currentTarget);
    active = {
      el,
      pointerId: e.pointerId,
      stage,
      startClientX: e.clientX,
      startClientY: e.clientY,
      dragging: false,
      lastDesign: { x: 0, y: 0 },
    };
    window.addEventListener("pointermove", onPointerMove, TITLE_POINTER_MOVE_OPTS);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  mainEl.addEventListener("pointerdown", onPointerDown);
  subEl.addEventListener("pointerdown", onPointerDown);
  mainEl.addEventListener("lostpointercapture", onLostPointerCapture);
  subEl.addEventListener("lostpointercapture", onLostPointerCapture);
}

let renderResultCollageGeneration = 0;

function collagePhotosKey(photos) {
  return photos.map((p) => p.id).join("|");
}

/** Safe multiline for `contenteditable` (no HTML from model). */
function setEditableMultiline(el, raw) {
  if (!el) return;
  el.innerHTML = "";
  const lines = String(raw ?? "").split(/\n/);
  lines.forEach((line, i) => {
    if (i > 0) el.appendChild(document.createElement("br"));
    el.appendChild(document.createTextNode(line));
  });
}

function applyCollageCopyToEditable(copy) {
  if (!copy) return;
  const t = String(copy.title ?? "").trim();
  const n = String(copy.note ?? "").trim();
  const p = String(copy.place ?? "").trim();
  const main = t || n || p;
  const sub = t ? n || p : p || "";
  setEditableMultiline(editableText.main, main);
  setEditableMultiline(editableText.sub, sub);
}

async function fetchVisionVibeStickers(photos, pk) {
  if (state.collageVibeByPhotoKey?.key === pk) {
    return state.collageVibeByPhotoKey.vibe;
  }
  try {
    const fd = new FormData();
    photos.forEach((p) => fd.append("images", p.file, p.file?.name || "photo.jpg"));
    const res = await fetch("/api/vision-vibe-stickers", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[vision-vibe-stickers] HTTP", res.status, data?.error || "");
      const v = "fallback";
      state.collageVibeByPhotoKey = { key: pk, vibe: v };
      return v;
    }
    const v = normalizeVibeKey(data.vibe);
    state.collageVibeByPhotoKey = { key: pk, vibe: v };
    return v;
  } catch (err) {
    console.warn("[vision-vibe-stickers] fetch failed", err);
    const v = "fallback";
    state.collageVibeByPhotoKey = { key: pk, vibe: v };
    return v;
  }
}

async function fetchCollageCopyFromApi(photos, pk) {
  if (state.collageCopyByPhotoKey?.key === pk) {
    return state.collageCopyByPhotoKey;
  }
  try {
    const fd = new FormData();
    photos.forEach((p) => fd.append("images", p.file, p.file?.name || "photo.jpg"));
    const res = await fetch("/api/vision-collage-copy", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[vision-collage-copy] HTTP", res.status, data?.error || "");
      return { key: pk, note: "", place: "", title: "" };
    }
    const out = {
      key: pk,
      note: String(data.note ?? ""),
      place: String(data.place ?? ""),
      title: String(data.title ?? ""),
    };
    state.collageCopyByPhotoKey = out;
    return out;
  } catch (err) {
    console.warn("[vision-collage-copy] fetch failed", err);
    return { key: pk, note: "", place: "", title: "" };
  }
}

/**
 * @param {string} name
 * @param {{ skipCollageRender?: boolean }} [options] Pass `skipCollageRender: true` after `renderResultCollage()` already ran (e.g. loading → result).
 */
function showScreen(name, options = {}) {
  state.screen = name;
  document.querySelector(".phone-screen").dataset.current = name;
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  if (name === "result" && !options.skipCollageRender) void renderResultCollage();
}

let makeDumpInFlight = false;

function fileToPhoto(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        file,
        url,
        img,
        ratio: img.width / img.height,
        score: getPhotoScore(img),
      });
    };
    img.src = url;
  });
}

function getPhotoScore(img) {
  const sample = document.createElement("canvas");
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  sample.width = 24;
  sample.height = 24;
  sctx.drawImage(img, 0, 0, 24, 24);
  const data = sctx.getImageData(0, 0, 24, 24).data;
  let brightness = 0;
  let warmth = 0;
  for (let i = 0; i < data.length; i += 4) {
    brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    warmth += data[i] - data[i + 2];
  }
  return {
    brightness: brightness / (data.length / 4),
    warmth: warmth / (data.length / 4),
    landscape: img.width > img.height,
  };
}

function renderUploadGrid() {
  photoGrid.innerHTML = "";
  for (let i = 0; i < MAX_PHOTOS; i += 1) {
    const photo = state.photos[i];
    const slot = document.createElement("div");
    slot.className = "photo-slot";
    slot.style.setProperty("--tilt", `${slotTilts[i]}deg`);

    if (photo) {
      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = `Uploaded memory ${i + 1}`;
      const remove = document.createElement("button");
      remove.className = "remove-photo";
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove photo ${i + 1}`);
      remove.textContent = "×";
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        URL.revokeObjectURL(photo.url);
        delete state.visionCutoutEligibleByPhotoId[photo.id];
        delete state.analysisTagsByPhotoId[photo.id];
        visionCutoutAnalysisPromisesByPhotoId.delete(photo.id);
        state.photos.splice(i, 1);
        renderUploadGrid();
      });
      slot.append(image, remove);
    } else {
      slot.classList.add("empty");
      const label = document.createElement("label");
      label.setAttribute("aria-label", "Add photo");
      label.innerHTML = '<span class="add-mark">+</span>';
      label.addEventListener("click", (event) => {
        event.stopPropagation();
        openPhotoPicker();
      });
      slot.append(label);
    }
    photoGrid.append(slot);
  }
}

async function addPhotos(files) {
  const remaining = MAX_PHOTOS - state.photos.length;
  if (remaining <= 0) return;

  const seen = new Set(state.photos.map((photo) => fileKey(photo.file)));
  const selected = [];
  for (const file of files) {
    const key = fileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push(file);
    if (selected.length >= remaining) break;
  }

  const photos = await Promise.all(selected.map(fileToPhoto));
  state.photos.push(...photos);
  renderUploadGrid();
  void ensureVisionCutoutEligibility(photos);
}

function fileKey(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function openPhotoPicker() {
  if (state.pickingPhotos) return;
  state.pickingPhotos = true;
  photoInput.click();
  setTimeout(() => {
    state.pickingPhotos = false;
  }, 500);
}

function resetAllUploadPhotos() {
  state.photos.forEach((photo) => {
    try {
      URL.revokeObjectURL(photo.url);
    } catch {
      /* ignore */
    }
  });
  state.photos = [];
  state.selectedForCutout = null;
  state.analysisTagsByPhotoId = {};
  state.visionCutoutEligibleByPhotoId = {};
  state.collageTextPhotoKeyApplied = null;
  state.collageCopyByPhotoKey = null;
  state.collageVibeByPhotoKey = null;
  visionCutoutAnalysisPromisesByPhotoId.clear();
  photoInput.value = "";
  renderUploadGrid();
}

function sortedPhotosForCollage() {
  return [...state.photos].sort((a, b) => {
    if (a.score.landscape !== b.score.landscape) return a.score.landscape ? -1 : 1;
    return Math.abs(b.score.warmth) + b.score.brightness - (Math.abs(a.score.warmth) + a.score.brightness);
  });
}

function seedFromPhotos(photos) {
  const sum = photos.reduce((acc, p) => {
    let s = 0;
    for (let i = 0; i < p.id.length; i += 1) s += p.id.charCodeAt(i);
    return acc + s;
  }, 0);
  return sum || 1;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

/** Safe URL for stickers with commas / spaces in filename */
function stickerSrc(file) {
  const name = file.includes("/") ? file.slice(file.lastIndexOf("/") + 1) : file;
  return `./assets/stickers/${encodeURIComponent(name)}`;
}

const stickerRasterCache = new Map();

function loadStickerRaster(file) {
  if (!stickerRasterCache.has(file)) {
    const url = stickerSrc(file);
    const p = new Promise((resolve) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(im.naturalWidth ? im : null);
      im.onerror = () => resolve(null);
      im.src = url;
    });
    stickerRasterCache.set(file, p);
  }
  return stickerRasterCache.get(file);
}

function averageBrightness(photos) {
  if (!photos.length) return 130;
  return photos.reduce((s, p) => s + p.score.brightness, 0) / photos.length;
}

function brightnessSpread(photos) {
  if (photos.length < 2) return 0;
  const mean = averageBrightness(photos);
  let v = 0;
  photos.forEach((p) => {
    const d = p.score.brightness - mean;
    v += d * d;
  });
  return Math.sqrt(v / photos.length);
}

/**
 * Lightweight tags inferred from thumbnails — swap for AI API tags later.
 * @returns {string[]}
 */
function deriveMoodTags(photos) {
  const w = averageWarmth(photos);
  const br = averageBrightness(photos);
  const spread = brightnessSpread(photos);

  /** @type {string[]} */
  const tags = [];

  if (w > 6) tags.push("warm");
  else if (w < -2) tags.push("cool");
  else tags.push("balanced");

  if (br > 132) tags.push("bright");
  else if (br < 108) tags.push("muted");
  else tags.push("neutral");

  tags.push(spread > 16 ? "playful" : "calm");

  if (w > 10) tags.push("sweet");
  if (w < -5) tags.push("moody");

  tags.push(tags.includes("muted") ? "minimal" : "celebration");

  return tags;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function centerAvoidsUi(px, py) {
  for (let i = 0; i < RESULT_STICKER_NO_CENTER_RECTS.length; i += 1) {
    if (pointInRect(px, py, RESULT_STICKER_NO_CENTER_RECTS[i])) return false;
  }
  return px >= 14 && px <= RESULT_STAGE_W - 14 && py >= 36 && py <= RESULT_STAGE_H - 96;
}

/** 항상 1개: Vision과 무관하게 붙는 기본 스티커 후보 */
const BASE_ALWAYS_STICKERS = ["Hearts.svg", "spark, sparkle, 26.svg", "white heart 2.svg"];

/** Claude Vision → sticker filenames under `assets/stickers/` (actual names on disk). */
const VIBE_STICKER_POOLS = {
  party: [
    "Cake-1--Streamline-Fun-Stickers.svg",
    "cake.svg",
    "party.svg",
    "Happy cup.svg",
  ],
  nature_travel: [
    "beach, wave, doodle, water, sea, ocean, 2.svg",
    "tree.svg",
    "Flower-2--Streamline-Fun-Stickers.svg",
    "Rain cloud.svg",
  ],
  daily_mood: [
    "Hearts.svg",
    "white heart 2.svg",
    "spark, sparkle, 26.svg",
    "love it.svg",
    "nice.svg",
  ],
  animal: ["cat.svg", "cat 2.svg", "dog.svg"],
  fallback: ["spark, sparkle, 26.svg", "Hearts.svg", "white heart 2.svg"],
};

function normalizeVibeKey(v) {
  const k = String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (k === "party") return "party";
  if (k === "nature_travel" || k === "nature" || k === "travel") return "nature_travel";
  if (k === "daily_mood" || k === "daily" || k === "mood") return "daily_mood";
  if (k === "animal" || k === "animals" || k === "pets") return "animal";
  if (k === "fallback") return "fallback";
  return "fallback";
}

function collectLayoutItems(frames, cutouts) {
  /** @type {{ x: number, y: number, w: number, h: number, rot: number }[]} */
  const items = [];
  (frames || []).forEach((f) =>
    items.push({ x: f.x, y: f.y, w: f.w, h: f.h, rot: f.rot ?? 0 }),
  );
  (cutouts || []).forEach((c) =>
    items.push({ x: c.x, y: c.y, w: c.w, h: c.h, rot: c.rot ?? 0 }),
  );
  return items;
}

function collectLayoutPhotoRects(frames, cutouts) {
  return collectLayoutItems(frames, cutouts).map(({ x, y, w, h }) => ({ x, y, w, h }));
}

function rotateOffset(lx, ly, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: lx * cos - ly * sin, y: lx * sin + ly * cos };
}

/** 스티커 중심이 사진 “안쪽 코어”에 있으면 true — 모서리·바깥은 허용 */
function stickerCenterInsidePhotos(cx, cy, photoRects, inset) {
  for (let i = 0; i < photoRects.length; i += 1) {
    const r = photoRects[i];
    const e = { x: r.x + inset, y: r.y + inset, w: r.w - 2 * inset, h: r.h - 2 * inset };
    if (e.w <= 4 || e.h <= 4) continue;
    if (pointInRect(cx, cy, e)) return true;
  }
  return false;
}

function randomStickerWidthPx(rand) {
  return 40 + Math.floor(rand() * 41);
}

function vibeStickerDefFromFile(file) {
  const lower = file.toLowerCase();
  let category = "doodle";
  if (/heart/.test(lower)) category = "heart";
  else if (/spark/.test(lower)) category = "sparkle";
  else if (/flower/.test(lower)) category = "flower";
  const light = /\bwhite\b/i.test(file) || lower.includes("white heart");
  return {
    id: `vibe::${file}`,
    category,
    file,
    tags: [],
    weight: 1,
    ...(light ? { light: true } : {}),
  };
}

function buildStickerAnchorPoints(layoutItems, photoCount, rand) {
  /** @type {{ x: number, y: number, rotHint: number }[]} */
  const pts = [];
  for (let i = 0; i < layoutItems.length; i += 1) {
    const it = layoutItems[i];
    const cx = it.x + it.w / 2;
    const cy = it.y + it.h / 2;
    const rot = it.rot ?? 0;
    const hw = it.w / 2 + 14;
    const hh = it.h / 2 + 14;
    const locals = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
      [0, -hh - 22],
      [hw + 26, 0],
      [0, hh + 26],
      [-hw - 26, 0],
      [-hw * 0.55, -hh - 18],
      [hw * 0.55, -hh - 18],
    ];
    for (let k = 0; k < locals.length; k += 1) {
      const w = rotateOffset(locals[k][0], locals[k][1], rot);
      pts.push({ x: cx + w.x, y: cy + w.y, rotHint: rot });
    }
  }
  for (let i = 0; i < layoutItems.length; i += 1) {
    for (let j = i + 1; j < layoutItems.length; j += 1) {
      const a = layoutItems[i];
      const b = layoutItems[j];
      const ax = a.x + a.w / 2;
      const ay = a.y + a.h / 2;
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;
      if (Math.hypot(ax - bx, ay - by) < 360) {
        pts.push({
          x: (ax + bx) / 2 + (rand() * 2 - 1) * 20,
          y: (ay + by) / 2 + (rand() * 2 - 1) * 20,
          rotHint: 0,
        });
      }
    }
  }
  const titleKey = resultTitleLayoutKey(photoCount);
  const spec = RESULT_TITLE_LAYOUTS[titleKey];
  if (spec) {
    const pushNearTitle = (b) => {
      const L = Math.max(0, b.left);
      const W = Math.max(68, RESULT_STAGE_W - L);
      const tcx = L + W / 2;
      const tcy = b.top + b.h / 2;
      const r = b.rotation ?? 0;
      const offs = [
        rotateOffset(-W / 2 - 28 - rand() * 22, (rand() - 0.5) * 24, r),
        rotateOffset(W / 2 + 30 + rand() * 26, (rand() - 0.5) * 28, r),
        rotateOffset((rand() - 0.5) * W * 0.55, -b.h / 2 - 32 - rand() * 18, r),
        rotateOffset((rand() - 0.5) * W * 0.45, b.h / 2 + 36 + rand() * 22, r),
      ];
      for (let oi = 0; oi < offs.length; oi += 1) {
        pts.push({ x: tcx + offs[oi].x, y: tcy + offs[oi].y, rotHint: r });
      }
    };
    pushNearTitle(spec.main);
    pushNearTitle(spec.sub);
  }
  [
    { x: 48, y: 102 },
    { x: 338, y: 118 },
    { x: 200, y: 52 },
    { x: 24, y: 380 },
    { x: 368, y: 460 },
    { x: 92, y: 736 },
    { x: 312, y: 698 },
  ].forEach((p) => pts.push({ x: p.x, y: p.y, rotHint: 0 }));
  return shuffle(pts, rand);
}

/**
 * 콜라주당 스티커 5~6개 고정: 기본 1(Hearts / spark / white heart) + 바이브 2~3 + 나머지 채움.
 * 앵커: 사진 모서리·사이 간격·제목 근처·여백. 너비 40~80px. tape1은 첫 폴라로이드만 별도.
 */
function chooseVisionStickerPlacements(sorted, frames, cutouts, vibeRaw, rand) {
  const vibeKey = normalizeVibeKey(vibeRaw);
  const total = 5 + Math.floor(rand() * 2);
  const baseFile = BASE_ALWAYS_STICKERS[Math.floor(rand() * BASE_ALWAYS_STICKERS.length)];
  const vibePool = [...(VIBE_STICKER_POOLS[vibeKey] || VIBE_STICKER_POOLS.fallback)];
  const vibeN = 2 + Math.floor(rand() * 2);

  const files = [baseFile];
  const vibeShuffled = shuffle(
    vibePool.filter((f) => f !== baseFile),
    rand,
  );
  for (let i = 0; i < vibeShuffled.length && files.length < 1 + vibeN; i += 1) {
    files.push(vibeShuffled[i]);
  }
  while (files.length < 1 + vibeN) {
    files.push(vibePool[Math.floor(rand() * Math.max(1, vibePool.length))]);
  }

  const filler = shuffle(
    [...new Set([...vibePool, ...BASE_ALWAYS_STICKERS, ...VIBE_STICKER_POOLS.fallback])],
    rand,
  );
  let fillIdx = 0;
  while (files.length < total) {
    files.push(filler[fillIdx % filler.length]);
    fillIdx += 1;
  }

  const layoutItems = collectLayoutItems(frames, cutouts);
  const photoRects = collectLayoutPhotoRects(frames, cutouts);
  const anchors = buildStickerAnchorPoints(layoutItems, sorted.length, rand);

  /** @type { Array<{ def: *, x: number, y: number, w: number, rot: number, z: number }> } */
  const placements = [];
  /** @type {{ cx: number, cy: number }[]} */
  const placedCenters = [];

  for (let si = 0; si < files.length; si += 1) {
    const def = vibeStickerDefFromFile(files[si]);
    const w = randomStickerWidthPx(rand);
    const boxH = w * 1.08;
    let placed = false;

    for (let pass = 0; pass < 2 && !placed; pass += 1) {
      const list = pass === 0 ? anchors : buildStickerAnchorPoints(layoutItems, sorted.length, rand);
      for (let ai = 0; ai < list.length && !placed; ai += 1) {
        const a = list[ai];
        for (let t = 0; t < 10 && !placed; t += 1) {
          const cx = clamp(a.x + (rand() * 2 - 1) * 32, 26, RESULT_STAGE_W - 26);
          const cy = clamp(a.y + (rand() * 2 - 1) * 32, 34, RESULT_STAGE_H - 96);
          if (!centerAvoidsUi(cx, cy)) continue;
          const coreInset = pass === 0 ? 18 : 10;
          if (stickerCenterInsidePhotos(cx, cy, photoRects, coreInset)) continue;
          if (placedCenters.some((p) => (p.cx - cx) ** 2 + (p.cy - cy) ** 2 < 34 * 34)) continue;
          const left = cx - w / 2;
          const top = cy - boxH / 2;
          const rot = (a.rotHint ?? 0) + (rand() * 2 - 1) * 26;
          placedCenters.push({ cx, cy });
          placements.push({
            def,
            x: clamp(left, 2, RESULT_STAGE_W - w - 2),
            y: clamp(top, 26, RESULT_STAGE_H - boxH - 84),
            w,
            rot,
            z: 11 + si,
          });
          placed = true;
        }
      }
    }

    if (!placed) {
      for (let attempt = 0; attempt < 140; attempt += 1) {
        const cx = 32 + rand() * (RESULT_STAGE_W - 64);
        const cy = 40 + rand() * (RESULT_STAGE_H - 200);
        if (!centerAvoidsUi(cx, cy)) continue;
        if (stickerCenterInsidePhotos(cx, cy, photoRects, 8)) continue;
        if (placedCenters.some((p) => (p.cx - cx) ** 2 + (p.cy - cy) ** 2 < 28 * 28)) continue;
        const left = cx - w / 2;
        const top = cy - boxH / 2;
        placedCenters.push({ cx, cy });
        placements.push({
          def,
          x: clamp(left, 2, RESULT_STAGE_W - w - 2),
          y: clamp(top, 26, RESULT_STAGE_H - boxH - 84),
          w,
          rot: -28 + rand() * 56,
          z: 11 + si,
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const cx = 60 + (si % 5) * 68;
      const cy = 120 + si * 54;
      placedCenters.push({ cx, cy });
      placements.push({
        def,
        x: clamp(cx - w / 2, 2, RESULT_STAGE_W - w - 2),
        y: clamp(cy - boxH / 2, 26, RESULT_STAGE_H - boxH - 84),
        w,
        rot: -18 + rand() * 36,
        z: 11 + si,
      });
    }
  }

  placements.sort((a, b) => a.z - b.z);
  return { moodTags: [vibeKey, ...deriveMoodTags(sorted)], placements };
}

function averageWarmth(photos) {
  if (!photos.length) return 0;
  return photos.reduce((sum, p) => sum + p.score.warmth, 0) / photos.length;
}

/** Weights for cutout ranking among Vision-approved + aspect-eligible photos. */
const CUTOUT_TAG_WEIGHT = {
  person_main: 220,
  face: 150,
  person: 115,
  food: 52,
  object: 42,
  landscape: -195,
};

/** Portrait cutout aspect band: `photo.ratio` = width / height. */
const CUTOUT_ASPECT_W_OVER_H_MIN = 0.55;
const CUTOUT_ASPECT_W_OVER_H_MAX = 0.85;

/**
 * Heuristic tags for ranking tie-break only. Cutout eligibility = Claude Vision + `isCutoutAspectEligible`.
 * Do not infer `person` from pixels here.
 * @returns {string[]}
 */
function inferCutoutTagsFromHeuristic(photo) {
  const tags = [];
  const r = photo.ratio;

  if (r >= 1) tags.push("landscape");
  if (!tags.includes("landscape") && r >= 0.88 && r <= 1.12 && photo.score.warmth > 7) tags.push("food");
  if (!tags.includes("landscape") && r >= 0.82 && r <= 1.22) tags.push("object");

  return tags;
}

function mergePhotoCutoutTags(photo, analysisTagsByPhotoId) {
  const vision = analysisTagsByPhotoId?.[photo.id];
  const fromVision = Array.isArray(vision) ? vision : [];
  const heuristic = inferCutoutTagsFromHeuristic(photo);
  return [...new Set([...fromVision, ...heuristic])];
}

/** Proxy for “sharp / clear” — replace with edge-energy metric when needed. */
function estimateSharpnessHint(photo) {
  const warmthMag = Math.abs(photo.score.warmth);
  const midDist = 1 - Math.min(1, Math.abs(photo.score.brightness - 118) / 118);
  return warmthMag * 0.22 + midDist * 18;
}

/**
 * `photo.ratio` = width / height.
 * Cutout 후보: 세로(h > w)이고 w/h가 [CUTOUT_ASPECT_W_OVER_H_MIN, CUTOUT_ASPECT_W_OVER_H_MAX].
 * 파노라마(w > h), 정사각에 가까운 세로(w/h → 1), 극세로(w/h < 0.55) 제외.
 */
function isCutoutAspectEligible(photo) {
  const r = photo.ratio;
  return r < 1 && r >= CUTOUT_ASPECT_W_OVER_H_MIN && r <= CUTOUT_ASPECT_W_OVER_H_MAX;
}

/**
 * 세로샷 비율이 cutout 허용 밴드 중심에 가까울수록 고득점.
 */
function scoreTypicalPortraitAspectRatio(photo) {
  const r = photo.ratio;
  if (r >= 1) return 0;
  const lo = CUTOUT_ASPECT_W_OVER_H_MIN;
  const hi = CUTOUT_ASPECT_W_OVER_H_MAX;
  const mid = (lo + hi) / 2;
  const halfSpan = (hi - lo) / 2;
  if (r >= lo && r <= hi) {
    return 95 * (1 - Math.min(1, Math.abs(r - mid) / halfSpan));
  }
  if (r < lo) {
    return 28 * (r / lo);
  }
  return 22 * (1 - (r - hi) / (1 - hi));
}

/**
 * 썸네일에서 상단(하늘/원경) vs 중앙 밝기 차 — 풍경 위주 세로 샷(Banff 류) 페널티.
 * 세그멘테이션 없을 때의 거친 프록시.
 */
function scorePortraitSkyVsSubjectProxy(photo) {
  const img = photo.img;
  if (!img?.naturalWidth) return 0;

  const tw = 28;
  const th = 42;
  const c = document.createElement("canvas");
  c.width = tw;
  c.height = th;
  const sctx = c.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, tw, th);
  const data = sctx.getImageData(0, 0, tw, th).data;

  const lum = (x0, y0, x1, y1) => {
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const i = (y * tw + x) * 4;
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        n += 1;
      }
    }
    return n ? sum / n : 128;
  };

  const top = lum(0, 0, tw, Math.floor(th * 0.22));
  const mid = lum(0, Math.floor(th * 0.32), tw, Math.floor(th * 0.72));
  const edge = (lum(0, 0, Math.floor(tw * 0.18), th) + lum(Math.floor(tw * 0.82), 0, tw, th)) / 2;

  let score = 0;
  if (top > mid + 18) score -= 42 + Math.min(28, top - mid - 18);
  if (edge > mid + 12) score -= 18;
  const spread = Math.abs(top - mid) + Math.abs(edge - mid);
  if (spread < 14 && photo.ratio > 0.82) score -= 12;
  return score;
}

/**
 * 인물이 프레임을 많이 채울수록 유리: 극단적으로 긴 세로(먼 풀샷)는 약한 감점.
 */
function scorePortraitExtremityPenalty(photo) {
  const r = photo.ratio;
  if (r >= 1) return 0;
  if (r < 0.48) return -22 * (1 - r / 0.48);
  return 0;
}

function visionCutoutEligibilityCached(photoId) {
  return Object.prototype.hasOwnProperty.call(state.visionCutoutEligibleByPhotoId, photoId);
}

/** Same photo id → one in-flight request; result screen awaits this promise. */
const visionCutoutAnalysisPromisesByPhotoId = new Map();

function photoStillUploaded(photoId) {
  return state.photos.some((p) => p.id === photoId);
}

function applyVisionCutoutResult(photoId, ok, tagsFromApi) {
  if (!photoStillUploaded(photoId)) return;
  state.visionCutoutEligibleByPhotoId[photoId] = ok;
  if (Array.isArray(tagsFromApi) && tagsFromApi.length) {
    state.analysisTagsByPhotoId[photoId] = [...new Set(tagsFromApi)];
  } else {
    state.analysisTagsByPhotoId[photoId] = ok ? ["person_main", "person"] : [];
  }
}

async function analyzeOnePhotoVisionCutoutEligibility(photo) {
  if (visionCutoutEligibilityCached(photo.id)) return;
  const existing = visionCutoutAnalysisPromisesByPhotoId.get(photo.id);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const fd = new FormData();
      fd.append("image", photo.file, photo.file.name || "photo.jpg");
      const res = await fetch("/api/vision-cutout-eligible", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      const ok = data.person_main_subject === true;
      const tags = Array.isArray(data.tags) ? data.tags : [];
      applyVisionCutoutResult(photo.id, ok, tags);
    } catch (err) {
      console.warn("[vision-cutout] request failed", photo.file?.name || photo.id, err);
      applyVisionCutoutResult(photo.id, false, []);
    } finally {
      visionCutoutAnalysisPromisesByPhotoId.delete(photo.id);
    }
  })();

  visionCutoutAnalysisPromisesByPhotoId.set(photo.id, promise);
  return promise;
}

/** Each photo at most one Vision request; parallel batch. */
async function ensureVisionCutoutEligibility(photos) {
  const pending = photos.filter((p) => !visionCutoutEligibilityCached(p.id));
  if (!pending.length) return;
  await Promise.all(pending.map((p) => analyzeOnePhotoVisionCutoutEligibility(p)));
}

/**
 * Best-first for person cutouts: Claude `person_main_subject` + portrait aspect band.
 *
 * @param {typeof state.photos} photos
 * @param {Record<string, string[]>} [analysisTagsByPhotoId]
 * @returns {typeof state.photos}
 */
function rankCutoutCandidates(photos, analysisTagsByPhotoId = {}) {
  const map = { ...state.analysisTagsByPhotoId, ...analysisTagsByPhotoId };

  const eligible = photos.filter(
    (p) => state.visionCutoutEligibleByPhotoId[p.id] === true && isCutoutAspectEligible(p),
  );
  if (!eligible.length) return [];

  const scored = eligible.map((photo) => {
    const tags = mergePhotoCutoutTags(photo, map);
    let score =
      estimateSharpnessHint(photo) +
      scoreTypicalPortraitAspectRatio(photo) +
      scorePortraitSkyVsSubjectProxy(photo) +
      scorePortraitExtremityPenalty(photo);
    tags.forEach((t) => {
      score += CUTOUT_TAG_WEIGHT[t] ?? 0;
    });
    return { photo, score, tags };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.photo);
}

/**
 * Picks 1–2 **person cutout** candidates → remove.bg. Uses `rankCutoutCandidates`, optional overrides,
 * and collage capacity rules.
 */
function selectCutoutCandidates(sortedPhotos, rand) {
  const n = sortedPhotos.length;
  if (n === 0) return [];

  if (state.debugForceFirstPhotoCutout && state.photos.length > 0) {
    const first = state.photos[0];
    const match = sortedPhotos.find((p) => p.id === first.id);
    if (
      match &&
      state.visionCutoutEligibleByPhotoId[match.id] === true &&
      isCutoutAspectEligible(match)
    ) {
      console.log("[selectCutoutCandidates] personCutoutDebug=1 → single candidate (first upload)", match.file?.name, match.id);
      return [match];
    }
    if (match && state.visionCutoutEligibleByPhotoId[match.id] !== true) {
      console.warn(
        "[selectCutoutCandidates] personCutoutDebug=1 skipped: Claude Vision did not mark first upload as person-main",
        match.file?.name,
      );
    } else if (match && !isCutoutAspectEligible(match)) {
      console.warn(
        "[selectCutoutCandidates] personCutoutDebug=1 skipped: first upload outside cutout aspect band (portrait w/h in [0.55, 0.85])",
        match.file?.name,
      );
    } else {
      console.warn(
        "[selectCutoutCandidates] personCutoutDebug=1 but first upload not in collage list — check photo state",
        first?.id,
      );
    }
  }

  if (Array.isArray(state.selectedForCutout) && state.selectedForCutout.length > 0) {
    const idSet = new Map(sortedPhotos.map((p) => [p.id, p]));
    const picked = [];
    for (let i = 0; i < state.selectedForCutout.length && picked.length < 2; i += 1) {
      const id = state.selectedForCutout[i];
      const p = idSet.get(id);
      if (p && state.visionCutoutEligibleByPhotoId[p.id] === true && isCutoutAspectEligible(p)) picked.push(p);
    }
    if (picked.length) return picked;
  }

  const ranked = rankCutoutCandidates(sortedPhotos);

  let want = 0;
  if (n === 1) {
    want = 1;
  } else if (n === 2) {
    want = rand() < 0.45 ? 1 : 0;
  } else if (n === 3) {
    want = 1;
  } else {
    want = rand() < 0.52 ? 2 : 1;
  }

  want = clamp(want, 0, 2);
  if (n === 3) want = Math.min(want, 1);
  if (n === 2 && want > 0) want = 1;
  if (n >= 7) want = 2;
  if (n >= 4 && n <= 6) want = Math.min(want, 1);

  return ranked.slice(0, want);
}

function loadImageFromObjectUrl(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Cutout PNG decode failed"));
    im.src = url;
  });
}

/**
 * Calls server `/api/remove-bg` (remove.bg key only on server). On failure returns original asset.
 */
async function prepareCutoutPhoto(photo) {
  const fileName = photo.file?.name || "photo.jpg";
  console.log("[prepareCutoutPhoto] invoked", { photoId: photo.id, file: fileName });

  try {
    const fd = new FormData();
    fd.append("image", photo.file, photo.file.name || "photo.jpg");

    console.log("[prepareCutoutPhoto] fetch POST /api/remove-bg starting", { photoId: photo.id, file: fileName });

    const res = await fetch("/api/remove-bg", {
      method: "POST",
      body: fd,
    });

    console.log("[prepareCutoutPhoto] fetch /api/remove-bg returned", {
      file: fileName,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type") || "",
    });

    const ct = res.headers.get("content-type") || "";

    if (!res.ok) {
      let detail = await res.text();
      try {
        const j = JSON.parse(detail);
        detail = j.error || j.detail || detail;
      } catch {
        /* plain text */
      }
      const msg = String(detail).slice(0, 300);
      console.log("[remove-bg] response FAILED for", fileName, "| status:", res.status, "| message:", msg);
      const err = new Error(`${res.status}${msg ? `: ${msg}` : ""}`);
      err.httpStatus = res.status;
      throw err;
    }

    if (!ct.includes("png")) {
      const wrongTypeMsg = `expected image/png from /api/remove-bg, got ${ct || "unknown"}`;
      console.log("[remove-bg] response FAILED for", fileName, "| status:", res.status, "| message:", wrongTypeMsg);
      const err = new Error(wrongTypeMsg);
      err.httpStatus = res.status;
      throw err;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const img = await loadImageFromObjectUrl(url);

    console.log("[remove-bg] response OK for", fileName, "| status:", res.status);
    console.log("[remove-bg] PNG decoded — objectUrl + dimensions:", {
      objectUrl: url,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      file: fileName,
    });

    return {
      photoId: photo.id,
      url,
      img,
      source: "remove-bg",
      meta: {},
    };
  } catch (err) {
    const msg = String(err?.message || err);
    let httpStatus = err.httpStatus;
    if (httpStatus == null) {
      const m = /^(\d{3})(?::|\s|$)/.exec(msg);
      if (m) httpStatus = Number(m[1]);
    }
    console.log("remove.bg fallback used", "| file:", fileName, "| error:", msg);
    return {
      photoId: photo.id,
      url: photo.url,
      img: photo.img,
      source: "passthrough-fallback",
      meta: { error: msg, httpStatus },
    };
  }
}

/**
 * Fixed 393×852 layout: assign `successfulPairs` to cutout slots in order, `remaining` to plain/polaroid slots.
 * Extra cutouts (more remove.bg hits than template cutout slots) merge back into `remainingQueue`.
 * Cutout slot without PNG uses a polaroid frame at the same geometry and the next remaining photo.
 */
function buildFixedResultLayout(sorted, successfulPairs, remaining) {
  const n = sorted.length;
  const layoutKey = clamp(n, 2, 8);
  const template =
    n === 1
      ? [{ type: "polaroid", w: 224, h: 262, top: 400, left: 84, rotation: -3.2 }]
      : FIXED_RESULT_LAYOUTS[layoutKey];

  const cutoutSlots = template.filter((s) => s.type === "cutout").length;
  const cutoutQueue = successfulPairs.map((p) => ({ ...p }));
  const mergedRemaining = [...remaining];
  while (cutoutQueue.length > cutoutSlots) {
    const extra = cutoutQueue.pop();
    mergedRemaining.unshift(extra.photo);
  }

  const remainingQueue = mergedRemaining;
  const cutouts = [];
  const frames = [];

  template.forEach((slot, i) => {
    const item = {
      x: slot.left,
      y: slot.top,
      w: slot.w,
      h: slot.h,
      rot: slot.rotation,
      z: 4 + i,
    };

    if (slot.type === "cutout") {
      const pair = cutoutQueue.shift();
      if (pair) {
        cutouts.push({
          kind: "cutout",
          photo: pair.photo,
          prepared: pair.prepared,
          ...item,
        });
        return;
      }
      const ph = remainingQueue.shift();
      if (ph) {
        frames.push({ kind: "polaroid", photo: ph, ...item });
      }
      return;
    }

    const ph = remainingQueue.shift();
    if (!ph) return;
    frames.push({
      kind: slot.type === "plain" ? "plain" : "polaroid",
      photo: ph,
      ...item,
    });
  });

  const stickerLayoutPolaroids = frames.map((f, j) => ({
    kind: "polaroid",
    photo: f.photo,
    x: f.x,
    y: f.y,
    w: f.w,
    h: f.h,
    rot: f.rot,
    z: f.z,
  }));

  return { cutouts, frames, stickerLayoutPolaroids };
}

async function buildResultScene() {
  refreshCutoutDebugFlagsFromUrl();

  const sortedAll = sortedPhotosForCollage();
  const sorted = sortedAll.length > 8 ? sortedAll.slice(0, 8) : sortedAll;
  const rand = mulberry32(seedFromPhotos(sorted));
  const photoKey = collagePhotosKey(sorted);

  const [, vibeKey] = await Promise.all([
    ensureVisionCutoutEligibility(sorted),
    fetchVisionVibeStickers(sorted, photoKey),
  ]);

  const cutoutCandidates = selectCutoutCandidates(sorted, rand);
  console.log("[buildResultScene] cutout pipeline", {
    candidateCount: cutoutCandidates.length,
    names: cutoutCandidates.map((p) => p.file?.name || p.id),
    personCutoutDebug: state.debugForceFirstPhotoCutout,
  });

  const preparedList =
    cutoutCandidates.length > 0 ? await Promise.all(cutoutCandidates.map((p) => prepareCutoutPhoto(p))) : [];

  const successfulPairs = [];
  cutoutCandidates.forEach((p, i) => {
    const prep = preparedList[i];
    if (prep.source === "remove-bg") {
      successfulPairs.push({ photo: p, prepared: prep });
    }
  });

  const successfulIds = new Set(successfulPairs.map((s) => s.photo.id));
  const remaining = sorted.filter((p) => !successfulIds.has(p.id));

  const { cutouts, frames, stickerLayoutPolaroids } = buildFixedResultLayout(sorted, successfulPairs, remaining);

  const stickerRand = mulberry32((seedFromPhotos(sorted) ^ 0xbadc0fee) >>> 0);
  const stickerPack = chooseVisionStickerPlacements(sorted, frames, cutouts, vibeKey, stickerRand);

  const sortedFramesForTape = [...frames].sort((a, b) => a.z - b.z);
  const firstPolaroidIdx = sortedFramesForTape.findIndex((f) => f.kind === "polaroid");
  const tapeSortedFrameIndex = firstPolaroidIdx >= 0 ? firstPolaroidIdx : -1;

  return {
    heroes: [],
    polaroids: stickerLayoutPolaroids,
    frames,
    cutouts,
    mood: averageWarmth(sorted),
    sorted,
    moodTags: stickerPack.moodTags,
    stickers: stickerPack.placements,
    tapeSortedFrameIndex,
  };
}

/** Renders `assets/stickers/*` placements (Vision vibe + empty-space layout). */
function renderStickerAssetLayer(container, stickerPlacements) {
  if (!container) return;
  container.innerHTML = "";
  stickerPlacements.forEach((inst) => {
    const wrap = document.createElement("div");
    wrap.className = "sticker-slot";
    if (inst.def.category === "label") wrap.classList.add("sticker-slot--label");
    if (stickerNeedsContrastBoost(inst.def)) wrap.classList.add("sticker-slot--light");

    wrap.style.left = `${inst.x}px`;
    wrap.style.top = `${inst.y}px`;
    wrap.style.width = `${inst.w}px`;
    wrap.style.transform = `rotate(${inst.rot}deg)`;
    wrap.style.zIndex = String(inst.z);

    const img = document.createElement("img");
    img.src = stickerSrc(inst.def.file);
    img.alt = "";
    img.decoding = "async";
    wrap.append(img);
    container.append(wrap);
  });
}

function buildResultSceneFast(ordered) {
  refreshCutoutDebugFlagsFromUrl();

  const sorted = ordered.length > 8 ? ordered.slice(0, 8) : ordered;
  const vibeKey = normalizeVibeKey(state.collageVibeByPhotoKey?.key === collagePhotosKey(sorted) ? state.collageVibeByPhotoKey.vibe : "fallback");

  const { cutouts, frames, stickerLayoutPolaroids } = buildFixedResultLayout(sorted, [], [...sorted]);

  const stickerRand = mulberry32((seedFromPhotos(sorted) ^ 0xbadc0fee) >>> 0);
  const stickerPack = chooseVisionStickerPlacements(sorted, frames, cutouts, vibeKey, stickerRand);

  const sortedFramesForTape = [...frames].sort((a, b) => a.z - b.z);
  const firstPolaroidIdx = sortedFramesForTape.findIndex((f) => f.kind === "polaroid");
  const tapeSortedFrameIndex = firstPolaroidIdx >= 0 ? firstPolaroidIdx : -1;

  return {
    heroes: [],
    polaroids: stickerLayoutPolaroids,
    frames,
    cutouts,
    mood: averageWarmth(sorted),
    sorted,
    moodTags: stickerPack.moodTags,
    stickers: stickerPack.placements,
    tapeSortedFrameIndex,
  };
}

function renderResultDomFromScene(scene, photoCount, { applyTitleLayout }) {
  const dynamic = document.querySelector("#resultDynamic");
  const cutoutsEl = document.querySelector("#resultCutouts");
  const stickersEl = document.querySelector("#resultStickers");

  if (!dynamic || !stickersEl) {
    console.error("[renderResultCollage] missing #resultDynamic or #resultStickers");
    return false;
  }

  if (applyTitleLayout) applyResultTitleTextLayout(photoCount);

  dynamic.innerHTML = "";
  if (cutoutsEl) cutoutsEl.innerHTML = "";
  stickersEl.innerHTML = "";

  const frameItems = [...(scene.frames ?? [])].sort((a, b) => a.z - b.z);
  const tapeAtIndex = scene.tapeSortedFrameIndex ?? -1;

  frameItems.forEach((item, frameIndex) => {
    const el = document.createElement("div");
    const frameKind = item.kind === "plain" ? "plain" : "polaroid";
    el.className = `collage-item collage-item--crop collage-item--${frameKind}`;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.width = `${item.w}px`;
    el.style.height = `${item.h}px`;
    el.style.transform = `rotate(${item.rot}deg)`;
    el.style.zIndex = String(item.z);

    const img = document.createElement("img");
    img.src = item.photo.url;
    img.alt = "";

    if (item.kind === "plain") {
      const frame = document.createElement("div");
      frame.className = "plain-photo-frame";
      frame.append(img);
      el.append(frame);
    } else {
      const shell = document.createElement("div");
      shell.className = "polaroid-shell";
      shell.append(img);
      el.append(shell);
    }

    if (frameIndex === tapeAtIndex && item.kind === "polaroid") {
      const tape = document.createElement("div");
      tape.className = "collage-frame-tape";
      tape.setAttribute("aria-hidden", "true");
      const tapeImg = document.createElement("img");
      tapeImg.src = stickerSrc("tape1.svg");
      tapeImg.alt = "";
      tapeImg.decoding = "async";
      tape.append(tapeImg);
      el.append(tape);
    }

    dynamic.append(el);
  });

  if (cutoutsEl) {
    (scene.cutouts ?? []).forEach((item) => {
      const el = document.createElement("div");
      el.className = "collage-item collage-item--cutout";
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.width = `${item.w}px`;
      el.style.height = `${item.h}px`;
      el.style.transform = `rotate(${item.rot}deg)`;
      el.style.zIndex = String(item.z);

      const shell = document.createElement("div");
      shell.className = "cutout-shell";
      const img = document.createElement("img");
      img.src = item.prepared.url;
      img.alt = "";
      shell.append(img);
      el.append(shell);
      cutoutsEl.append(el);
    });
  }

  renderStickerAssetLayer(stickersEl, scene.stickers ?? []);

  (scene.stickers ?? []).forEach((s) => {
    loadStickerRaster(s.def.file);
  });

  return true;
}

async function enhanceResultSceneAsync(gen, ordered, pk, needAiText) {
  const vibePromise = fetchVisionVibeStickers(ordered, pk);
  const eligibilityPromise = ensureVisionCutoutEligibility(ordered);
  const copyPromise = needAiText ? fetchCollageCopyFromApi(ordered, pk) : null;

  try {
    const vibeKey = await vibePromise;
    if (gen !== renderResultCollageGeneration) return;

    // Update stickers quickly as soon as vibe is known.
    try {
      const fastScene = buildResultSceneFast(ordered);
      const stickerRand = mulberry32((seedFromPhotos(ordered) ^ 0xbadc0fee) >>> 0);
      const stickerPack = chooseVisionStickerPlacements(ordered, fastScene.frames ?? [], fastScene.cutouts ?? [], vibeKey, stickerRand);
      const stickersEl = document.querySelector("#resultStickers");
      if (stickersEl) renderStickerAssetLayer(stickersEl, stickerPack.placements);
    } catch {
      /* ignore */
    }

    if (copyPromise) {
      const copy = await copyPromise;
      if (gen !== renderResultCollageGeneration) return;
      const mainHasUserText = String(editableText.main?.innerText || "").trim().length > 0;
      const subHasUserText = String(editableText.sub?.innerText || "").trim().length > 0;
      if (!mainHasUserText && !subHasUserText) {
        applyCollageCopyToEditable(copy);
        state.collageTextPhotoKeyApplied = pk;
      }
    }

    await eligibilityPromise;
    if (gen !== renderResultCollageGeneration) return;

    // Cutouts are heavier: once ready, rebuild full layers (frames/cutouts/stickers) without touching title layout.
    const rand = mulberry32(seedFromPhotos(ordered));
    const cutoutCandidates = selectCutoutCandidates(ordered, rand);
    const preparedList =
      cutoutCandidates.length > 0 ? await Promise.all(cutoutCandidates.map((p) => prepareCutoutPhoto(p))) : [];

    if (gen !== renderResultCollageGeneration) return;

    const successfulPairs = [];
    cutoutCandidates.forEach((p, i) => {
      const prep = preparedList[i];
      if (prep.source === "remove-bg") successfulPairs.push({ photo: p, prepared: prep });
    });

    const successfulIds = new Set(successfulPairs.map((s) => s.photo.id));
    const remaining = ordered.filter((p) => !successfulIds.has(p.id));

    const { cutouts, frames, stickerLayoutPolaroids } = buildFixedResultLayout(ordered, successfulPairs, remaining);
    const stickerRand = mulberry32((seedFromPhotos(ordered) ^ 0xbadc0fee) >>> 0);
    const stickerPack = chooseVisionStickerPlacements(ordered, frames, cutouts, vibeKey, stickerRand);

    const sortedFramesForTape = [...frames].sort((a, b) => a.z - b.z);
    const firstPolaroidIdx = sortedFramesForTape.findIndex((f) => f.kind === "polaroid");
    const tapeSortedFrameIndex = firstPolaroidIdx >= 0 ? firstPolaroidIdx : -1;

    const fullScene = {
      heroes: [],
      polaroids: stickerLayoutPolaroids,
      frames,
      cutouts,
      mood: averageWarmth(ordered),
      sorted: ordered,
      moodTags: stickerPack.moodTags,
      stickers: stickerPack.placements,
      tapeSortedFrameIndex,
    };

    renderResultDomFromScene(fullScene, ordered.length, { applyTitleLayout: false });
  } catch (err) {
    console.warn("[enhanceResultSceneAsync] failed:", err);
  }
}

/** @returns {Promise<boolean>} `true` if the result DOM was rebuilt successfully. */
async function renderResultCollage() {
  refreshCutoutDebugFlagsFromUrl();

  const photos = sortedPhotosForCollage();
  if (!photos.length) {
    const dynamic = document.querySelector("#resultDynamic");
    const cutoutsEl = document.querySelector("#resultCutouts");
    const stickersEl = document.querySelector("#resultStickers");
    if (dynamic) dynamic.innerHTML = "";
    if (cutoutsEl) cutoutsEl.innerHTML = "";
    if (stickersEl) stickersEl.innerHTML = "";
    setEditableMultiline(editableText.main, "");
    setEditableMultiline(editableText.sub, "");
    state.collageTextPhotoKeyApplied = null;
    return false;
  }

  const gen = ++renderResultCollageGeneration;
  const ordered = photos.length > 8 ? photos.slice(0, 8) : photos;
  const pk = collagePhotosKey(ordered);
  const needAiText = pk !== state.collageTextPhotoKeyApplied;

  /** Fast render first — never block on Vision. Enhancements stream in later. */
  let scene;
  try {
    scene = buildResultSceneFast(ordered);
  } catch (err) {
    console.error("[renderResultCollage] buildResultSceneFast failed:", err);
    return false;
  }

  if (gen !== renderResultCollageGeneration) return false;
  const ok = renderResultDomFromScene(scene, ordered.length, { applyTitleLayout: true });
  if (!ok) return false;

  void enhanceResultSceneAsync(gen, ordered, pk, needAiText);
  return true;
}

function px(v) {
  return v * EXPORT_SCALE;
}

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.roundRect(x, y, w, h, rr);
}

function drawImageCoverCanvas(c, img, x, y, w, h) {
  const sourceRatio = img.width / img.height;
  const targetRatio = w / h;
  let sw = img.width;
  let sh = img.height;
  let sx0 = 0;
  let sy0 = 0;
  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx0 = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy0 = (img.height - sh) / 2;
  }
  c.drawImage(img, sx0, sy0, sw, sh, x, y, w, h);
}

/** object-fit: contain — transparent margins OK for future alpha cutouts */
function drawImageContainCanvasLocal(c, img, boxW, boxH) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const ir = iw / ih;
  const br = boxW / boxH;
  let dw;
  let dh;
  let dx;
  let dy;
  if (ir > br) {
    dw = boxW;
    dh = dw / ir;
    dx = -boxW / 2;
    dy = -dh / 2;
  } else {
    dh = boxH;
    dw = dh * ir;
    dx = -dw / 2;
    dy = -boxH / 2;
  }
  c.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
}

function drawRotatedCanvas(c, callback, cx, cy, degrees) {
  c.save();
  c.translate(cx, cy);
  c.rotate((degrees * Math.PI) / 180);
  callback();
  c.restore();
}

/** Same mapping as CSS: `background-size: 393px 852px` on the 393×852 stage → full canvas 1179×2556 */
function drawResultPaperBackground(c, destW, destH) {
  const img = paperTemplate;
  if (img.complete && img.naturalWidth) {
    c.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, destW, destH);
  } else {
    c.fillStyle = "#ebe4dc";
    c.fillRect(0, 0, destW, destH);
  }
}

function waitForResultPaperImage() {
  if (paperTemplate.complete && paperTemplate.naturalWidth) return Promise.resolve();
  return new Promise((resolve) => {
    paperTemplate.addEventListener("load", () => resolve(), { once: true });
    paperTemplate.addEventListener("error", () => resolve(), { once: true });
  });
}

/** Word-wrap for canvas titles — `maxW` in device pixels (same space as `ctx.measureText`). */
function wrapCanvasTitleLines(ctx, text, maxW) {
  const lines = [];
  const paragraphs = String(text || "").replace(/\r/g, "").split("\n");
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxW) {
        line = next;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      if (ctx.measureText(word).width <= maxW) {
        line = word;
        continue;
      }
      let w = word;
      while (w.length) {
        let lo = 1;
        let hi = w.length;
        let fit = 0;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const sub = w.slice(0, mid);
          if (ctx.measureText(sub).width <= maxW) {
            fit = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        const take = Math.max(1, fit);
        lines.push(w.slice(0, take));
        w = w.slice(take);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function exportCollageToCanvas() {
  await document.fonts.ready;
  await document.fonts.load('26px "Nothing You Could Do"');
  await document.fonts.load('28px "Nothing You Could Do"');
  await waitForResultPaperImage();

  const photos = sortedPhotosForCollage();
  if (!photos.length) return;

  let scene;
  try {
    scene = await buildResultScene();
  } catch (err) {
    console.error("[exportCollageToCanvas] buildResultScene failed:", err);
    return;
  }
  const frameItems = [...(scene.frames ?? [])].sort((a, b) => a.z - b.z);

  const w = exportCanvas.width;
  const h = exportCanvas.height;
  ctx.clearRect(0, 0, w, h);

  drawResultPaperBackground(ctx, w, h);

  const frameTapeRaster = await loadStickerRaster("tape1.svg");
  const tapeAtIndex = scene.tapeSortedFrameIndex ?? -1;

  for (let fi = 0; fi < frameItems.length; fi += 1) {
    const item = frameItems[fi];
    const ix = px(item.x);
    const iy = px(item.y);
    const iw = px(item.w);
    const ih = px(item.h);
    const photo = item.photo.img;

    drawRotatedCanvas(
      ctx,
      () => {
        if (item.kind === "plain") {
          ctx.shadowColor = "rgba(35, 24, 16, 0.22)";
          ctx.shadowBlur = px(10);
          ctx.shadowOffsetY = px(8);
          ctx.fillStyle = "#faf8f5";
          roundRectPath(ctx, -iw / 2, -ih / 2, iw, ih, px(10));
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.save();
          roundRectPath(ctx, -iw / 2, -ih / 2, iw, ih, px(10));
          ctx.clip();
          drawImageCoverCanvas(ctx, photo, -iw / 2, -ih / 2, iw, ih);
          ctx.restore();
        } else if (item.kind === "polaroid") {
          const padX = px(7);
          const padTop = px(7);
          const padBottom = px(22);
          const innerW = iw - padX * 2;
          const innerH = ih - padTop - padBottom;
          ctx.shadowColor = "rgba(35, 24, 16, 0.2)";
          ctx.shadowBlur = px(9);
          ctx.shadowOffsetY = px(7);
          ctx.fillStyle = "#f7f7f4";
          roundRectPath(ctx, -iw / 2, -ih / 2, iw, ih, px(4));
          ctx.fill();
          ctx.shadowColor = "transparent";
          ctx.save();
          ctx.beginPath();
          ctx.rect(-iw / 2 + padX, -ih / 2 + padTop, innerW, innerH);
          ctx.clip();
          drawImageCoverCanvas(ctx, photo, -iw / 2 + padX, -ih / 2 + padTop, innerW, innerH);
          ctx.restore();
        }
      },
      ix + iw / 2,
      iy + ih / 2,
      item.rot,
    );

    if (frameTapeRaster && fi === tapeAtIndex && item.kind === "polaroid") {
      const tapeW = px(56);
      const tapeH = tapeW * (frameTapeRaster.naturalHeight / frameTapeRaster.naturalWidth);
      drawRotatedCanvas(
        ctx,
        () => {
          ctx.drawImage(frameTapeRaster, -tapeW / 2, -ih / 2 - px(15), tapeW, tapeH);
        },
        ix + iw / 2,
        iy + ih / 2,
        item.rot,
      );
    }
  }

  (scene.cutouts ?? []).forEach((item) => {
    const prep = item.prepared;
    const photoImg = prep.img;
    if (!photoImg || !(photoImg.naturalWidth || photoImg.width)) return;
    const ix = px(item.x);
    const iy = px(item.y);
    const iw = px(item.w);
    const ih = px(item.h);
    const cx = ix + iw / 2;
    const cy = iy + ih / 2;

    drawRotatedCanvas(
      ctx,
      () => {
        ctx.shadowColor = "rgba(35, 24, 16, 0.22)";
        ctx.shadowBlur = px(10);
        ctx.shadowOffsetY = px(7);
        drawImageContainCanvasLocal(ctx, photoImg, iw, ih);
        ctx.shadowColor = "transparent";
      },
      cx,
      cy,
      item.rot,
    );
  });

  const stickerPlacements = scene.stickers ?? [];
  for (let i = 0; i < stickerPlacements.length; i += 1) {
    const s = stickerPlacements[i];
    const img = await loadStickerRaster(s.def.file);
    if (!img || !img.naturalWidth) continue;
    const sw = px(s.w);
    const sh = sw * (img.naturalHeight / img.naturalWidth);
    const cx = px(s.x) + sw / 2;
    const cy = px(s.y) + sh / 2;

    const contrastBoost = stickerNeedsContrastBoost(s.def);

    drawRotatedCanvas(
      ctx,
      () => {
        ctx.shadowColor = contrastBoost ? "rgba(40, 28, 18, 0.5)" : "rgba(35, 24, 16, 0.2)";
        ctx.shadowBlur = contrastBoost ? px(11) : px(5);
        ctx.shadowOffsetY = contrastBoost ? px(5) : px(4);
        ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
        ctx.shadowColor = "transparent";
      },
      cx,
      cy,
      s.rot,
    );
  }

  ctx.fillStyle = "#2a211a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const layoutKey = resultTitleLayoutKey(photos.length);
  const titleSpec = RESULT_TITLE_LAYOUTS[layoutKey];
  const mainText = editableText.main?.innerText || "";
  const subText = editableText.sub?.innerText || "";

  const drawTextBlock = (text, fontPx, linePx, cx, cy, rotationDeg, maxWidthDesign) => {
    ctx.font = `${px(fontPx)}px "Nothing You Could Do", cursive`;
    const innerPad = px(16);
    const maxW = Math.max(px(24), px(maxWidthDesign) - innerPad);
    const lines = wrapCanvasTitleLines(ctx, text, maxW);
    if (!lines.length) return;
    drawRotatedCanvas(
      ctx,
      () => {
        lines.forEach((line, i, arr) => {
          const yy = (i - (arr.length - 1) / 2) * px(linePx);
          ctx.fillText(line, 0, yy);
        });
      },
      cx,
      cy,
      rotationDeg,
    );
  };

  if (titleSpec && editableText.main && editableText.sub) {
    const mGeo = titleBlockExportGeometryFromDom(editableText.main, titleSpec.main);
    const sGeo = titleBlockExportGeometryFromDom(editableText.sub, titleSpec.sub);
    if (mGeo) {
      drawTextBlock(mainText, 28, 30, px(mGeo.cx), px(mGeo.cy), mGeo.rotation, mGeo.maxWidth);
    }
    if (sGeo) {
      drawTextBlock(subText, 26, 28, px(sGeo.cx), px(sGeo.cy), sGeo.rotation, sGeo.maxWidth);
    }
  }
}

document.querySelector("#openUpload").addEventListener("click", (event) => {
  event.stopPropagation();
  showScreen("upload");
  openPhotoPicker();
});

document.querySelector('[data-screen="start"]').addEventListener("click", () => {
  showScreen("intro");
});

document.querySelector('[data-screen="intro"]').addEventListener("click", (event) => {
  if (event.target.id === "openUpload") return;
  showScreen("upload");
  openPhotoPicker();
});

document.querySelector("#uploadResetHit")?.addEventListener("click", (event) => {
  event.stopPropagation();
  resetAllUploadPhotos();
});

document.querySelector("#makeDump").addEventListener("click", async (event) => {
  event.stopPropagation();
  if (!state.photos.length) {
    openPhotoPicker();
    return;
  }
  if (makeDumpInFlight) return;
  makeDumpInFlight = true;
  showScreen("loading");
  try {
    const ok = await renderResultCollage();
    if (ok) showScreen("result", { skipCollageRender: true });
    else showScreen("upload");
  } catch (err) {
    console.error("[makeDump] renderResultCollage failed:", err);
    showScreen("upload");
  } finally {
    makeDumpInFlight = false;
  }
});

document.querySelector("#editAgain").addEventListener("click", () => showScreen("upload"));

document.querySelector("#saveImage").addEventListener("click", async () => {
  await exportCollageToCanvas();
  const link = document.createElement("a");
  link.download = "dump.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
});

photoInput.addEventListener("change", async (event) => {
  await addPhotos(event.target.files);
  photoInput.value = "";
  state.pickingPhotos = false;
});

renderUploadGrid();
installResultTitleDrag();
setTimeout(() => showScreen("intro"), 900);
