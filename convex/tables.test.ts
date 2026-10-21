/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const keys = ["key-alpha-0001", "key-bravo-0002", "key-charl-0003", "key-delta-0004"];

async function seatedTable(game: "poker" | "tarneeb" | "trix", seats: number) {
  const t = convexTest(schema, modules);
  const code = await t.mutation(api.tables.create, { name: "Test", playerName: "Ana", playerKey: keys[0], game, avatar: "owl" });
  for (let i = 1; i < seats; i++) await t.mutation(api.tables.join, { code, playerName: `P${i}`, playerKey: keys[i] });
  return { t, code };
}

describe("tables", () => {
  test("hole cards are private until a contested showdown", async () => {
    const { t, code } = await seatedTable("poker", 2);
    await t.mutation(api.tables.start, { code, playerKey: keys[0] });
    const view = await t.query(api.tables.get, { code, playerKey: keys[0] });
    expect(view?.players[0].cards).toHaveLength(2);
    expect(view?.players[1].cards).toHaveLength(0);
    expect(view?.players[0].avatar).toBe("owl");
  });

  test("only the host can deal and errors carry a code", async () => {
    const { t, code } = await seatedTable("poker", 2);
    await expect(t.mutation(api.tables.start, { code, playerKey: keys[1] })).rejects.toMatchObject({ data: { code: "hostOnly" } });
  });

  test("trick games need exactly four players", async () => {
    const { t, code } = await seatedTable("tarneeb", 3);
    await expect(t.mutation(api.tables.start, { code, playerKey: keys[0] })).rejects.toMatchObject({ data: { code: "needFourPlayers" } });
  });

  test("a timed-out turn is auto-played by the server", async () => {
    vi.useFakeTimers();
    const { t, code } = await seatedTable("tarneeb", 4);
    await t.mutation(api.tables.start, { code, playerKey: keys[0] });
    const before = await t.query(api.tables.get, { code, playerKey: keys[0] });
    vi.advanceTimersByTime(before!.turnDurationMs + 100);
    await t.finishInProgressScheduledFunctions();
    const after = await t.query(api.tables.get, { code, playerKey: keys[0] });
    expect(after!.turnIndex).not.toBe(before!.turnIndex);
    expect(after!.event.kind).toBe("bid");
    vi.useRealTimers();
  });

  test("leaving in the lobby frees the seat and hands over hosting", async () => {
    const { t, code } = await seatedTable("poker", 2);
    await t.mutation(api.tables.leave, { code, playerKey: keys[0] });
    const view = await t.query(api.tables.get, { code, playerKey: keys[1] });
    expect(view?.players).toHaveLength(1);
    expect(view?.isHost).toBe(true);
  });

  test("the last player leaving deletes the table", async () => {
    const { t, code } = await seatedTable("poker", 1);
    await t.mutation(api.tables.leave, { code, playerKey: keys[0] });
    expect(await t.query(api.tables.get, { code, playerKey: keys[0] })).toBeNull();
  });
});
