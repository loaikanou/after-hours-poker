import { memo, useId, type ReactNode } from "react";
import type { Avatar as AvatarId } from "../types";

export type Expression = "idle" | "thinking" | "happy" | "sad" | "shocked" | "away";

const INK = "#2a1d17";

type Character = {
  /** Backdrop colour of the portrait disc. */
  bg: string;
  /** Eye height and mouth height in the 64×64 viewBox. */
  eyeY: number;
  mouthY: number;
  eyeColor?: string;
  /** Owls have a beak instead of a mouth. */
  mouth?: boolean;
  /** Everything drawn under the eyes and mouth: ears, head, muzzle, markings. */
  art: ReactNode;
};

const CHARACTERS: Record<AvatarId, Character> = {
  fox: {
    bg: "#2f5a49", eyeY: 31, mouthY: 45,
    art: <>
      <path d="M11 7 27 20 13 29Z M53 7 37 20 51 29Z" fill="#e07a3a" />
      <path d="M14 12 23 20 15 25Z M50 12 41 20 49 25Z" fill="#4a2a1c" />
      <path d="M32 55C18 55 10 43 10 31c0-8 8-14 22-14s22 6 22 14c0 12-8 24-22 24Z" fill="#ea8a43" />
      <path d="M32 55c-8 0-18-10-20-21 6 4 14 6 20 12 6-6 14-8 20-12-2 11-12 21-20 21Z" fill="#fff4e6" />
      <ellipse cx="32" cy="41" rx="3" ry="2.2" fill={INK} />
    </>,
  },
  owl: {
    bg: "#34405a", eyeY: 31, mouthY: 45, mouth: false,
    art: <>
      <path d="M13 9 23 20 12 23Z M51 9 41 20 52 23Z" fill="#6d4a2f" />
      <circle cx="32" cy="35" r="22" fill="#8b6240" />
      <path d="M22 50q4 3 5 0M30 52q2 3 4 0M37 50q1 3 5 0" stroke="#6d4a2f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="31" r="9" fill="#f6ead2" stroke="#c9a36a" strokeWidth="1.5" />
      <circle cx="40" cy="31" r="9" fill="#f6ead2" stroke="#c9a36a" strokeWidth="1.5" />
      <path d="M29 38h6l-3 6Z" fill="#f0a830" />
    </>,
  },
  bear: {
    bg: "#5a3f5e", eyeY: 31, mouthY: 45,
    art: <>
      <circle cx="16" cy="16" r="8" fill="#8a5a3b" /><circle cx="48" cy="16" r="8" fill="#8a5a3b" />
      <circle cx="16" cy="16" r="4" fill="#5c3a26" /><circle cx="48" cy="16" r="4" fill="#5c3a26" />
      <circle cx="32" cy="34" r="21" fill="#9b6845" />
      <ellipse cx="32" cy="42" rx="10" ry="8" fill="#e2c29b" />
      <ellipse cx="32" cy="39" rx="3.6" ry="2.6" fill={INK} />
    </>,
  },
  cat: {
    bg: "#7a4b3a", eyeY: 32, mouthY: 44,
    art: <>
      <path d="M11 9 26 18 13 31Z M53 9 38 18 51 31Z" fill="#8e8e9a" />
      <path d="M15 15 23 19 16 26Z M49 15 41 19 48 26Z" fill="#f2a7b5" />
      <ellipse cx="32" cy="35" rx="21" ry="19" fill="#a7a7b4" />
      <path d="M32 17v6M27 18l1 5M37 18l-1 5" stroke="#7c7c88" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 39h4l-2 2.5Z" fill="#e8798f" />
      <path d="M22 41 10 39M22 44 10 46M42 41l12-2M42 44l12 2" stroke="#f4f2f6" strokeWidth="1" strokeLinecap="round" />
    </>,
  },
  panda: {
    bg: "#3f6b4f", eyeY: 32, mouthY: 44, eyeColor: "#f7f5f0",
    art: <>
      <circle cx="15" cy="15" r="8" fill="#222" /><circle cx="49" cy="15" r="8" fill="#222" />
      <circle cx="32" cy="34" r="21" fill="#f7f5f0" />
      <ellipse cx="24" cy="32" rx="6" ry="7.5" fill="#222" transform="rotate(-20 24 32)" />
      <ellipse cx="40" cy="32" rx="6" ry="7.5" fill="#222" transform="rotate(20 40 32)" />
      <ellipse cx="32" cy="40" rx="3" ry="2" fill="#222" />
    </>,
  },
  wolf: {
    bg: "#6b3b3b", eyeY: 31, mouthY: 45,
    art: <>
      <path d="M12 3 27 18 11 27Z M52 3 37 18 53 27Z" fill="#5f6b7a" />
      <path d="M15 9 23 18 14 23Z M49 9 41 18 50 23Z" fill="#39414c" />
      <path d="M32 56C18 56 10 43 10 31c0-8 8-14 22-14s22 6 22 14c0 12-8 25-22 25Z" fill="#7a8696" />
      <path d="M32 56c-7 0-14-8-16-18 5 3 11 4 16 9 5-5 11-6 16-9-2 10-9 18-16 18Z" fill="#dde2e8" />
      <ellipse cx="32" cy="41" rx="3.2" ry="2.4" fill="#1f242a" />
    </>,
  },
  rabbit: {
    bg: "#3a5470", eyeY: 35, mouthY: 46,
    art: <>
      <ellipse cx="23" cy="13" rx="5" ry="13" fill="#efe4d6" /><ellipse cx="41" cy="13" rx="5" ry="13" fill="#efe4d6" />
      <ellipse cx="23" cy="14" rx="2.4" ry="9" fill="#f2b6c0" /><ellipse cx="41" cy="14" rx="2.4" ry="9" fill="#f2b6c0" />
      <circle cx="32" cy="38" r="19" fill="#f6eee3" />
      <circle cx="20" cy="42" r="3" fill="#f5c1c8" opacity=".75" /><circle cx="44" cy="42" r="3" fill="#f5c1c8" opacity=".75" />
      <path d="M30 41h4l-2 2.4Z" fill="#e8798f" />
      <rect x="30" y="49" width="4" height="3.4" rx=".8" fill="#fff" stroke="#d9cbb8" strokeWidth=".8" />
    </>,
  },
  tiger: {
    bg: "#24524f", eyeY: 30, mouthY: 46,
    art: <>
      <circle cx="15" cy="16" r="7" fill="#e98a2e" /><circle cx="49" cy="16" r="7" fill="#e98a2e" />
      <circle cx="15" cy="16" r="3.5" fill="#fff1dc" /><circle cx="49" cy="16" r="3.5" fill="#fff1dc" />
      <circle cx="32" cy="34" r="21" fill="#ef9535" />
      <path d="M32 14v8M26 15l2 6M38 15l-2 6M11 31l7 2M11 37l7-1M53 31l-7 2M53 37l-7-1" stroke="#3a2219" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="27.5" cy="43" rx="6" ry="5" fill="#fff3e4" /><ellipse cx="36.5" cy="43" rx="6" ry="5" fill="#fff3e4" />
      <path d="M29 38.5h6l-3 3Z" fill="#3a2219" />
    </>,
  },
};

