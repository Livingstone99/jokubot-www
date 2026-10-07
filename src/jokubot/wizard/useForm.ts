// Petit gestionnaire de formulaire pour les écrans hors parcours.

import { useState } from "react";

import { ApiError } from "../api.js";
import { fieldId, validateField, type FieldDef, type FieldValue, type Values } from "./fields.js";

type Leaf = Exclude<FieldDef, { kind: "group" }>;

export function useForm(initial: Values) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (name: string, value: FieldValue) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors(({ [name]: _gone, ...rest }) => rest);
  };

  const focus = (name: string) => requestAnimationFrame(() => document.getElementById(fieldId(name))?.focus());

  /** Valide les champs visibles ; place le focus sur la première erreur. */
  const check = (fields: Leaf[]): boolean => {
    const found: Record<string, string> = {};
    for (const field of fields) {
      if (field.when && !field.when(values)) continue;
      const message = validateField(field, values);
      if (message) found[field.name] = message;
    }
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) focus(first);
    return !first;
  };

  /** Affiche une erreur d'API sous le bon champ, sinon la renvoie. */
  const fail = (error: unknown, fallback: string): string | null => {
    const message = error instanceof Error ? error.message : "Une erreur est survenue. Réessayez dans un instant.";
    const field = error instanceof ApiError && error.field ? error.field : fallback;
    if (!field) return message;
    setErrors({ [field]: message });
    focus(field);
    return null;
  };

  const bind = (field: Leaf) => ({
    field,
    value: values[field.name],
    error: errors[field.name],
    onChange: (value: FieldValue) => set(field.name, value),
  });

  return { values, setValues, set, check, fail, bind, setErrors };
}
