import { memo, type CSSProperties } from "react";
import { isRed, rankName } from "../lib/format";
import type { Card } from "../types";

type PlayingCardProps = {
  card?: Card;
  faceDown?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  style?: CSSProperties;
};

export const PlayingCard = memo(function PlayingCard({ card, faceDown = false, size = "md", className = "", style }: PlayingCardProps) {
  if (!card || faceDown) {
    return <div className={`playing-card card-back ${size} ${className}`} style={style} aria-hidden="true"><span /></div>;
  }
  const rank = rankName(card.rank);
  return (
    <div className={`playing-card ${isRed(card.suit) ? "red" : "black"} ${size} ${className}`} style={style} role="img" aria-label={`${rank}${card.suit}`}>
      <span className="pc-corner pc-top" aria-hidden="true"><b>{rank}</b><i>{card.suit}</i></span>
      <span className="pc-pip" aria-hidden="true">{card.suit}</span>
      <span className="pc-corner pc-bottom" aria-hidden="true"><b>{rank}</b><i>{card.suit}</i></span>
    </div>
  );
});
