import { useState } from "react";
import { usePreferences } from "../preferences";
import { promptInstall, usePwa } from "../lib/pwa";
import { InstallSheet } from "./InstallSheet";
import { asset } from "../lib/paths";

/** Top-bar install affordance. Native prompt where supported, instructions elsewhere; hidden once installed. */
export function InstallButton() {
  const { t } = usePreferences();
  const pwa = usePwa();
  const [sheetOpen, setSheetOpen] = useState(false);
  if (pwa.installed) return null;

  async function install() {
    if (pwa.canPrompt) await promptInstall();
    else setSheetOpen(true);
  }

  return (
    <>
      <button type="button" className="install-button" onClick={() => void install()}>
        <img src={asset("favicon.svg")} alt="" width={18} height={18} /> {t("installApp")}
      </button>
      {sheetOpen && <InstallSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
