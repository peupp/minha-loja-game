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

export type RoundEventType = CapexType;

export interface RoundEvent {
  type: RoundEventType;
  days: number;
}

export interface RoundEventImpact {
  eventType: RoundEventType;
  eventLabel: string;
  protectedByCapex: boolean;
  affectedDays: number;
  revenueBeforeLoss?: number;
  lossPercent?: number;
  revenueLoss: number;
  note: string;
}

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
  roundsCount: number;
  questionCount: number;
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
  priceScore: number;
  availabilityScore: number;
  csatScore: number;
  totalRankPoints: number;
  totalMarketPoints: number;
  inventoryByCategory: Record<string, number>;
  inventoryCost: number;
  capexCost: number;
  spend: number;
  monthlyFixed: number;
  negativeCashInterest: number;
  cogs: number;
  taxes: number;
  rankScore: number;
  demandShare: number;
  revenue: number;
  costs: number;
  ebitda: number;
  ebitdaPercent: number;
  cashRemaining: number;
  eventImpact?: RoundEventImpact;
  eventImpacts?: RoundEventImpact[];
}

export interface RoundResult {
  round: number;
  event?: RoundEvent;
  events?: RoundEvent[];
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
  finalRanking: {
    storeId: string;
    companyName: string;
    ebitda: number;
    revenue: number;
    ebitdaPercent: number;
  }[];
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

export const CAPEX_DESCRIPTIONS: Record<CapexType, string> = {
  SECURITY: "Protege a loja contra perdas causadas por falhas de segurança digital.",
  SCALE_FREEZER: "Evita problemas operacionais ligados a pesagem, refrigeração e produtos sensíveis.",
  NETWORK: "Reduz risco de queda de sistemas, pagamentos e comunicação da loja.",
  WEBSITE: "Melhora a presença digital e ajuda a loja a vender melhor nos canais online.",
  SELF_CHECKOUT: "Aumenta a capacidade de atendimento e reduz filas em momentos de alta demanda.",
  CONTINUOUS_IMPROVEMENT: "Representa melhorias constantes em processos, qualidade e eficiência.",
};

export const ROUND_EVENT_LABELS: Record<RoundEventType, string> = CAPEX_LABELS;
