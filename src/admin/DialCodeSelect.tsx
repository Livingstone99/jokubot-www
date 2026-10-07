import { useEffect, useId, useMemo, useRef, useState } from "react";

import { callingCode, countryName, sortedCountryCodes } from "./business-profile.js";
import { useLocale, useT } from "./locale.js";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Indicatif pays compact (« BO +591 ») avec une liste courte et une recherche,
    à la place du <select> natif qui s'affiche sur toute la hauteur de l'écran. */
export function DialCodeSelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const countries = useMemo(
    () =>
      sortedCountryCodes(locale).map((code) => ({
        code,
        name: countryName(code, locale),
        dial: callingCode(code) ?? "",
      })),
    [locale],
  );
  const filtered = useMemo(() => {
    const q = normalize(query.trim()).replace(/^\+/, "");
    if (!q) return countries;
    return countries.filter(
      (c) => normalize(c.name).includes(q) || c.dial.startsWith(q) || c.code.toLowerCase() === q,
    );
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const selected = countries.findIndex((c) => c.code === value);
    setActive(selected >= 0 ? selected : 0);
    searchRef.current?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, countries, value]);

  useEffect(() => {
    if (!open) return;
    // Défile uniquement dans la liste (scrollIntoView ferait aussi défiler la fenêtre).
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !item) return;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
  }, [active, open, filtered]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function choose(code: string) {
    onChange(code);
    close();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = filtered[active];
      if (pick) choose(pick.code);
    } else if (event.key === "Escape") {
      // Ne ferme que la liste, pas la fenêtre qui la contient.
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  const dial = callingCode(value);

  return (
    <div className="dial-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={value ? "dial-select-trigger" : "dial-select-trigger is-empty"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("common.country")} : ${value ? countryName(value, locale) : t("common.selectCountry")}`}
        title={value ? countryName(value, locale) : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {value ? (
          <>
            <span className="dial-select-code">{value}</span>
            <span>{dial ? `+${dial}` : ""}</span>
          </>
        ) : (
          <span>{t("common.country")}</span>
        )}
        <svg className="dial-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {/* Champ caché pour garder la validation native « requis ». */}
      <input
        className="dial-select-required"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={() => undefined}
        required={required}
      />
      {open ? (
        <div className="dial-select-panel">
          <input
            ref={searchRef}
            type="search"
            className="dial-select-search"
            placeholder={t("common.searchCountry")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].code}` : undefined}
          />
          <ul className="dial-select-list" id={listId} role="listbox" ref={listRef}>
            {filtered.length === 0 ? (
              <li className="dial-select-empty">{t("common.noCountry")}</li>
            ) : (
              filtered.map((c, index) => (
                <li
                  key={c.code}
                  id={`${listId}-${c.code}`}
                  data-index={index}
                  role="option"
                  aria-selected={c.code === value}
                  className={[index === active ? "is-active" : "", c.code === value ? "is-selected" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(c.code)}
                >
                  <span className="dial-select-name">{c.name}</span>
                  {c.dial ? <span className="dial-select-dial">+{c.dial}</span> : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
