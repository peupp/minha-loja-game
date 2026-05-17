import type { RoundStoreResult, StorePlan } from "@minha-loja/shared-types";
import {
  AGING_RATE,
  BREAKAGE_RATE,
  CAPEX_COSTS,
  CATEGORIES,
  IDEAL_OPERATORS,
  INITIAL_CASH,
  INTEREST_RATE_MONTH,
  MAINTENANCE_EQUIPMENT,
  MONTHLY_LICENSE_BASE,
  ROUND_DEMAND_BASE,
  SALARY_SALES,
  SALARY_SERVICE,
  SELF_CHECKOUT_LICENSE_EACH,
  TAX_RATE,
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
  const map = new Map<string, number>();
  sorted.forEach((item, i) => {
    map.set(item.id, points[Math.min(i, points.length - 1)]);
  });
  return map;
}

function calcBasketPrice(plan: StorePlan): number {
  let total = 0;
  let weight = 0;
  for (const cat of plan.categories) {
    const meta = CATEGORIES.find((c) => c.id === cat.categoryId);
    if (!meta || cat.quantity <= 0) continue;
    const price = meta.unitCost * (1 + cat.marginPercent / 100);
    total += price * cat.quantity;
    weight += cat.quantity;
  }
  return weight > 0 ? total / weight : 999999;
}

function calcAvailability(plan: StorePlan): number {
  let bought = 0;
  let maxPossible = 0;
  for (const cat of plan.categories) {
    const meta = CATEGORIES.find((c) => c.id === cat.categoryId);
    if (!meta) continue;
    bought += cat.quantity;
    maxPossible += meta.maxAvailable;
  }
  return maxPossible > 0 ? (bought / maxPossible) * 100 : 0;
}

function calcCsat(plan: StorePlan): number {
  const opsRatio = Math.min(plan.operatorsSales / IDEAL_OPERATORS, 1);
  const quizRatio =
    plan.quizTotal > 0 ? plan.quizCorrect / plan.quizTotal : 0;
  return opsRatio * quizRatio * 100;
}

function planSpend(plan: StorePlan): {
  inventoryCost: number;
  capexCost: number;
  monthlyFixed: number;
} {
  let inventoryCost = 0;
  for (const cat of plan.categories) {
    const meta = CATEGORIES.find((c) => c.id === cat.categoryId);
    if (meta) inventoryCost += meta.unitCost * cat.quantity;
  }

  let capexCost = 0;
  for (const item of plan.capex) {
    if (item.approved) capexCost += CAPEX_COSTS[item.type] ?? 0;
  }

  let monthlyFixed = MONTHLY_LICENSE_BASE;
  const hasScale = plan.capex.find((c) => c.type === "SCALE_FREEZER")?.approved;
  if (!hasScale) monthlyFixed += MAINTENANCE_EQUIPMENT;

  const selfCount = plan.capex.find((c) => c.type === "SELF_CHECKOUT")?.approved
    ? 4
    : 0;
  monthlyFixed += selfCount * SELF_CHECKOUT_LICENSE_EACH;

  if (plan.capex.find((c) => c.type === "SECURITY")?.approved) {
    monthlyFixed += MONTHLY_LICENSE_BASE * 0.2;
  }
  if (plan.capex.find((c) => c.type === "WEBSITE")?.approved) {
    monthlyFixed += MONTHLY_LICENSE_BASE * 0.3;
  }

  monthlyFixed +=
    plan.operatorsSales * SALARY_SALES +
    plan.operatorsService * SALARY_SERVICE;

  return { inventoryCost, capexCost, monthlyFixed };
}

export function simulateRound(
  stores: StoreInput[],
  roundNumber: number,
  totalDemand: number = ROUND_DEMAND_BASE
): RoundStoreResult[] {
  if (stores.length === 0) return [];

  const basketPrices = stores.map((s) => ({
    id: s.storeId,
    value: calcBasketPrice(s.plan),
  }));
  const availabilities = stores.map((s) => ({
    id: s.storeId,
    value: calcAvailability(s.plan),
  }));
  const csats = stores.map((s) => ({
    id: s.storeId,
    value: calcCsat(s.plan),
  }));

  const priceRanks = rankScores(basketPrices, false);
  const availRanks = rankScores(availabilities, true);
  const csatRanks = rankScores(csats, true);

  const totalRankPoints = stores.map((s) => {
    const pts =
      (priceRanks.get(s.storeId) ?? 1) +
      (availRanks.get(s.storeId) ?? 1) +
      (csatRanks.get(s.storeId) ?? 1);
    return { id: s.storeId, pts };
  });

  const sumPts = totalRankPoints.reduce((a, b) => a + b.pts, 0) || 1;

  return stores.map((store) => {
    const rankScore =
      (priceRanks.get(store.storeId) ?? 1) +
      (availRanks.get(store.storeId) ?? 1) +
      (csatRanks.get(store.storeId) ?? 1);
    const demandShare = rankScore / sumPts;
    const revenue = totalDemand * demandShare;

    const { inventoryCost, capexCost, monthlyFixed } = planSpend(store.plan);
    const spend =
      store.configRound === 1 ? inventoryCost + capexCost : inventoryCost;
    let cash =
      store.configRound === 1
        ? INITIAL_CASH - spend
        : (store.previousCash ?? INITIAL_CASH) - spend;

    if (cash < 0) {
      cash -= Math.abs(cash) * INTEREST_RATE_MONTH;
    }

    const cogs = inventoryCost * demandShare * 0.85;
    const taxes = revenue * TAX_RATE;
    const costs = cogs + taxes + monthlyFixed / 3;
    const ebitda = revenue - costs;
    const ebitdaPercent = revenue > 0 ? (ebitda / revenue) * 100 : 0;

    return {
      storeId: store.storeId,
      companyName: store.companyName,
      basketPrice: calcBasketPrice(store.plan),
      availability: calcAvailability(store.plan),
      csat: calcCsat(store.plan),
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
): { storeId: string; companyName: string; ebitdaPercent: number }[] {
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
      ebitdaPercent: t.revenue > 0 ? (t.ebitda / t.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.ebitdaPercent - a.ebitdaPercent);
}

export function defaultCategoriesPlan(): StorePlan["categories"] {
  return CATEGORIES.map((c) => ({
    categoryId: c.id,
    quantity: Math.floor(c.maxAvailable * 0.15),
    marginPercent: 22,
  }));
}

export { CATEGORIES, INITIAL_CASH, CAPEX_COSTS };
