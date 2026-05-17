export interface ProductCategory {
  id: string;
  name: string;
  unitCost: number;
  maxAvailable: number;
}

export const INITIAL_CASH = 700_000;
export const INTEREST_RATE_MONTH = 0.12;
export const IDEAL_OPERATORS = 10;
export const TAX_RATE = 0.09;

export const CATEGORIES: ProductCategory[] = [
  { id: "pereciveis", name: "Perecíveis", unitCost: 12, maxAvailable: 50_000 },
  { id: "nao_pereciveis", name: "Não Perecíveis", unitCost: 8, maxAvailable: 80_000 },
  { id: "bebidas", name: "Bebidas", unitCost: 6, maxAvailable: 60_000 },
  { id: "higiene", name: "Higiene & Limpeza", unitCost: 10, maxAvailable: 40_000 },
];

export const CAPEX_COSTS: Record<string, number> = {
  SECURITY: 45_000,
  SCALE_FREEZER: 38_000,
  NETWORK: 32_000,
  WEBSITE: 55_000,
  SELF_CHECKOUT: 120_000,
  CONTINUOUS_IMPROVEMENT: 28_000,
};

export const MONTHLY_LICENSE_BASE = 500;
export const MAINTENANCE_EQUIPMENT = 400;
export const SELF_CHECKOUT_LICENSE_EACH = 80;
export const SALARY_SALES = 2_800;
export const SALARY_SERVICE = 3_200;

export const ROUND_DEMAND_BASE = 2_500_000;
export const AGING_RATE = 0.15;
export const BREAKAGE_RATE = 0.08;