function Face({ character, expression }: { character: Character; expression: Expression }) {
  const ey = character.eyeY;
  const my = character.mouthY;
  const ink = character.eyeColor ?? INK;
  const owl = character.mouth === false;
  const pupil = owl ? 3.4 : 2.6;
  const line = { stroke: ink, strokeWidth: 2, strokeLinecap: "round" as const, fill: "none" };
  const mouthLine = { ...line, stroke: INK, strokeWidth: 1.7 };

  switch (expression) {
    case "happy":
      return <g className="face">
        <path d={`M21 ${ey + 1}q3-4.5 6 0M37 ${ey + 1}q3-4.5 6 0`} {...line} />
        {!owl && <><path d={`M27 ${my}q5 7.5 10 0Z`} fill={INK} /><ellipse cx="32" cy={my + 3.4} rx="2.6" ry="1.4" fill="#d0606a" /></>}
      </g>;
    case "sad":
      return <g className="face">
        <circle cx="24" cy={ey + 1} r={pupil - 0.4} fill={ink} /><circle cx="40" cy={ey + 1} r={pupil - 0.4} fill={ink} />
        <path d={`M19 ${ey - 3.5}l7-2.2M45 ${ey - 3.5}l-7-2.2`} {...line} strokeWidth={1.6} stroke={owl ? INK : ink} />
        {!owl && <path d={`M28 ${my + 2}q4-3.5 8 0`} {...mouthLine} />}
      </g>;
    case "shocked":
      return <g className="face">
        <circle cx="24" cy={ey} r={pupil + 0.6} fill={ink} /><circle cx="40" cy={ey} r={pupil + 0.6} fill={ink} />
        <circle cx="25" cy={ey - 1} r="0.9" fill="#fff" /><circle cx="41" cy={ey - 1} r="0.9" fill="#fff" />
        {!owl && <ellipse cx="32" cy={my + 1.5} rx="2.4" ry="3" fill={INK} />}
      </g>;
    case "away":
      return <g className="face">
        <path d={`M21 ${ey}h6M37 ${ey}h6`} {...line} />
        {!owl && <circle cx="32" cy={my + 1} r="1.4" {...mouthLine} />}
        <text x="47" y="14" className="zzz" fontSize="9" fontWeight="700" fill="#fff">z</text>
      </g>;
    case "thinking":
      return <g className="face">
        <circle cx="25.2" cy={ey - 1} r={pupil - 0.2} fill={ink} /><circle cx="41.2" cy={ey - 1} r={pupil - 0.2} fill={ink} />
        <path d={`M37 ${ey - 6.5}l6-1.6`} {...line} strokeWidth={1.6} stroke={owl ? INK : ink} />
        {!owl && <path d={`M29 ${my + 1}l6-1`} {...mouthLine} />}
      </g>;
    default:
      return <g className="face">
        <g className="eyes"><circle cx="24" cy={ey} r={pupil} fill={ink} /><circle cx="40" cy={ey} r={pupil} fill={ink} /></g>
        {!owl && <path d={`M28 ${my}q4 3.2 8 0`} {...mouthLine} />}
      </g>;
  }
}

type AvatarProps = { id: AvatarId | (string & {}); expression?: Expression; label?: string; className?: string };

/** A character portrait whose face reacts to what is happening at the table. */
export const Avatar = memo(function Avatar({ id, expression = "idle", label, className = "" }: AvatarProps) {
  const character = CHARACTERS[id as AvatarId] ?? CHARACTERS.fox;
  const clip = useId();
  return (
    <svg
      className={`avatar-art ${expression} ${className}`}
      viewBox="0 0 64 64"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <clipPath id={clip}><circle cx="32" cy="32" r="32" /></clipPath>
      <circle cx="32" cy="32" r="32" fill={character.bg} />
      <g className="head" clipPath={`url(#${clip})`}>{character.art}<Face character={character} expression={expression} /></g>
    </svg>
  );
});
