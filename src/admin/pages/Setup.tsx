import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";

import { AgentAssist } from "../AgentAssist.js";
import { useT } from "../locale.js";

type AssistLocationState = {
  seed?: string;
};

export function SetupPage() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = ((location.state as AssistLocationState | null)?.seed ?? "").trim();
  const seedRef = useRef(incoming);

  useEffect(() => {
    if (incoming) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [incoming, location.pathname, navigate]);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t("assist.eyebrow")}</p>
          <h1>{t("assist.pageTitle")}</h1>
          <p className="lede">{t("assist.pageLede")}</p>
        </div>
      </header>

      <AgentAssist seed={seedRef.current} />
    </section>
  );
}
