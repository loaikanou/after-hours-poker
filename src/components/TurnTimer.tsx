import { memo, useEffect } from "react";
import { useTurnCountdown } from "../hooks/useTurnCountdown";
import { usePreferences } from "../preferences";
import { play } from "../lib/sound";

type TimerProps = { startedAt: number; durationMs: number; active: boolean };

const RING_SIZE = 56;
const RING_STROKE = 3;

/** Circular countdown drawn around the portrait of the player on the clock. */
export const TurnTimerRing = memo(function TurnTimerRing({ startedAt, durationMs, active }: TimerProps) {
  const { progress, urgent } = useTurnCountdown(startedAt, durationMs, active);
  if (!active) return null;
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = RING_SIZE / 2;
  return (
    <svg className={`timer-ring ${urgent ? "urgent" : ""}`} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true">
      <circle className="timer-track" cx={center} cy={center} r={radius} strokeWidth={RING_STROKE} />
      <circle
        className="timer-progress"
        cx={center}
        cy={center}
        r={radius}
        strokeWidth={RING_STROKE}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
});

/** Horizontal countdown under the felt. Ticks audibly in the last seconds of your own turn. */
export const TurnTimerBar = memo(function TurnTimerBar({ startedAt, durationMs, active, mine }: TimerProps & { mine: boolean }) {
  const { t } = usePreferences();
  const { progress, seconds, urgent } = useTurnCountdown(startedAt, durationMs, active);

  useEffect(() => {
    if (mine && active && seconds > 0 && seconds <= 5) play("tick");
  }, [mine, active, seconds]);

  return (
    <div className={`turn-timer ${urgent ? "urgent" : ""} ${mine ? "mine" : ""}`} role="timer" aria-label={t("turnTimerAria")}>
      <span className="turn-timer-label">{t("turnTimerLabel")}</span>
      <span className="turn-timer-track">
        <span className="turn-timer-fill" style={{ transform: `scaleX(${active ? progress : 0})` }} />
      </span>
      <span className="turn-timer-seconds">{active ? t("secondsShort", { seconds }) : "—"}</span>
      <span className="turn-timer-hint">{t("autoActHint")}</span>
    </div>
  );
});
