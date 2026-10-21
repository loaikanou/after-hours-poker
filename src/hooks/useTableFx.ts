import { useCallback, useEffect, useRef, useState } from "react";
import { buzz, play } from "../lib/sound";
import { towardSeat } from "../lib/format";
import type { SeatPoint, TableSnapshot } from "../types";

export type Flight = { id: number; from: SeatPoint; to: SeatPoint; chips: number };

/** Where chips land in the middle of the felt. */
export const POT_POINT: SeatPoint = { x: 50, y: 36 };
/** How far from the centre toward a seat its bet stack sits. */
export const BET_REACH = 0.64;

let flightId = 0;

/**
 * Compares each snapshot with the previous one and turns the difference into
 * sounds, haptics, flying chips and celebrations. The server only reports
 * *what* happened (`event`); everything here is presentation.
 */
export function useTableFx(table: TableSnapshot, seats: SeatPoint[]) {
  const previous = useRef<TableSnapshot | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [celebration, setCelebration] = useState(0);

  useEffect(() => {
    const prev = previous.current;
    previous.current = table;
    if (!prev || prev._id !== table._id) return;

    const me = table.mySeat;
    const event = table.event;
    const fresh = event.at !== prev.event.at || event.kind !== prev.event.kind;
    const launch = (from: SeatPoint | undefined, to: SeatPoint | undefined, chips: number) => {
      if (from && to) setFlights((list) => [...list, { id: ++flightId, from, to, chips }]);
    };
    const myTeam = me >= 0 ? me % 2 : -1;
    const iWon = table.winners.some((w) => w.seat === me);

    if (fresh) {
      const seat = event.seat ?? -1;
      switch (event.kind) {
        case "handStarted":
        case "biddingStarted":
          play("deal");
          break;
        case "contractStarted":
          play("deal");
          break;
        case "fold":
          play("fold");
          break;
        case "check":
          play("check");
          break;
        case "call":
        case "raise":
        case "allIn":
          play(event.kind === "call" ? "chip" : "chips");
          launch(seats[seat], seats[seat] && towardSeat(seats[seat], BET_REACH), event.kind === "allIn" ? 5 : 3);
          break;
        case "takesPot":
        case "winsShowdown":
        case "splitPot":
          for (const winner of table.winners) launch(POT_POINT, seats[winner.seat], 6);
          play(iWon ? "win" : "chips", 250);
          if (iWon && event.kind !== "takesPot") setCelebration(event.at);
          break;
        case "cardPlayed":
          play("card");
          break;
        case "trickWon":
          play("card");
          play("sweep", 850);
          break;
        case "bid":
        case "pass":
        case "bidWon":
        case "trumpChosen":
        case "choosingContract":
          play("select");
          break;
        case "joined":
          play("join");
          break;
        case "left":
          play("fold");
          break;
        case "rebuy":
          play("chips");
          break;
        case "tarneebHand": {
          const biddersAreUs = event.team !== undefined && event.team - 1 === myTeam;
          play(biddersAreUs === Boolean(event.made) ? "win" : "lose", 300);
          break;
        }
        case "tarneebMatch":
          if (event.team !== undefined && event.team - 1 === myTeam) { play("win", 300); setCelebration(event.at); }
          else play("lose", 300);
          break;
        case "tournamentDone":
          if (seat === me) { play("win", 300); setCelebration(event.at); }
          else play("lose", 300);
          break;
        case "contractComplete":
        case "trixFinished":
          play("sweep", 300);
          break;
      }
    }

    // New community cards flip in one after another.
    const dealt = table.board.length - prev.board.length;
    if (table.game === "poker" && dealt > 0 && event.kind !== "handStarted") {
      for (let i = 0; i < dealt; i++) play("flip", 300 + i * 140);
    }

    const myTurnNow = me >= 0 && table.turnIndex === me && table.phase !== "showdown" && table.phase !== "waiting";
    const myTurnBefore = prev.turnIndex === me && prev.phase === table.phase && !fresh;
    if (myTurnNow && !myTurnBefore) {
      play("turn", 180);
      buzz([18, 40, 18]);
    }
  }, [table, seats]);

  const land = useCallback((id: number) => setFlights((list) => list.filter((flight) => flight.id !== id)), []);
  return { flights, land, celebration };
}
