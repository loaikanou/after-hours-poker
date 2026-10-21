import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { errorMessage } from "./i18n";
import { usePreferences } from "./preferences";
import { cardKey, gameNameKeys } from "./lib/format";
import { useDocumentMeta } from "./hooks/useDocumentMeta";
import { play } from "./lib/sound";
import {
  playerKey, rememberAvatar, rememberPlayerName, rememberTableCode, savedAvatar, savedName, savedTableCode,
} from "./lib/session";
import type { ActionValues, Avatar, GameAction, GameMode, PokerAction } from "./types";
import { LobbyScreen } from "./screens/LobbyScreen";
import { InviteJoinScreen } from "./screens/InviteJoinScreen";
import { LoadingScreen, NotFoundScreen } from "./screens/StatusScreens";
import { ConnectionBanner } from "./components/PWAUpdates";

// The table is the heaviest screen; the lobby should paint without waiting for it.
const GameTable = lazy(() => import("./screens/GameTable").then((module) => ({ default: module.GameTable })));

const GAME_MODES: GameMode[] = ["poker", "tarneeb", "trix"];

/** Home-screen shortcuts open `/?new=tarneeb` etc. to preselect a game. */
function gameFromUrl(): GameMode {
  const requested = new URLSearchParams(location.search).get("new");
  return GAME_MODES.find((mode) => mode === requested) ?? "poker";
}

function codeFromUrl(): string {
  return new URLSearchParams(location.search).get("table")?.toUpperCase() ?? "";
}

/** Owns table state and routing; every screen below is presentational. */
export function App() {
  return <><ConnectionBanner /><Screens /></>;
}

