export type GamePhase =
  | "LOBBY"
  | "CONFIG_1"
  | "ROUND_1"
  | "RESULTS_1"
  | "CONFIG_2"
  | "ROUND_2"
  | "ROUND_3"
  | "FINAL";

export type CapexType =
  | "SECURITY"
  | "SCALE_FREEZER"
  | "NETWORK"
  | "WEBSITE"
  | "SELF_CHECKOUT"
  | "CONTINUOUS_IMPROVEMENT";

export interface CapexItem {
  type: CapexType;
  approved: boolean;
}

export interface CategoryPlan {
  categoryId: string;
  quantity: number;
  marginPercent: number;
}

export interface StorePlan {
  capex: CapexItem[];
  categories: CategoryPlan[];
  operatorsSales: number;
  operatorsService: number;
  quizCorrect: number;
  quizTotal: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  unitCost: number;
  maxAvailable: number;
}

export interface GameConfig {
  categories: ProductCategory[];
  initialCash: number;
  interestRateMonth: number;
  idealOperators: number;
  taxRate: number;
  capexCosts: Record<CapexType, number>;
  monthlyLicenseBase: number;
  maintenanceEquipment: number;
  selfCheckoutLicenseEach: number;
  salarySales: number;
  salaryService: number;
  roundDemandBase: number;
  agingRate: number;
  breakageRate: number;
}

export interface Store {
  id: string;
  companyName: string;
  playerName: string;
  planDraft: StorePlan | null;
  planSubmitted: StorePlan | null;
  connected: boolean;
}

export interface RoundStoreResult {
  storeId: string;
  companyName: string;
  basketPrice: number;
  availability: number;
  csat: number;
  rankScore: number;
  demandShare: number;
  revenue: number;
  costs: number;
  ebitda: number;
  ebitdaPercent: number;
  cashRemaining: number;
}

export interface RoundResult {
  round: number;
  stores: RoundStoreResult[];
}

export interface SessionState {
  id: string;
  pin: string;
  facilitatorToken: string;
  phase: GamePhase;
  currentRound: number;
  gameConfig: GameConfig;
  stores: Store[];
  roundResults: RoundResult[];
  finalRanking: { storeId: string; companyName: string; ebitdaPercent: number }[];
  createdAt: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  pin: string;
  facilitatorToken: string;
  facilitatorUrl: string;
}

export interface JoinStoreRequest {
  pin: string;
  companyName: string;
  playerName: string;
}

export interface JoinStoreResponse {
  sessionId: string;
  storeId: string;
  storeToken: string;
}

export const DEFAULT_PLAN: StorePlan = {
  capex: [
    { type: "SECURITY", approved: false },
    { type: "SCALE_FREEZER", approved: false },
    { type: "NETWORK", approved: false },
    { type: "WEBSITE", approved: false },
    { type: "SELF_CHECKOUT", approved: false },
    { type: "CONTINUOUS_IMPROVEMENT", approved: false },
  ],
  categories: [],
  operatorsSales: 5,
  operatorsService: 2,
  quizCorrect: 0,
  quizTotal: 0,
};

export const CAPEX_LABELS: Record<CapexType, string> = {
  SECURITY: "Segurança (ciber)",
  SCALE_FREEZER: "Balança / Freezer",
  NETWORK: "Redes",
  WEBSITE: "Melhorias no Site",
  SELF_CHECKOUT: "Self Checkout",
  CONTINUOUS_IMPROVEMENT: "Melhoria Contínua",
};
