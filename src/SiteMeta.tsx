import { useEffect } from "react";

import { useLocale, useT } from "./locale.js";
import { localeTag } from "./i18n.js";

function upsertMeta(selector: string, attrs: Record<string, string>, content: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    for (const [name, value] of Object.entries(attrs)) {
      el.setAttribute(name, value);
    }
    document.head.append(el);
  }
  el.setAttribute("content", content);
}

export function SiteMeta() {
  const { locale } = useLocale();
  const t = useT();

  useEffect(() => {
    const title = t("meta.title");
    const description = t("meta.description");

    document.title = title;
    upsertMeta('meta[name="description"]', { name: "description" }, description);
    upsertMeta('meta[property="og:title"]', { property: "og:title" }, title);
    upsertMeta('meta[property="og:description"]', { property: "og:description" }, description);
    upsertMeta('meta[property="og:locale"]', { property: "og:locale" }, localeTag(locale));
    const canonical = `${window.location.origin}${import.meta.env.BASE_URL}`;
    upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
  }, [locale, t]);

  return null;
}
