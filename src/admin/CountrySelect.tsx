import { useEffect, useId, useMemo, useRef, useState } from "react";

import { countryName, sortedCountryCodes } from "./business-profile.js";
import { useLocale, useT } from "./locale.js";

type Props = {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Liste de pays compacte avec recherche, à la place d'un <select> natif
    que macOS affiche sur toute la hauteur de l'écran. */
export function CountrySelect({ value, onChange, required }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const countries = useMemo(
    () => sortedCountryCodes(locale).map((code) => ({ code, name: countryName(code, locale) })),
    [locale],
  );
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? countries.filter((c) => normalize(c.name).includes(q)) : countries;
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const selected = countries.findIndex((c) => c.code === value);
    setActive(selected >= 0 ? selected : 0);
    searchRef.current?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, countries, value]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, filtered]);

  function choose(code: string) {
    onChange(code);
    setOpen(false);
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
      event.preventDefault();
      setOpen(false);
    }
  }

  const selectedName = value ? countryName(value, locale) : "";

  return (
    <div className="country-select" ref={rootRef}>
      <button
        type="button"
        className={value ? "country-select-trigger" : "country-select-trigger is-empty"}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{selectedName || t("common.selectCountry")}</span>
      </button>
      {/* Champ caché pour garder la validation native « requis » du formulaire. */}
      <input
        className="country-select-required"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        onChange={() => undefined}
        required={required}
      />
      {open ? (
        <div className="country-select-panel">
          <input
            ref={searchRef}
            type="search"
            className="country-select-search"
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
          <ul className="country-select-list" id={listId} role="listbox" ref={listRef}>
            {filtered.length === 0 ? (
              <li className="country-select-empty">{t("common.noCountry")}</li>
            ) : (
              filtered.map((c, index) => (
                <li
                  key={c.code}
                  id={`${listId}-${c.code}`}
                  data-index={index}
                  role="option"
                  aria-selected={c.code === value}
                  className={[
                    index === active ? "is-active" : "",
                    c.code === value ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => choose(c.code)}
                >
                  {c.name}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
