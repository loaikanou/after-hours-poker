import { memo } from "react";
import { asset } from "../lib/paths";

export const Brand = memo(function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "compact" : ""}`}>
      <img className="brand-mark" src={asset("favicon.svg")} alt="" width={38} height={38} />
      <div className="brand-word">AFTER HOURS<span>CARD CLUB</span></div>
    </div>
  );
});
