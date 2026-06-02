import type {
  CreateSessionResponse,
  GameConfig,
  JoinStoreResponse,
  RoundEvent,
  SessionState,
  StorePlan,
} from "@minha-loja/shared-types";

const API = "/api";

export async function createSession(): Promise<CreateSessionResponse> {
  const res = await fetch(`${API}/sessions`, { method: "POST" });
  if (!res.ok) throw new Error("Falha ao criar sessão");
  return res.json();
}

export async function joinStore(
  pin: string,
  companyName: string,
  playerName: string
): Promise<JoinStoreResponse & { session: SessionState }> {
  const res = await fetch(`${API}/sessions/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, companyName, playerName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Falha ao entrar");
  }
  return res.json();
}

export async function fetchSession(sessionId: string): Promise<SessionState> {
  const res = await fetch(`${API}/sessions/${sessionId}`);
  if (!res.ok) throw new Error("Sessão não encontrada");
  return res.json();
}

export async function fetchParams() {
  const res = await fetch(`${API}/params`);
  return res.json();
}

export async function updateGameConfig(
  sessionId: string,
  facilitatorToken: string,
  config: GameConfig
): Promise<SessionState> {
  const res = await fetch(`${API}/sessions/${sessionId}/config`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-facilitator-token": facilitatorToken,
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Falha ao salvar configuração");
  }
  return res.json();
}

export async function savePlan(
  sessionId: string,
  storeId: string,
  storeToken: string,
  plan: StorePlan
) {
  await fetch(`${API}/sessions/${sessionId}/stores/${storeId}/plan`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-store-token": storeToken,
    },
    body: JSON.stringify(plan),
  });
}

export async function fetchFacilitatorStorePlan(
  sessionId: string,
  facilitatorToken: string,
  storeId: string
): Promise<{ plan: StorePlan | null }> {
  const res = await fetch(`${API}/sessions/${sessionId}/stores/${storeId}/quiz`, {
    headers: { "x-facilitator-token": facilitatorToken },
  });
  if (!res.ok) throw new Error("Falha ao carregar CSAT da empresa");
  return res.json();
}

export async function saveFacilitatorQuiz(
  sessionId: string,
  facilitatorToken: string,
  storeId: string,
  quizCorrect: number,
  quizTotal: number
): Promise<{ plan: StorePlan | null }> {
  const res = await fetch(`${API}/sessions/${sessionId}/stores/${storeId}/quiz`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-facilitator-token": facilitatorToken,
    },
    body: JSON.stringify({ quizCorrect, quizTotal }),
  });
  if (!res.ok) throw new Error("Falha ao salvar CSAT");
  return res.json();
}

export async function submitPlan(
  sessionId: string,
  storeId: string,
  storeToken: string
) {
  const res = await fetch(
    `${API}/sessions/${sessionId}/stores/${storeId}/submit`,
    {
      method: "POST",
      headers: { "x-store-token": storeToken },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Falha ao enviar");
  }
  return res.json();
}

export async function advancePhase(
  sessionId: string,
  facilitatorToken: string,
  events: RoundEvent[] = []
): Promise<SessionState> {
  const res = await fetch(`${API}/sessions/${sessionId}/advance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-facilitator-token": facilitatorToken,
    },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) throw new Error("Falha ao avançar fase");
  return res.json();
}
