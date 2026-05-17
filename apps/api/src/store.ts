import { customAlphabet } from "nanoid";
import { Prisma } from "@prisma/client";
import type { GamePhase as PrismaPhase } from "@prisma/client";
import type { GamePhase, RoundResult, SessionState, Store, StorePlan } from "@minha-loja/shared-types";
import { DEFAULT_PLAN } from "@minha-loja/shared-types";
import {
  defaultCategoriesPlan,
  finalizeGame,
  simulateRound,
} from "@minha-loja/game-engine";
import { prisma } from "./prisma";

const pinGen = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);
const idGen = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

const PHASE_ORDER: GamePhase[] = [
  "LOBBY",
  "CONFIG_1",
  "ROUND_1",
  "RESULTS_1",
  "CONFIG_2",
  "ROUND_2",
  "ROUND_3",
  "FINAL",
];

function enrichPlan(plan: StorePlan): StorePlan {
  const base = { ...DEFAULT_PLAN, ...plan };
  if (!base.categories?.length) {
    base.categories = defaultCategoriesPlan();
  }
  return base;
}

function parsePlan(json: Prisma.JsonValue | null): StorePlan | null {
  if (!json || typeof json !== "object") return null;
  return json as StorePlan;
}

function toJson(plan: StorePlan): Prisma.InputJsonValue {
  return plan as unknown as Prisma.InputJsonValue;
}

type SessionWithRelations = Prisma.SessionGetPayload<{
  include: { stores: true; roundResults: true; finalRankings: true };
}>;

function mapStore(row: SessionWithRelations["stores"][number]): Store {
  return {
    id: row.id,
    companyName: row.companyName,
    playerName: row.playerName,
    planDraft: parsePlan(row.planDraft),
    planSubmitted: parsePlan(row.planSubmitted),
    connected: row.connected,
  };
}

function mapSession(row: SessionWithRelations): SessionState {
  return {
    id: row.id,
    pin: row.pin,
    facilitatorToken: row.facilitatorToken,
    phase: row.phase as GamePhase,
    currentRound: row.currentRound,
    stores: row.stores.map(mapStore),
    roundResults: row.roundResults
      .sort((a, b) => a.round - b.round)
      .map((r) => ({
        round: r.round,
        stores: r.results as RoundResult["stores"],
      })),
    finalRanking: row.finalRankings
      .sort((a, b) => a.position - b.position)
      .map((f) => ({
        storeId: f.storeId,
        companyName: f.companyName,
        ebitdaPercent: f.ebitdaPercent,
      })),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadSession(sessionId: string): Promise<SessionState | null> {
  const row = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      stores: { orderBy: { createdAt: "asc" } },
      roundResults: true,
      finalRankings: true,
    },
  });
  return row ? mapSession(row) : null;
}

export async function createSession(publicBaseUrl: string): Promise<{
  session: SessionState;
  facilitatorUrl: string;
}> {
  const id = idGen();
  const pin = pinGen();
  const facilitatorToken = idGen();

  const row = await prisma.session.create({
    data: {
      id,
      pin,
      facilitatorToken,
      phase: "LOBBY",
      currentRound: 0,
    },
    include: { stores: true, roundResults: true, finalRankings: true },
  });

  const session = mapSession(row);
  const facilitatorUrl = `${publicBaseUrl}/facilitador?session=${id}&token=${facilitatorToken}`;
  return { session, facilitatorUrl };
}

export async function getSessionByPin(pin: string): Promise<SessionState | null> {
  const row = await prisma.session.findUnique({
    where: { pin: pin.toUpperCase() },
    include: {
      stores: { orderBy: { createdAt: "asc" } },
      roundResults: true,
      finalRankings: true,
    },
  });
  return row ? mapSession(row) : null;
}

export async function getSession(id: string): Promise<SessionState | null> {
  return loadSession(id);
}

export async function joinStore(
  pin: string,
  companyName: string,
  playerName: string
): Promise<{ session: SessionState; store: Store; storeToken: string } | null> {
  const sessionRow = await prisma.session.findUnique({
    where: { pin: pin.toUpperCase() },
    include: { stores: true },
  });
  if (!sessionRow) return null;

  const normalizedCompany = companyName.trim();
  const normalizedPlayer = playerName.trim();

  const existing = sessionRow.stores.find(
    (s) => s.companyName.toLowerCase() === normalizedCompany.toLowerCase()
  );

  if (existing) {
    await prisma.store.update({
      where: { id: existing.id },
      data: { playerName: normalizedPlayer, connected: true },
    });
    const session = await loadSession(sessionRow.id);
    if (!session) return null;
    const store = session.stores.find((s) => s.id === existing.id)!;
    return { session, store, storeToken: existing.storeToken };
  }

  const storeId = idGen();
  const storeToken = idGen();
  const defaultPlan = enrichPlan({ ...DEFAULT_PLAN });

  await prisma.store.create({
    data: {
      id: storeId,
      sessionId: sessionRow.id,
      companyName: normalizedCompany,
      playerName: normalizedPlayer,
      storeToken,
      planDraft: toJson(defaultPlan),
      connected: true,
    },
  });

  const session = await loadSession(sessionRow.id);
  if (!session) return null;
  const store = session.stores.find((s) => s.id === storeId)!;
  return { session, store, storeToken };
}

