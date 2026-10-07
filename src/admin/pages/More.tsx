import { Link } from "react-router-dom";

import { IconChevronRight } from "../jk/icons.js";
import { PageTitle } from "../jk/ui.js";
import { MAIN_NAV, TOOLS_NAV } from "../layout/AppShell.js";
import { useT } from "../locale.js";

/** Page « Plus » du téléphone : tout ce qui n'est pas dans la barre du bas. */
export function MorePage() {
  const t = useT();
  const main = MAIN_NAV.filter((item) => ["/channels", "/activity", "/usage", "/settings"].includes(item.to));
  const groups = [
    { title: t("jk.nav.more"), items: main },
    { title: t("jk.nav.tools"), items: TOOLS_NAV },
  ];
  return (
    <div className="jk-page">
      <PageTitle title={t("jk.nav.more")} />
      {groups.map((group) => (
        <section key={group.title} className="jk-card jk-more">
          <h2 className="jk-day">{group.title}</h2>
          <ul className="jk-list">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link className="jk-row" to={item.to}>
                    <span className="jk-stat-icon">
                      <Icon size={18} />
                    </span>
                    <span className="jk-row-main">
                      <strong>{t(item.label)}</strong>
                    </span>
                    <IconChevronRight size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
