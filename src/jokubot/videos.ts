// Génération de vidéos : les photos sont animées et filmées dans la page (canvas),
// sans service extérieur. Zoom lent, fondus, textes, écran de fin.

export type VFormat = "vertical" | "carre" | "horizontal";
export type Theme = "noir" | "blanc" | "vif";

export const V_FORMATS: { id: VFormat; name: string; hint: string; width: number; height: number }[] = [
  { id: "vertical", name: "Vertical", hint: "TikTok, Reels, statut", width: 720, height: 1280 },
  { id: "carre", name: "Carré", hint: "Publication", width: 720, height: 720 },
  { id: "horizontal", name: "Horizontal", hint: "Facebook, YouTube", width: 1280, height: 720 },
];

export const THEMES: { id: Theme; name: string; bg: string; fg: string; accent: string; onAccent: string }[] = [
  { id: "noir", name: "Noir", bg: "#0a0a0a", fg: "#ffffff", accent: "#ffffff", onAccent: "#0a0a0a" },
  { id: "blanc", name: "Blanc", bg: "#ffffff", fg: "#0a0a0a", accent: "#0a0a0a", onAccent: "#ffffff" },
  { id: "vif", name: "Couleur vive", bg: "#f2c230", fg: "#111111", accent: "#d7263d", onAccent: "#ffffff" },
];

export const FADE = 0.6; // fondu entre deux photos, en secondes
export const OUTRO = 3; // écran de fin, en secondes

export type Scene = {
  images: HTMLImageElement[];
  title: string;
  offer: string;
  cta: string;
  phone: string;
  theme: Theme;
  per: number; // secondes par photo
  font: string;
};

export function duration(scene: Scene) {
  return scene.images.length * scene.per + OUTRO;
}

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Photo en plein cadre (recadrée), avec un zoom lent qui change de sens une photo sur deux. */
function drawPhoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, progress: number, index: number) {
  const zoom = 1.04 + 0.1 * progress;
  const cover = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * cover;
  const dh = img.naturalHeight * cover;
  const pan = (index % 2 ? -1 : 1) * (dw - w) * 0.3 * (progress - 0.5);
  ctx.drawImage(img, (w - dw) / 2 + pan, (h - dh) / 2, dw, dh);
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, bg: string, fg: string) {
  const padX = size * 0.7;
  const height = size * 1.9;
  const width = ctx.measureText(text).width + padX * 2;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + height / 2 + size * 0.05);
}

/** Dessine l'image de la vidéo au temps `time` (secondes). */
export function draw(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, scene: Scene) {
  const theme = THEMES.find((th) => th.id === scene.theme)!;
  const unit = Math.min(w, h);
  const margin = unit * 0.07;
  const n = scene.images.length;
  const slidesEnd = n * scene.per;
  ctx.textAlign = "left";

  // Photos, avec fondu de l'une à l'autre.
  if (time < slidesEnd || n === 0) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
  }
  if (n && time < slidesEnd + FADE) {
    const i = Math.min(Math.floor(time / scene.per), n - 1);
    const local = time - i * scene.per;
    drawPhoto(ctx, scene.images[i]!, w, h, local / scene.per, i);
    if (i > 0 && local < FADE) {
      ctx.globalAlpha = 1 - local / FADE;
      drawPhoto(ctx, scene.images[i - 1]!, w, h, (scene.per + local) / scene.per, i - 1);
      ctx.globalAlpha = 1;
    }

    // Bas assombri pour lire le titre.
    const shade = ctx.createLinearGradient(0, h * 0.5, 0, h);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);

    if (scene.title) {
      const appear = easeOut(time / 0.8);
      const size = unit * 0.075;
      ctx.font = `800 ${size}px ${scene.font}`;
      const lines = wrap(ctx, scene.title, w - margin * 2);
      ctx.globalAlpha = appear;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "alphabetic";
      lines.forEach((line, k) => {
        const y = h - margin - (lines.length - 1 - k) * size * 1.15 + (1 - appear) * size;
        ctx.fillText(line, margin, y);
      });
      ctx.globalAlpha = 1;
    }

    if (scene.offer) {
      const appear = easeOut((time - 0.4) / 0.6);
      const size = unit * 0.045;
      ctx.font = `800 ${size}px ${scene.font}`;
      ctx.globalAlpha = appear;
      pill(ctx, margin - (1 - appear) * unit * 0.1, margin, scene.offer, size, theme.accent, theme.onAccent);
      ctx.globalAlpha = 1;
    }
  }

  // Écran de fin : message et numéro.
  if (time >= slidesEnd || n === 0) {
    const o = n === 0 ? OUTRO : time - slidesEnd;
    ctx.globalAlpha = n === 0 ? 1 : easeOut(o / FADE);
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;

    const rise = (delay: number) => easeOut((o - delay) / 0.6);
    let y = h / 2;
    const blocks: { text: string; size: number; weight: number; color: string; delay: number }[] = [];
    if (scene.title) blocks.push({ text: scene.title, size: unit * 0.05, weight: 600, color: theme.fg, delay: 0.2 });
    blocks.push({ text: scene.cta || " ", size: unit * 0.085, weight: 800, color: theme.fg, delay: 0.4 });
    const measured = blocks.map((b) => {
      ctx.font = `${b.weight} ${b.size}px ${scene.font}`;
      return { ...b, lines: wrap(ctx, b.text, w - margin * 2) };
    });
    const phoneSize = unit * 0.05;
    const total =
      measured.reduce((sum, b) => sum + b.lines.length * b.size * 1.2 + unit * 0.03, 0) + (scene.phone ? phoneSize * 2.6 : 0);
    y = (h - total) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (const b of measured) {
      const a = rise(b.delay);
      ctx.globalAlpha = a;
      ctx.font = `${b.weight} ${b.size}px ${scene.font}`;
      ctx.fillStyle = b.color;
      for (const line of b.lines) {
        ctx.fillText(line, w / 2, y + (1 - a) * unit * 0.04);
        y += b.size * 1.2;
      }
      y += unit * 0.03;
    }
    if (scene.phone) {
      const a = rise(0.7);
      ctx.globalAlpha = a;
      ctx.font = `800 ${phoneSize}px ${scene.font}`;
      const width = ctx.measureText(scene.phone).width + phoneSize * 1.4;
      ctx.textAlign = "left";
      pill(ctx, (w - width) / 2, y + phoneSize * 0.4, scene.phone, phoneSize, theme.accent, theme.onAccent);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
}

/** Format vidéo : MP4 si le navigateur sait l'enregistrer (lu partout, WhatsApp compris), sinon WebM. */
export function pickMime(): string {
  const options = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

/** Filme le canvas en temps réel pendant toute la durée de la vidéo. */
export function record(
  canvas: HTMLCanvasElement,
  scene: Scene,
  onProgress: (ratio: number) => void,
): { done: Promise<Blob>; cancel: () => void } {
  const ctx = canvas.getContext("2d")!;
  const total = duration(scene);
  const mime = pickMime();
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  let frame = 0;
  let cancelled = false;

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      if (cancelled) reject(new Error("cancelled"));
      else resolve(new Blob(chunks, { type: recorder.mimeType || mime || "video/webm" }));
    };
  });

  draw(ctx, canvas.width, canvas.height, 0, scene);
  recorder.start(250);
  const start = performance.now();
  const tick = () => {
    const time = (performance.now() - start) / 1000;
    draw(ctx, canvas.width, canvas.height, Math.min(time, total), scene);
    onProgress(Math.min(time / total, 1));
    if (time >= total) {
      recorder.stop();
      return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    done,
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}
