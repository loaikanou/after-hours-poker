import { memo } from "react";
import { usePreferences } from "../preferences";
import { contractKeys, contractOrder, formatNumber, isRed } from "../lib/format";
import { TARNEEB_TARGET, TRIX_KINGDOMS } from "../../convex/model/types";
import type { TableSnapshot } from "../types";
import { Avatar } from "./Avatar";

/** Running score for the trick games: team totals for Tarneeb, standings and kingdom progress for Trix. */
export const Scoreboard = memo(function Scoreboard({ table }: { table: TableSnapshot }) {
  const { t, locale } = usePreferences();
  const n = (value: number) => formatNumber(value, locale);
  const players = table.players;

  if (table.game === "tarneeb") {
    const myTeam = table.mySeat >= 0 ? table.mySeat % 2 : 0;
    const teams = [myTeam, 1 - myTeam].map((team) => ({
      team,
      label: table.mySeat >= 0 ? t(team === myTeam ? "teamUs" : "teamThem") : t("teamN", { n: team + 1 }),
      score: players[team]?.score ?? 0,
      tricks: players.reduce((sum, p, i) => sum + (i % 2 === team ? p.tricksWon : 0), 0),
      members: players.filter((_, i) => i % 2 === team),
    }));
    const contractActive = table.bidder >= 0 && table.phase !== "bidding";
    return (
      <section className="scoreboard tarneeb">
        {teams.map((entry) => (
          <div key={entry.team} className={`team-score team-${entry.team} ${entry.team === myTeam && table.mySeat >= 0 ? "mine" : ""}`}>
            <div className="team-faces">{entry.members.map((p) => <Avatar key={p.name} id={p.avatar} />)}</div>
            <div className="team-text">
              <span>{entry.label}</span>
              <strong>{n(entry.score)}</strong>
            </div>
            {contractActive && <span className="team-tricks">{t("tricksCount", { count: n(entry.tricks) })}</span>}
            <span className="team-bar" style={{ ["--progress" as string]: `${Math.max(0, Math.min(100, (entry.score / TARNEEB_TARGET) * 100))}%` }} />
          </div>
        ))}
        <div className="score-meta">
          <span>{t("targetScore", { target: n(TARNEEB_TARGET) })}</span>
          {contractActive && (
            <span>
              {players[table.bidder]?.name} · {t("bidLabel", { amount: n(table.highBid) })}
              {table.trump && <b className={isRed(table.trump) ? "red" : ""}> {table.trump}</b>}
            </span>
          )}
        </div>
      </section>
    );
  }

  const leader = Math.max(...players.map((p) => p.score));
  return (
    <section className="scoreboard trix">
      <div className="trix-standings">
        {players.map((p, i) => (
          <div key={p.name + i} className={`standing ${p.isYou ? "mine" : ""} ${table.phase === "showdown" && p.score === leader ? "leader" : ""}`}>
            <Avatar id={p.avatar} />
            <span>{p.name}</span>
            <strong className={p.score < 0 ? "negative" : ""}>{n(p.score)}</strong>
            {i === table.trixPicker && table.phase !== "showdown" && <em aria-label={t("kingdomOf", { name: p.name })}>♛</em>}
          </div>
        ))}
      </div>
      <div className="score-meta">
        <span className="kingdom-dots" aria-label={t("kingdomProgress", { done: n(table.kingdomsCompleted), total: n(TRIX_KINGDOMS) })}>
          {Array.from({ length: TRIX_KINGDOMS }, (_, i) => <i key={i} className={i < table.kingdomsCompleted ? "done" : i === table.kingdomsCompleted ? "current" : ""} />)}
          {t("kingdomProgress", { done: n(Math.min(table.kingdomsCompleted + 1, TRIX_KINGDOMS)), total: n(TRIX_KINGDOMS) })}
        </span>
        <span className="contract-chips">
          {contractOrder.map((contract) => (
            <i key={contract} className={`${table.trixContractsPlayed.includes(contract) ? "done" : ""} ${table.contract === contract ? "current" : ""}`}>
              {t(contractKeys[contract])}
            </i>
          ))}
        </span>
      </div>
    </section>
  );
});
