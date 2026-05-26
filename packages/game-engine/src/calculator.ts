import type { GameConfig, RoundStoreResult, StorePlan } from "@minha-loja/shared-types";
import {
  CAPEX_COSTS,
  CATEGORIES,
  DEFAULT_GAME_CONFIG,
  INITIAL_CASH,
  ROUND_DEMAND_BASE,
} from "./params";

export interface StoreInput {
  storeId: string;
  companyName: string;
  plan: StorePlan;
  configRound: 1 | 2;
  previousCash?: number;
  unsoldInventory?: Record<string, number>;
}

function rankScores(values: { id: string; value: number }[], higherIsBetter: boolean) {
  const sorted = [...values].sort((a, b) =>
    higherIsBetter ? b.value - a.value : a.value - b.value
  );
  const n = sorted.length;
  const points = n <= 1 ? [4] : n === 2 ? [4, 1] : n === 3 ? [4, 2, 1] : [4, 3, 2, 1];
  const map = new Map<string, { rank: number; points: number }>();
  sorted.forEach((item, i) => {
    map.set(item.id, {
      rank: i + 1,
      points: points[Math.min(i, points.length - 1)],
    });
  });
  return map;
}

function calcBasketPrice(plan: StorePlan, config: GameConfig): number {
  let total = 0;
  let weight = 0;
  for (const cat of plan.categories) {
    const meta = config.categories.find((c) => c.id === cat.categoryId);
    if (!meta || cat.quantity <= 0) continue;
    const price = meta.unitCost * (1 + cat.marginPercent / 100);
    total += price * cat.quantity;
    weight += cat.quantity;
  }
  return weight > 0 ? total / weight : 999999;
}

function calcAvailability(plan: StorePlan, config: GameConfig): number {
  let bought = 0;
  let maxPossible = 0;
  for (const cat of plan.categories) {
    const meta = config.categories.find((c) => c.id === cat.categoryId);
    if (!meta) continue;
    bought += cat.quantity;
    maxPossible += meta.maxAvailable;
  }
  return maxPossible > 0 ? (bought / maxPossible) * 100 : 0;
}

function calcCsat(plan: StorePlan, config: GameConfig): number {
  const opsRatio = Math.min(plan.operatorsSales / config.idealOperators, 1);
  const quizRatio =
    config.questionCount > 0 ? plan.quizCorrect / config.questionCount : 0;
  return opsRatio * quizRatio * 100;
}

function planSpend(plan: StorePlan, config: GameConfig): {
  inventoryCost: number;
  inventoryByCategory: Record<string, number>;
  capexCost: number;
  monthlyFixed: number;
} {
  let inventoryCost = 0;
  const inventoryByCategory: Record<string, number> = {};
  for (const cat of plan.categories) {
    const meta = config.categories.find((c) => c.id === cat.categoryId);
    if (meta) {
      inventoryCost += meta.unitCost * cat.quantity;
      inventoryByCategory[cat.categoryId] = cat.quantity;
    }
  }

  let capexCost = 0;
  for (const item of plan.capex) {
    if (item.approved) capexCost += config.capexCosts[item.type] ?? 0;
  }

  let monthlyFixed = config.monthlyLicenseBase;
  const hasScale = plan.capex.find((c) => c.type === "SCALE_FREEZER")?.approved;
  if (!hasScale) monthlyFixed += config.maintenanceEquipment;

  const selfCount = plan.capex.find((c) => c.type === "SELF_CHECKOUT")?.approved
    ? 4
    : 0;
  monthlyFixed += selfCount * config.selfCheckoutLicenseEach;

  if (plan.capex.find((c) => c.type === "SECURITY")?.approved) {
    monthlyFixed += config.monthlyLicenseBase * 0.2;
  }
  if (plan.capex.find((c) => c.type === "WEBSITE")?.approved) {
    monthlyFixed += config.monthlyLicenseBase * 0.3;
  }

  monthlyFixed +=
    plan.operatorsSales * config.salarySales +
    plan.operatorsService * config.salaryService;

  return { inventoryCost, inventoryByCategory, capexCost, monthlyFixed };
}

