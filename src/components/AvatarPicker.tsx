import { memo } from "react";
import { usePreferences } from "../preferences";
import { AVATARS } from "../../convex/model/types";
import { play } from "../lib/sound";
import type { MessageKey } from "../i18n";
import type { Avatar as AvatarId } from "../types";
import { Avatar } from "./Avatar";

/** Grid of character portraits; the chosen one waves back. */
export const AvatarPicker = memo(function AvatarPicker({ value, onChange }: { value: AvatarId; onChange: (avatar: AvatarId) => void }) {
  const { t } = usePreferences();
  return (
    <fieldset className="avatar-picker">
      <legend className="field-label">{t("chooseCharacter")}</legend>
      <div className="avatar-options">
        {AVATARS.map((id) => {
          const label = t(`avatar_${id}` as MessageKey);
          return (
            <button
              key={id}
              type="button"
              className={`avatar-option ${value === id ? "selected" : ""}`}
              aria-pressed={value === id}
              aria-label={label}
              title={label}
              onClick={() => { onChange(id); play("select"); }}
            >
              <Avatar id={id} expression={value === id ? "happy" : "idle"} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
});