export async function verifyFacilitator(
  sessionId: string,
  token: string
): Promise<SessionState | null> {
  const row = await prisma.session.findFirst({
    where: { id: sessionId, facilitatorToken: token },
  });
  if (!row) return null;
  return loadSession(sessionId);
}

export async function verifyStore(
  sessionId: string,
  storeId: string,
  token: string
): Promise<SessionState | null> {
  const store = await prisma.store.findFirst({
    where: { id: storeId, sessionId, storeToken: token },
  });
  if (!store) return null;
  return loadSession(sessionId);
}

export async function updatePlan(
  sessionId: string,
  storeId: string,
  plan: StorePlan
): Promise<Store | null> {
  const store = await prisma.store.findFirst({ where: { id: storeId, sessionId } });
  if (!store) return null;

  const enriched = enrichPlan(plan);
  const row = await prisma.store.update({
    where: { id: storeId },
    data: { planDraft: toJson(enriched) },
  });
  return mapStore(row);
}

export async function submitPlan(sessionId: string, storeId: string): Promise<Store | null> {
  const storeRow = await prisma.store.findFirst({
    where: { id: storeId, sessionId },
  });
  if (!storeRow?.planDraft) return null;

  const draft = parsePlan(storeRow.planDraft);
  if (!draft) return null;

  const row = await prisma.store.update({
    where: { id: storeId },
    data: { planSubmitted: toJson(draft) },
  });
  return mapStore(row);
}

export function publicSession(s: SessionState): SessionState {
  return {
    ...s,
    stores: s.stores.map(({ id, companyName, playerName, planSubmitted, connected }) => ({
      id,
      companyName,
      playerName,
      planDraft: null,
      planSubmitted: planSubmitted ? { ...planSubmitted } : null,
      connected,
    })),
  };
}

export async function advancePhase(sessionId: string): Promise<SessionState | null> {
  const session = await loadSession(sessionId);
  if (!session) return null;

  const idx = PHASE_ORDER.indexOf(session.phase);
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return session;

  const next = PHASE_ORDER[idx + 1];

  if (next === "CONFIG_1" || next === "CONFIG_2") {
    await prisma.store.updateMany({
      where: { sessionId },
      data: { planSubmitted: Prisma.DbNull },
    });
  }

  if (next === "ROUND_1" || next === "ROUND_2" || next === "ROUND_3") {
    const roundNum = next === "ROUND_1" ? 1 : next === "ROUND_2" ? 2 : 3;
    await runRound(sessionId, session, roundNum);
  }

  if (next === "FINAL") {
    const beforeFinal = await loadSession(sessionId);
    if (beforeFinal) {
      const ranking = finalizeGame(beforeFinal.roundResults.map((r) => r.stores));
      await prisma.finalRanking.deleteMany({ where: { sessionId } });
      if (ranking.length > 0) {
        await prisma.finalRanking.createMany({
          data: ranking.map((r, i) => ({
            sessionId,
            storeId: r.storeId,
            companyName: r.companyName,
            ebitdaPercent: r.ebitdaPercent,
            position: i + 1,
          })),
        });
      }
    }
  }

  const sessionUpdate: { phase: PrismaPhase; currentRound?: number } = {
    phase: next as PrismaPhase,
  };
  if (next === "ROUND_1") sessionUpdate.currentRound = 1;
  else if (next === "ROUND_2") sessionUpdate.currentRound = 2;
  else if (next === "ROUND_3") sessionUpdate.currentRound = 3;

  await prisma.session.update({
    where: { id: sessionId },
    data: sessionUpdate,
  });

  return loadSession(sessionId);
}

async function runRound(sessionId: string, session: SessionState, roundNum: number) {
  const configRound: 1 | 2 = roundNum === 1 ? 1 : 2;
  const activeStores = session.stores.filter((st) => st.planSubmitted);

  const cashRows = await prisma.store.findMany({
    where: { sessionId, id: { in: activeStores.map((s) => s.id) } },
    select: { id: true, cashRemaining: true },
  });
  const cashMap = new Map(cashRows.map((r) => [r.id, r.cashRemaining ?? undefined]));

  const inputs = activeStores.map((st) => ({
    storeId: st.id,
    companyName: st.companyName,
    plan: st.planSubmitted!,
    configRound,
    previousCash: cashMap.get(st.id),
  }));

  const demandMultiplier = Math.max(activeStores.length, 1) / 4;
  const results = simulateRound(inputs, roundNum, 2_500_000 * demandMultiplier);

  for (const r of results) {
    await prisma.store.update({
      where: { id: r.storeId },
      data: { cashRemaining: r.cashRemaining },
    });
  }

  await prisma.roundResult.upsert({
    where: {
      sessionId_round: { sessionId, round: roundNum },
    },
    create: {
      sessionId,
      round: roundNum,
      results: results as unknown as Prisma.InputJsonValue,
    },
    update: {
      results: results as unknown as Prisma.InputJsonValue,
    },
  });
}

export function submittedCount(s: SessionState): number {
  return s.stores.filter((st) => st.planSubmitted).length;
}
