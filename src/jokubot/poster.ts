// Affiche de démonstration, en noir et blanc, tirée de la description.
// Le vrai moteur de création remplacera cette fonction par une image générée.

import type { VisualFormat } from "./db.js";
import { amount, fold } from "./format.js";
import { t } from "./prefs.js";

const PRICE = /(\d{1,3}(?:[\s.  ]\d{3})+|\d{4,7})\s*(?:f\s?cfa|fcfa|francs?|f)?\b/i;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
}

export function findPrice(description: string): number | null {
  const match = PRICE.exec(description);
  if (!match?.[1]) return null;
  const value = Number.parseInt(match[1].replace(/\D/g, ""), 10);
  return Number.isFinite(value) && value >= 100 ? value : null;
}

function headline(description: string): string[] {
  const words = description
    .replace(PRICE, " ")
    .replace(/\b(à|a|pour|prix|seulement)\s*$/i, "")
    .replace(/[^\p{L}\p{N}' -]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > 13 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4).map((l) => l.toUpperCase());
}

function pattern(seed: number, width: number, height: number): string {
  const kind = seed % 3;
  const parts: string[] = [];
  if (kind === 0) {
    // Losanges imbriqués, façon motif wax.
    const size = 120;
    for (let y = -size; y < height + size; y += size) {
      for (let x = -size; x < width + size; x += size) {
        const cx = x + ((y / size) % 2 === 0 ? 0 : size / 2);
        parts.push(
          `<path d="M${cx} ${y - 50}L${cx + 50} ${y}L${cx} ${y + 50}L${cx - 50} ${y}Z" fill="none" stroke="#fff" stroke-width="6"/>`,
          `<circle cx="${cx}" cy="${y}" r="12" fill="#fff"/>`,
        );
      }
    }
  } else if (kind === 1) {
    // Cercles concentriques.
    for (let r = 60; r < Math.max(width, height) * 1.2; r += 54) {
      parts.push(`<circle cx="${width * 0.82}" cy="${height * 0.18}" r="${r}" fill="none" stroke="#fff" stroke-width="10"/>`);
    }
  } else {
    // Rayures obliques.
    for (let x = -height; x < width + height; x += 70) {
      parts.push(`<path d="M${x} 0L${x + height} ${height}" stroke="#fff" stroke-width="18"/>`);
    }
  }
  return parts.join("");
}

export function makePoster(description: string, format: VisualFormat, business: string): string {
  const width = 1080;
  const height = format === "carre" ? 1080 : 1920;
  const seed = hash(fold(description));
  const price = findPrice(description);
  const lines = headline(description);
  const patternHeight = Math.round(height * (format === "carre" ? 0.42 : 0.5));
  const titleSize = lines.some((l) => l.length > 10) ? 92 : 112;
  const titleTop = patternHeight + (price ? 200 : 150);

  const title = lines
    .map(
      (line, i) =>
        `<text x="80" y="${titleTop + i * (titleSize + 10)}" font-size="${titleSize}" font-weight="800" letter-spacing="-2">${escapeXml(line)}</text>`,
    )
    .join("");

  const priceBlock = price
    ? `<g transform="translate(${width - 80} ${patternHeight})">
        <rect x="-440" y="-80" width="440" height="160" fill="#000"/>
        <text x="-220" y="-14" text-anchor="middle" font-size="30" font-weight="600" fill="#fff" letter-spacing="6">${escapeXml(t("PRIX"))}</text>
        <text x="-220" y="52" text-anchor="middle" font-size="64" font-weight="800" fill="#fff">${amount(price)} F</text>
      </g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Plus Jakarta Sans, Arial, Helvetica, sans-serif">
  <rect width="${width}" height="${height}" fill="#fff"/>
  <rect width="${width}" height="${patternHeight}" fill="#000"/>
  <defs><clipPath id="top"><rect width="${width}" height="${patternHeight}"/></clipPath></defs>
  <g clip-path="url(#top)" opacity="0.9">${pattern(seed, width, patternHeight)}</g>
  ${priceBlock}
  <g fill="#000">${title}</g>
  <rect x="80" y="${height - 150}" width="${width - 160}" height="4" fill="#000"/>
  <text x="80" y="${height - 80}" font-size="40" font-weight="700" fill="#000">${escapeXml(business)}</text>
  <text x="${width - 80}" y="${height - 80}" font-size="32" font-weight="500" fill="#000" text-anchor="end">${escapeXml(t("Commandez sur WhatsApp"))}</text>
</svg>`;
}

export function posterUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function makeCaption(description: string, business: string, delivery: string | null): string {
  const price = findPrice(description);
  const base = description.replace(PRICE, "").replace(/\s+(à|a|pour)\s*$/i, "").trim();
  const sentence = base ? base.charAt(0).toUpperCase() + base.slice(1) : t("Nouveauté en boutique");
  const parts = [`${sentence.replace(/[.!]$/, "")} !`];
  if (price) parts.push(t("Seulement {prix} FCFA.", { prix: amount(price) }));
  if (delivery) parts.push(delivery);
  parts.push(t("Écrivez-nous sur WhatsApp pour commander."));
  const keywords = fold(base)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !["pour", "avec", "dans", "tres", "nouveau", "nouvelle"].includes(w))
    .slice(0, 3)
    .map((w) => `#${w.charAt(0).toUpperCase()}${w.slice(1)}`);
  const businessTag = `#${fold(business)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")}`;
  const tags = [...new Set([businessTag, ...keywords, "#Abidjan", "#225"])];
  return `${parts.join(" ")}\n\n${tags.join(" ")}`;
}

/** Télécharge l'affiche en PNG (repli en SVG si le navigateur refuse). */
export async function downloadPoster(svg: string, name: string): Promise<void> {
  const url = posterUrl(svg);
  const fallback = () => triggerDownload(url, `${name}.svg`);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || 1080;
    canvas.height = image.naturalHeight || 1080;
    const context = canvas.getContext("2d");
    if (!context) return fallback();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return fallback();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, `${name}.png`);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch {
    fallback();
  }
}

export function triggerDownload(href: string, filename: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}
