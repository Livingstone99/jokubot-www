import { useEffect, useRef, useState } from "react";

import {
  callingCode,
  composeWhatsAppNumber,
  countryName,
  nationalDigits,
  parseWhatsAppNumber,
  sortedCountryCodes,
} from "./business-profile.js";
import { useLocale, useT } from "./locale.js";

export function WhatsAppNumberField({
  value,
  preferredCountry,
  onChange,
  hint,
  label,
  required = false,
}: {
  value: string;
  preferredCountry?: string | null;
  onChange: (e164: string) => void;
  hint?: string;
  label?: string;
  required?: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const parsed = parseWhatsAppNumber(value, preferredCountry);
  const [country, setCountry] = useState(parsed.country);
  const [national, setNational] = useState(parsed.national);
  const fieldLabel = label ?? t("phone.label");
  const fieldHint = hint === undefined ? t("phone.leadingZeroHint") : hint;
  const countryRef = useRef(country);
  const nationalRef = useRef(national);
  countryRef.current = country;
  nationalRef.current = national;

  useEffect(() => {
    if (!value.replace(/\D/g, "")) {
      return;
    }
    if (composeWhatsAppNumber(countryRef.current, nationalRef.current) === value) {
      return;
    }
    const next = parseWhatsAppNumber(value, countryRef.current || preferredCountry);
    setCountry(next.country);
    setNational(next.national);
  }, [preferredCountry, value]);

  function emit(nextCountry: string, nextNational: string) {
    onChange(composeWhatsAppNumber(nextCountry, nextNational));
  }

  const dial = callingCode(country);

  return (
    <div className="phone-field">
      <p className="phone-field-label">{fieldLabel}</p>
      <div className="row phone-row">
        <label>
          {t("common.country")}
          <select
            value={country}
            required={required}
            onChange={(event) => {
              const next = event.target.value;
              setCountry(next);
              emit(next, national);
            }}
          >
            <option value="" disabled>
              {t("common.selectCountry")}
            </option>
            {sortedCountryCodes(locale).map((code) => {
              const prefix = callingCode(code);
              return (
                <option key={code} value={code}>
                  {countryName(code, locale)}
                  {prefix ? ` (+${prefix})` : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          {t("phone.number")}
          <input
            value={national}
            onChange={(event) => {
              const next = nationalDigits(event.target.value, country);
              setNational(next);
              emit(country, next);
            }}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={dial === "1" ? "415 555 0123" : t("phone.localPlaceholder")}
            required={required}
          />
        </label>
      </div>
      {fieldHint ? <p className="hint">{fieldHint}</p> : null}
    </div>
  );
}
