import { useEffect, useState, type CSSProperties } from "react";
import { usePreferences } from "../preferences";
import { formatNumber } from "../lib/format";
import type { ActionValues, PokerAction, TableSnapshot, VisiblePlayer } from "../types";

type PokerControlsProps = {
  table: TableSnapshot;
  me: VisiblePlayer;
  busy: boolean;
  onAction: (action: PokerAction, values?: ActionValues) => void;
};

/** Fold / check-call / raise with a sizing slider, pot presets, and keyboard shortcuts. */
export function PokerControls({ table, me, busy, onAction }: PokerControlsProps) {
  const { t, locale } = usePreferences();
  const due = Math.max(0, table.currentBet - me.bet);
  const maxTo = me.bet + me.chips;
  const minTo = Math.min(table.currentBet + table.lastRaise, maxTo);
  const canRaise = maxTo > table.currentBet && me.chips > due;
  const [target, setTarget] = useState(minTo);

  // Reset the slider at the start of every turn.
  useEffect(() => setTarget(minTo), [minTo, table.turnStartedAt]);

  const potAfterCall = table.pot + due;
  const snap = (value: number) => Math.max(minTo, Math.min(maxTo, Math.round(value)));
  const presets = [
    { label: t("betMin"), value: minTo },
    { label: t("betHalfPot"), value: snap(table.currentBet + potAfterCall / 2) },
    { label: t("betPot"), value: snap(table.currentBet + potAfterCall) },
    { label: t("betMax"), value: maxTo },
  ];
  const amount = formatNumber(target, locale);
  const raiseLabel = target >= maxTo ? t("allInAmount", { amount }) : table.currentBet === 0 ? t("betTo", { amount }) : t("raiseTo", { amount });

  const fold = () => onAction("fold");
  const checkOrCall = () => onAction(due === 0 ? "check" : "call");
  const raise = () => (target >= maxTo ? onAction("allIn") : onAction("raise", { amount: target }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (busy || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable]")) return;
      const key = event.key.toLowerCase();
      if (key === "f") fold();
      else if (key === "c" || key === "k") checkOrCall();
      else if (key === "r" && canRaise) raise();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="poker-controls">
      {canRaise && (
        <div className="raise-panel">
          <div className="preset-row">
            {presets.map((preset) => (
              <button key={preset.label} type="button" className={`chip-button ${target === preset.value ? "selected" : ""}`} disabled={busy} onClick={() => setTarget(preset.value)}>
                {preset.label}
              </button>
            ))}
          </div>
          <input
            type="range"
            className="raise-slider"
            aria-label={t("raiseAmount")}
            min={minTo}
            max={maxTo}
            step={1}
            value={target}
            disabled={busy || minTo >= maxTo}
            onChange={(event) => setTarget(Number(event.target.value))}
            style={{ "--fill": `${maxTo > minTo ? ((target - minTo) / (maxTo - minTo)) * 100 : 100}%` } as CSSProperties}
          />
        </div>
      )}
      <div className="action-buttons">
        <button type="button" className="btn btn-outline danger" disabled={busy} onClick={fold}>{t("fold")}<kbd>F</kbd></button>
        <button type="button" className="btn btn-outline" disabled={busy} onClick={checkOrCall}>
          {due === 0 ? t("check") : me.chips <= due ? t("allInAmount", { amount: formatNumber(me.chips, locale) }) : t("call", { amount: formatNumber(due, locale) })}
          <kbd>C</kbd>
        </button>
        {canRaise && <button type="button" className="btn btn-gold" disabled={busy} onClick={raise}>{raiseLabel}<kbd>R</kbd></button>}
      </div>
    </div>
  );
}
