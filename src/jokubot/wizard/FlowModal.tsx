// Un parcours affiché dans une fenêtre au-dessus de la page en cours.

import { useEffect, useRef } from "react";

import { t } from "../prefs.js";
import { Wizard, type FlowDef } from "./Wizard.js";

export function FlowModal({ flow, onClose }: { flow: FlowDef; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!el.open) el.showModal();
    // On place le curseur dans le premier champ, prêt à écrire.
    requestAnimationFrame(() => el.querySelector<HTMLElement>('.wz-form [id^="f-"]')?.focus());
    const previousTitle = document.title;
    document.title = `${t(flow.title)} · JokuBot`;
    return () => {
      if (el.open) el.close();
      document.title = previousTitle;
    };
  }, [flow]);

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="wzm-title"
      onCancel={(event) => {
        // Échap ferme la fenêtre en revenant à la page d'origine.
        event.preventDefault();
        onClose();
      }}
    >
      <Wizard flow={flow} variant="modal" onClose={onClose} />
    </dialog>
  );
}
