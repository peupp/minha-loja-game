import type { GamePhase } from "@minha-loja/shared-types";

export const PHASE_LABELS: Record<GamePhase, string> = {
  LOBBY: "Lobby — aguardando empresas",
  CONFIG_1: "1ª Configuração — plano operacional",
  ROUND_1: "Rodada 1 de vendas",
  RESULTS_1: "Resultados parciais",
  CONFIG_2: "2ª Configuração",
  ROUND_2: "Rodada 2 de vendas",
  ROUND_3: "Rodada 3 de vendas",
  FINAL: "Resultado final",
};

export const NEXT_PHASE_HINT: Partial<Record<GamePhase, string>> = {
  LOBBY: "Abrir 1ª configuração (qualquer número de empresas)",
  CONFIG_1: "Rodada 1 — empresas que enviaram plano participam",
  ROUND_1: "Ver resultados parciais",
  RESULTS_1: "Abrir 2ª configuração",
  CONFIG_2: "Rodada 2",
  ROUND_2: "Rodada 3",
  ROUND_3: "Apurar resultado final",
};
