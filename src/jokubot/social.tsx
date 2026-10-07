// Réseaux sociaux (X, Instagram, Facebook, TikTok) : logos, règles de
// publication et données fictives. Aucune connexion réelle à leurs API.

import type { SocialId, SocialPost } from "./db.js";
import { uid } from "./format.js";

export const SOCIAL_IDS: SocialId[] = ["x", "instagram", "facebook", "tiktok"];

export function isSocial(id: string): id is SocialId {
  return (SOCIAL_IDS as string[]).includes(id);
}

/** Règles de chaque réseau pour une publication. */
export const SOCIAL_RULES: Record<SocialId, { maxLength: number; media: "required-image" | "required-video" | "optional"; accept: string }> = {
  x: { maxLength: 280, media: "optional", accept: "image/*,video/*" },
  instagram: { maxLength: 2200, media: "required-image", accept: "image/*,video/*" },
  facebook: { maxLength: 5000, media: "optional", accept: "image/*,video/*" },
  tiktok: { maxLength: 2200, media: "required-video", accept: "video/*" },
};

/** Types de compte proposés à la connexion, en cartes à choisir. */
export const ACCOUNT_TYPES: Record<SocialId, { value: string; label: string; description: string; disabled?: boolean; badge?: string }[]> = {
  x: [
    { value: "entreprise", label: "Compte entreprise", description: "Pour votre boutique ou votre marque." },
    { value: "personnel", label: "Compte personnel", description: "Votre propre compte X." },
  ],
  instagram: [
    { value: "professionnel", label: "Compte professionnel", description: "Pour une boutique : statistiques et contact." },
    { value: "createur", label: "Compte créateur", description: "Pour une personnalité ou un créateur." },
    { value: "personnel", label: "Compte personnel", description: "Passez-le en professionnel dans Instagram.", disabled: true, badge: "Non pris en charge" },
  ],
  facebook: [
    { value: "page", label: "Page Facebook", description: "La page publique de votre boutique." },
    { value: "groupe", label: "Groupe Facebook", description: "Un groupe que vous gérez.", disabled: true, badge: "Bientôt" },
  ],
  tiktok: [
    { value: "entreprise", label: "Compte entreprise", description: "Pour une boutique ou une marque." },
    { value: "createur", label: "Compte créateur", description: "Pour publier en votre nom." },
  ],
};

export const RHYTHM_LABEL: Record<"jour" | "3-semaine" | "semaine" | "manuel", string> = {
  jour: "Chaque jour",
  "3-semaine": "3 fois par semaine",
  semaine: "1 fois par semaine",
  manuel: "Seulement quand je le demande",
};

/** Abonnés affichés pour un compte fictif. */
export const MOCK_FOLLOWERS: Record<SocialId, number> = {
  x: 512,
  instagram: 3480,
  facebook: 1240,
  tiktok: 8900,
};

function daysAgo(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

/** Publications fictives créées quand un compte est connecté. */
export function mockPosts(network: SocialId): SocialPost[] {
  const base: Record<SocialId, { text: string; media?: SocialPost["media"]; likes: number; comments: number }[]> = {
    x: [
      { text: "Nouveaux pagnes wax arrivés ce matin à Marcory. Premiers servis !", likes: 24, comments: 3 },
      { text: "Livraison partout à Abidjan pour 1 000 FCFA. Écrivez-nous sur WhatsApp.", likes: 11, comments: 1 },
    ],
    instagram: [
      { text: "Wax hollandais bleu, 6 yards : 15 000 FCFA. Disponible en boutique.", media: { kind: "image", name: "wax-bleu.jpg" }, likes: 186, comments: 14 },
      { text: "Les couleurs de la semaine ✨ Quelle est votre préférée ?", media: { kind: "image", name: "couleurs.jpg" }, likes: 142, comments: 22 },
    ],
    facebook: [
      { text: "Promo du vendredi : -10 % sur tous les super wax. Passez nous voir à Marcory !", media: { kind: "image", name: "promo.jpg" }, likes: 58, comments: 9 },
      { text: "Nous sommes ouverts du lundi au samedi, de 8 h à 19 h.", likes: 21, comments: 2 },
    ],
    tiktok: [
      { text: "Comment plier un pagne 6 yards en 30 secondes 👀", media: { kind: "video", name: "pliage.mp4" }, likes: 1320, comments: 87 },
      { text: "Déballage des nouveautés wax de la semaine", media: { kind: "video", name: "deballage.mp4" }, likes: 940, comments: 41 },
    ],
  };
  return base[network].map((post, index) => ({
    id: uid("sp"),
    network,
    text: post.text,
    at: daysAgo(index * 3 + 1, 10 + index * 4),
    status: "publie",
    likes: post.likes,
    comments: post.comments,
    ...(post.media ? { media: post.media } : {}),
  }));
}

/** Logos des réseaux, en une couleur (noir ou blanc selon le thème). */
export function SocialLogo({ id, size = 24 }: { id: SocialId; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true, focusable: false } as const;
  switch (id) {
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} fill="currentColor">
          <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
  }
}
