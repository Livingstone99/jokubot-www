import { useEffect, useRef } from "react";

/* Removes the black backdrop from a clip shot on black.
   Luminance ramp: below LOW is fully transparent, above HIGH is opaque.
   Only dark regions connected to the frame edge through passages wider than a
   few pixels are keyed, so dark areas enclosed by the subject (the robot's
   visor, joint seams) stay intact. When an arm or phone briefly bridges the
   visor to the backdrop, dark pixels that were enclosed within the last HOLD
   seconds stay opaque. The mask is computed at half resolution. */
const LOW = 22;
const HIGH = 60;
const HOLD = 0.6;

/** Per-pixel 1 if every (erode) or any (dilate) pixel within r along one axis is set. */
function sweep(src: Uint8Array, w: number, h: number, r: number, vertical: boolean, all: boolean) {
  const out = new Uint8Array(w * h);
  const len = vertical ? h : w;
  const lines = vertical ? w : h;
  const sum = new Int32Array(len + 1);
  for (let l = 0; l < lines; l++) {
    const at = (k: number) => (vertical ? k * w + l : l * w + k);
    for (let k = 0; k < len; k++) sum[k + 1] = sum[k]! + src[at(k)]!;
    for (let k = 0; k < len; k++) {
      const a = Math.max(0, k - r);
      const b = Math.min(len, k + r + 1);
      const c = sum[b]! - sum[a]!;
      out[at(k)] = all ? (c === b - a ? 1 : 0) : c > 0 ? 1 : 0;
    }
  }
  return out;
}

/** Flood from the frame edge through `open` pixels. */
function floodFromEdge(open: Uint8Array, w: number, h: number) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  const push = (p: number) => {
    if (!seen[p] && open[p]) {
      seen[p] = 1;
      stack[top++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (top > 0) {
    const p = stack[--top]!;
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < n - w) push(p + w);
  }
  return seen;
}

export type KeyState = { w: number; h: number; enclosedAt: Float32Array; lastTime: number };

export function createKeyState(): KeyState {
  return { w: 0, h: 0, enclosedAt: new Float32Array(0), lastTime: -1 };
}

export function keyFrame(data: Uint8ClampedArray, w: number, h: number, time: number, state: KeyState) {
  const mw = w >> 1;
  const mh = h >> 1;
  const m = mw * mh;
  // New size or the clip looped/seeked: forget what was enclosed.
  if (state.w !== mw || state.h !== mh || time < state.lastTime) {
    state.w = mw;
    state.h = mh;
    state.enclosedAt = new Float32Array(m).fill(-Infinity);
  }
  state.lastTime = time;

  const dark = new Uint8Array(m);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      let s = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((2 * y + dy) * w + 2 * x + dx) * 4;
          s += data[i]! * 77 + data[i + 1]! * 150 + data[i + 2]! * 29;
        }
      }
      dark[y * mw + x] = s >> 10 < HIGH ? 1 : 0;
    }
  }

  const r = Math.max(2, Math.round(mw / 100));
  // Erode so thin dark gaps no longer connect enclosed areas to the backdrop.
  const core = sweep(sweep(dark, mw, mh, r, false, true), mw, mh, r, true, true);

  // Refresh memory from an unprotected pass, then flood again with it.
  const raw = floodFromEdge(core, mw, mh);
  const enclosedAt = state.enclosedAt;
  const held = new Uint8Array(m);
  for (let p = 0; p < m; p++) {
    if (dark[p] && !raw[p]) enclosedAt[p] = time;
    held[p] = dark[p] && time - enclosedAt[p]! <= HOLD ? 1 : 0;
    if (held[p]) core[p] = 0;
  }
  const seen = floodFromEdge(core, mw, mh);
  // Grow back to the subject's edge (erosion shrank the backdrop by r).
  const bg = sweep(sweep(seen, mw, mh, r + 1, false, false), mw, mh, r + 1, true, false);

  for (let y = 0; y < h; y++) {
    const my = Math.min(mh - 1, y >> 1);
    for (let x = 0; x < w; x++) {
      const mp = my * mw + Math.min(mw - 1, x >> 1);
      if (!bg[mp] || held[mp]) continue;
      const i = (y * w + x) * 4;
      const lum = (data[i]! * 77 + data[i + 1]! * 150 + data[i + 2]! * 29) >> 8;
      if (lum >= HIGH) continue;
      const a = Math.max(0, (lum - LOW) / (HIGH - LOW));
      data[i + 3] = a * 255;
      if (a > 0) {
        // Un-premultiply against black so edges don't keep a dark halo.
        data[i] = Math.min(255, data[i]! / a);
        data[i + 1] = Math.min(255, data[i + 1]! / a);
        data[i + 2] = Math.min(255, data[i + 2]! / a);
      }
    }
  }
}

type Props = {
  src: string;
  className?: string;
  label?: string;
};

/** Plays a clip shot on black with the backdrop removed, via a canvas. */
export function KeyedVideo({ src, className, label }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!video || !canvas || !ctx) return;

    const state = createKeyState();
    let raf = 0;
    let lastTime = -1;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (video.readyState < 2 || !video.videoWidth) return;
      if (video.currentTime === lastTime) return;
      lastTime = video.currentTime;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      keyFrame(frame.data, canvas.width, canvas.height, video.currentTime, state);
      ctx.putImageData(frame, 0, 0);
    };
    raf = requestAnimationFrame(draw);
    video.play().catch(() => {});
    return () => cancelAnimationFrame(raf);
  }, [src]);

  return (
    <>
      <video
        ref={videoRef}
        className="keyed-video-source"
        src={src}
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <canvas ref={canvasRef} className={className} role="img" aria-label={label} width={480} height={848} />
    </>
  );
}