export function simulateRound(
  stores: StoreInput[],
  roundNumber: number,
  totalDemand: number = ROUND_DEMAND_BASE,
  config: GameConfig = DEFAULT_GAME_CONFIG
): RoundStoreResult[] {
  if (stores.length === 0) return [];

  const basketPrices = stores.map((s) => ({
    id: s.storeId,
    value: calcBasketPrice(s.plan, config),
  }));
  const availabilities = stores.map((s) => ({
    id: s.storeId,
    value: calcAvailability(s.plan, config),
  }));
  const csats = stores.map((s) => ({
    id: s.storeId,
    value: calcCsat(s.plan, config),
  }));

  const priceRanks = rankScores(basketPrices, false);
  const availRanks = rankScores(availabilities, true);
  const csatRanks = rankScores(csats, true);

  const totalRankPoints = stores.map((s) => {
    const pts =
      (priceRanks.get(s.storeId)?.points ?? 1) +
      (availRanks.get(s.storeId)?.points ?? 1) +
      (csatRanks.get(s.storeId)?.points ?? 1);
    return { id: s.storeId, pts };
  });

  const sumPts = totalRankPoints.reduce((a, b) => a + b.pts, 0) || 1;

  return stores.map((store) => {
    const rankScore =
      (priceRanks.get(store.storeId)?.points ?? 1) +
      (availRanks.get(store.storeId)?.points ?? 1) +
      (csatRanks.get(store.storeId)?.points ?? 1);
    const demandShare = rankScore / sumPts;
    const revenue = totalDemand * demandShare;

    const { inventoryCost, inventoryByCategory, capexCost, monthlyFixed } =
      planSpend(store.plan, config);
    const spend =
      store.configRound === 1 ? inventoryCost + capexCost : inventoryCost;
    let cash =
      store.configRound === 1
        ? config.initialCash - spend
        : (store.previousCash ?? config.initialCash) - spend;

    const negativeCashInterest =
      cash < 0 ? Math.abs(cash) * config.interestRateMonth : 0;
    cash -= negativeCashInterest;

    const cogs = inventoryCost * demandShare * 0.85;
    const taxes = revenue * config.taxRate;
    const costs = cogs + taxes + monthlyFixed / 3;
    const ebitda = revenue - costs;
    const ebitdaPercent = revenue > 0 ? (ebitda / revenue) * 100 : 0;

    return {
      storeId: store.storeId,
      companyName: store.companyName,
      basketPrice: calcBasketPrice(store.plan, config),
      availability: calcAvailability(store.plan, config),
      csat: calcCsat(store.plan, config),
      priceScore: priceRanks.get(store.storeId)?.points ?? 1,
      availabilityScore: availRanks.get(store.storeId)?.points ?? 1,
      csatScore: csatRanks.get(store.storeId)?.points ?? 1,
      totalRankPoints: rankScore,
      totalMarketPoints: sumPts,
      inventoryByCategory,
      inventoryCost,
      capexCost,
      spend,
      monthlyFixed,
      negativeCashInterest,
      cogs,
      taxes,
      rankScore,
      demandShare: demandShare * 100,
      revenue,
      costs,
      ebitda,
      ebitdaPercent,
      cashRemaining: cash,
    };
  });
}

export function finalizeGame(
  roundResults: RoundStoreResult[][]
): {
  storeId: string;
  companyName: string;
  ebitda: number;
  revenue: number;
  ebitdaPercent: number;
}[] {
  const totals = new Map<string, { name: string; ebitda: number; revenue: number }>();

  for (const round of roundResults) {
    for (const r of round) {
      const cur = totals.get(r.storeId) ?? {
        name: r.companyName,
        ebitda: 0,
        revenue: 0,
      };
      cur.ebitda += r.ebitda;
      cur.revenue += r.revenue;
      totals.set(r.storeId, cur);
    }
  }

  return [...totals.entries()]
    .map(([storeId, t]) => ({
      storeId,
      companyName: t.name,
      ebitda: t.ebitda,
      revenue: t.revenue,
      ebitdaPercent: t.revenue > 0 ? (t.ebitda / t.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.ebitdaPercent - a.ebitdaPercent);
}

export function defaultCategoriesPlan(
  categories = DEFAULT_GAME_CONFIG.categories
): StorePlan["categories"] {
  return categories.map((c) => ({
    categoryId: c.id,
    quantity: Math.floor(c.maxAvailable * 0.15),
    marginPercent: 22,
  }));
}

export { CATEGORIES, INITIAL_CASH, CAPEX_COSTS };