function Screens() {
  const { locale, t } = usePreferences();
  const [gameMode, setGameMode] = useState<GameMode>(gameFromUrl);
  const [name, setName] = useState(savedName);
  const [avatar, setAvatar] = useState<Avatar>(savedAvatar);
  const [tableName, setTableName] = useState(() => t("tableNamePlaceholder"));
  const [joinCode, setJoinCode] = useState("");
  const [roomCode, setRoomCode] = useState(() => codeFromUrl() || savedTableCode);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const createTable = useMutation(api.tables.create);
  const joinTable = useMutation(api.tables.join);
  const leaveTable = useMutation(api.tables.leave);
  const startHand = useMutation(api.tables.start);
  const rebuy = useMutation(api.tables.rebuy);
  // Playing a card is the most frequent move in trick games, so show it instantly.
  const act = useMutation(api.tables.act).withOptimisticUpdate((store, args) => {
    if (args.action !== "play" || !args.card) return;
    const query = { code: args.code, playerKey: args.playerKey };
    const current = store.getQuery(api.tables.get, query);
    if (!current || current.game === "poker" || current.mySeat !== current.turnIndex) return;
    const seat = current.mySeat;
    const played = cardKey(args.card);
    const layout = current.game === "trix" && current.contract === "trix";
    store.setQuery(api.tables.get, query, {
      ...current,
      players: current.players.map((p, i) => (i === seat ? { ...p, cards: p.cards.filter((c) => cardKey(c) !== played), cardsRemaining: p.cardsRemaining - 1 } : p)),
      board: layout ? [...current.board, args.card] : current.board,
      trickCards: layout ? current.trickCards : [...current.trickCards, { playerIndex: seat, card: args.card }],
      turnIndex: (seat + 1) % current.players.length,
    });
  });

  const table = useQuery(api.tables.get, roomCode ? { code: roomCode, playerKey } : "skip");
  const seated = table ? table.mySeat >= 0 : false;
  const tableMeta = table ? { name: table.name, game: t(gameNameKeys[table.game]) } : null;
  // Table and invite screens are private: never let a shared link get indexed.
  useDocumentMeta(tableMeta
    ? { title: t(seated ? "metaTitleTable" : "metaTitleInvite", tableMeta), description: t("metaDescription"), noindex: true }
    : { title: t("metaTitleLobby"), description: t("metaDescription"), noindex: Boolean(roomCode) });

  useEffect(() => {
    const onPop = () => setRoomCode(codeFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  function cleanName(value: string) {
    const cleaned = value.trim().slice(0, 18);
    if (!cleaned) throw new Error("addName");
    rememberPlayerName(cleaned);
    rememberAvatar(avatar);
    return cleaned;
  }

  const run = useCallback(async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setNotice("");
    try { await operation(); }
    catch (caught) { setNotice(errorMessage(caught, t, locale)); play("error"); }
    finally { setBusy(false); }
  }, [t, locale]);

  function enterTable(code: string) {
    setRoomCode(code);
    rememberTableCode(code);
    history.pushState({}, "", `?table=${code}`);
  }

  const create = () => run(async () => {
    const code = await createTable({ name: tableName, playerName: cleanName(name), playerKey, game: gameMode, avatar });
    enterTable(code);
  });

  const join = (code: string) => run(async () => {
    const normalized = code.trim().toUpperCase();
    await joinTable({ code: normalized, playerName: cleanName(name), playerKey, avatar });
    enterTable(normalized);
  });

  function leave() {
    if (roomCode && seated) void leaveTable({ code: roomCode, playerKey }).catch(() => undefined);
    setRoomCode("");
    setNotice("");
    rememberTableCode("");
    history.pushState({}, "", location.pathname);
  }

  const onAction = useCallback(
    (action: PokerAction | GameAction, values: ActionValues = {}) => run(() => act({ code: roomCode, playerKey, action, ...values })),
    [run, act, roomCode],
  );

  const inviteUrl = `${location.origin}${location.pathname}?table=${roomCode}`;
  const inviteText = tableMeta ? t("shareInviteText", { ...tableMeta, code: roomCode }) : "";
  async function copyLink() {
    try { await navigator.clipboard.writeText(inviteUrl); setNotice(t("linkCopied")); }
    catch { setNotice(t("shareCode", { code: roomCode })); }
  }
  async function shareLink() {
    if (!navigator.share) return copyLink();
    try { await navigator.share({ title: table?.name ?? "After Hours", text: inviteText, url: inviteUrl }); }
    catch (caught) { if (caught instanceof Error && caught.name !== "AbortError") setNotice(t("shareFailed")); }
  }

  if (roomCode && table === undefined) return <LoadingScreen />;
  if (roomCode && table === null) return <NotFoundScreen onLeave={leave} />;
  if (roomCode && table && !seated) {
    return (
      <InviteJoinScreen
        table={table}
        name={name}
        avatar={avatar}
        error={notice}
        busy={busy}
        onNameChange={setName}
        onAvatarChange={setAvatar}
        onJoin={() => void join(roomCode)}
        onLeave={leave}
      />
    );
  }
  if (roomCode && table) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <GameTable
          table={table}
          error={notice}
          busy={busy}
          inviteUrl={inviteUrl}
          inviteText={inviteText}
          onLeave={leave}
          onStart={() => void run(() => startHand({ code: roomCode, playerKey }))}
          onRebuy={() => void run(() => rebuy({ code: roomCode, playerKey }))}
          onAction={(action, values) => void onAction(action, values)}
          onCopyLink={() => void copyLink()}
          onShareLink={() => void shareLink()}
        />
      </Suspense>
    );
  }
  return (
    <LobbyScreen
      gameMode={gameMode}
      name={name}
      avatar={avatar}
      tableName={tableName}
      joinCode={joinCode}
      error={notice}
      busy={busy}
      onGameModeChange={setGameMode}
      onNameChange={setName}
      onAvatarChange={setAvatar}
      onTableNameChange={setTableName}
      onJoinCodeChange={setJoinCode}
      onCreate={() => void create()}
      onJoin={() => void join(joinCode)}
    />
  );
}
