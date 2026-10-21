import { memo, useEffect, useState, type CSSProperties } from "react";
import type { Flight } from "../hooks/useTableFx";

/** Chips that travel across the felt: bets into the middle, pots out to winners. */
export const ChipFlights = memo(function ChipFlights({ flights, onLand }: { flights: Flight[]; onLand: (id: number) => void }) {
  return (
    <>
      {flights.map((flight) => (
        <div
          key={flight.id}
          className="chip-flight"
          style={{
            left: `${flight.to.x}%`,
            top: `${flight.to.y}%`,
            "--from-x": `${flight.from.x - flight.to.x}cqw`,
            "--from-y": `${flight.from.y - flight.to.y}cqh`,
          } as CSSProperties}
          onAnimationEnd={(event) => { if (event.target === event.currentTarget) onLand(flight.id); }}
        >
          {Array.from({ length: flight.chips }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
        </div>
      ))}
    </>
  );
});

const CONFETTI_COLORS = ["#d2ab68", "#e9d3a0", "#c95450", "#4f9a72", "#f4f0e7", "#6c8fd1"];

/** A short, self-removing burst of confetti for big wins. */
export const Confetti = memo(function Confetti({ burst }: { burst: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!burst) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(id);
  }, [burst]);
  if (!visible) return null;
  return (
    <div className="confetti" aria-hidden="true" key={burst}>
      {Array.from({ length: 48 }, (_, i) => (
        <i
          key={i}
          style={{
            "--x": `${(i * 37) % 100}vw`,
            "--drift": `${((i * 53) % 40) - 20}vw`,
            "--spin": `${((i * 97) % 720) - 360}deg`,
            "--delay": `${(i % 12) * 60}ms`,
            "--dur": `${2200 + ((i * 131) % 1200)}ms`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          } as CSSProperties}
        />
      ))}
    </div>
  );
});
