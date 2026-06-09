import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  advancePhase,
  createSession,
  getSession,
  getSessionByPin,
  joinStore,
  publicSession,
  recordStoreQuiz,
  submitPlan,
  submittedCount,
  updateGameConfig,
  updatePlan,
  verifyFacilitator,
  verifyStore,
} from "./store";
import type { GameConfig, RoundEvent, StorePlan } from "@minha-loja/shared-types";
import { CATEGORIES, INITIAL_CASH, CAPEX_COSTS, DEFAULT_GAME_CONFIG } from "@minha-loja/game-engine";
import { prisma } from "./prisma";

const PORT = Number(process.env.PORT) || 3001;
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:5173";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true } });

async function emitSession(sessionId: string) {
  const s = await getSession(sessionId);
  if (!s) return;
  io.to(sessionId).emit("session:update", publicSession(s));
}

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected" });
  } catch {
    res.status(503).json({ ok: false, database: "disconnected" });
  }
});

app.get("/api/params", (_req, res) => {
  res.json({
    categories: CATEGORIES,
    initialCash: INITIAL_CASH,
    capexCosts: CAPEX_COSTS,
    defaultGameConfig: DEFAULT_GAME_CONFIG,
  });
});

app.post("/api/sessions", async (_req, res) => {
  try {
    const { session, facilitatorUrl } = await createSession(PUBLIC_URL);
    res.json({
      sessionId: session.id,
      pin: session.pin,
      facilitatorToken: session.facilitatorToken,
      facilitatorUrl,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar sessão. Verifique o banco de dados." });
  }
});

app.get("/api/sessions/:id", async (req, res) => {
  const s = await getSession(req.params.id);
  if (!s) return res.status(404).json({ error: "Sessão não encontrada" });
  res.json(publicSession(s));
});

app.put("/api/sessions/:sessionId/config", async (req, res) => {
  const token = req.headers["x-facilitator-token"] as string;
  const s = await verifyFacilitator(req.params.sessionId, token);
  if (!s) return res.status(403).json({ error: "Facilitador não autorizado" });

  try {
    const updated = await updateGameConfig(req.params.sessionId, req.body as GameConfig);
    if (!updated) return res.status(404).json({ error: "Sessão não encontrada" });
    await emitSession(updated.id);
    res.json(publicSession(updated));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao salvar configuração";
    res.status(400).json({ error: message });
  }
});

app.get("/api/sessions/pin/:pin", async (req, res) => {
  const s = await getSessionByPin(req.params.pin);
  if (!s) return res.status(404).json({ error: "PIN inválido" });
  res.json(publicSession(s));
});

app.post("/api/sessions/join", async (req, res) => {
  const { pin, companyName, playerName } = req.body;
  if (!pin || !companyName || !playerName) {
    return res.status(400).json({ error: "PIN, empresa e nome são obrigatórios" });
  }
  try {
    const result = await joinStore(pin, companyName, playerName);
    if (!result) return res.status(404).json({ error: "PIN inválido" });
    await emitSession(result.session.id);
    res.json({
      sessionId: result.session.id,
      storeId: result.store.id,
      storeToken: result.storeToken,
      session: publicSession(result.session),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao entrar na sessão" });
  }
});

app.get("/api/sessions/:sessionId/stores/:storeId/plan", async (req, res) => {
  const token = req.headers["x-store-token"] as string;
  const s = await verifyStore(req.params.sessionId, req.params.storeId, token);
  if (!s) return res.status(403).json({ error: "Não autorizado" });
  const store = s.stores.find((x) => x.id === req.params.storeId);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });
  res.json({ plan: store.planDraft ?? store.planSubmitted });
});

app.get("/api/sessions/:sessionId/stores/:storeId/quiz", async (req, res) => {
  const token = req.headers["x-facilitator-token"] as string;
  const s = await verifyFacilitator(req.params.sessionId, token);
  if (!s) return res.status(403).json({ error: "Facilitador não autorizado" });
  const store = s.stores.find((x) => x.id === req.params.storeId);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });
  res.json({ plan: store.planDraft ?? store.planSubmitted });
});

app.put("/api/sessions/:sessionId/stores/:storeId/quiz", async (req, res) => {
  const token = req.headers["x-facilitator-token"] as string;
  const s = await verifyFacilitator(req.params.sessionId, token);
  if (!s) return res.status(403).json({ error: "Facilitador não autorizado" });

  const quizCorrect = Number(req.body?.quizCorrect ?? 0);
  const quizTotal = Number(req.body?.quizTotal ?? 0);
  const store = await recordStoreQuiz(s.id, req.params.storeId, quizCorrect, quizTotal);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });
  const updated = await getSession(s.id);
  if (updated) await emitSession(updated.id);
  res.json({ ok: true, plan: store.planDraft ?? store.planSubmitted });
});

app.put("/api/sessions/:sessionId/stores/:storeId/plan", async (req, res) => {
  const token = req.headers["x-store-token"] as string;
  const s = await verifyStore(req.params.sessionId, req.params.storeId, token);
  if (!s) return res.status(403).json({ error: "Não autorizado" });

  const plan = req.body as StorePlan;
  const store = await updatePlan(s.id, req.params.storeId, plan);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });
  await emitSession(s.id);
  res.json({ ok: true, plan: store.planDraft });
});

app.post("/api/sessions/:sessionId/stores/:storeId/submit", async (req, res) => {
  const token = req.headers["x-store-token"] as string;
  const s = await verifyStore(req.params.sessionId, req.params.storeId, token);
  if (!s) return res.status(403).json({ error: "Não autorizado" });

  const phase = s.phase;
  if (phase !== "CONFIG_1" && phase !== "CONFIG_2") {
    return res.status(400).json({ error: "Envio de plano não permitido nesta fase" });
  }

  const store = await submitPlan(s.id, req.params.storeId);
  if (!store) return res.status(404).json({ error: "Loja não encontrada" });
  const updated = await getSession(s.id);
  if (!updated) return res.status(404).json({ error: "Sessão não encontrada" });
  await emitSession(s.id);
  res.json({
    ok: true,
    submitted: submittedCount(updated),
    total: updated.stores.length,
  });
});

app.post("/api/sessions/:sessionId/advance", async (req, res) => {
  const token = req.headers["x-facilitator-token"] as string;
  const s = await verifyFacilitator(req.params.sessionId, token);
  if (!s) return res.status(403).json({ error: "Facilitador não autorizado" });

  try {
    const events = Array.isArray(req.body?.events)
      ? (req.body.events as RoundEvent[])
      : req.body?.event
        ? [req.body.event as RoundEvent]
        : [];
    const updated = await advancePhase(s.id, events);
    if (!updated) return res.status(404).json({ error: "Sessão não encontrada" });
    await emitSession(updated.id);
    res.json(publicSession(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao avançar fase" });
  }
});

const webDistPath = path.resolve(__dirname, "../../web/dist");
app.use(express.static(webDistPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(webDistPath, "index.html"));
});

io.on("connection", (socket) => {
  socket.on("join:session", async (sessionId: string) => {
    socket.join(sessionId);
    const s = await getSession(sessionId);
    if (s) socket.emit("session:update", publicSession(s));
  });
});

httpServer.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
