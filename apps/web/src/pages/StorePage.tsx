import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import type { StorePlan } from "@minha-loja/shared-types";
import { DEFAULT_PLAN } from "@minha-loja/shared-types";
import { useSession } from "../hooks/useSession";
import { savePlan, submitPlan } from "../api";
import PlanEditor from "../components/PlanEditor";
import { PHASE_LABELS } from "../constants";
import { csatBreakdown } from "../utils/csat";

interface StoreCred {
  storeId: string;
  storeToken: string;
  companyName: string;
  playerName: string;
}

export default function StorePage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const { session, loading } = useSession(sessionId);
  const [cred, setCred] = useState<StoreCred | null>(null);
  const [plan, setPlan] = useState<StorePlan>(DEFAULT_PLAN);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!sessionId) return;
    const raw = localStorage.getItem(`store:${sessionId}`);
    if (raw) setCred(JSON.parse(raw));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !cred) return;
    fetch(`/api/sessions/${sessionId}/stores/${cred.storeId}/plan`, {
      headers: { "x-store-token": cred.storeToken },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.plan) setPlan(d.plan);
      })
      .catch(() => {});
  }, [sessionId, cred]);

  const canEdit = session?.phase === "CONFIG_1" || session?.phase === "CONFIG_2";
  const myStore = session?.stores.find((s) => s.id === cred?.storeId);
  const submitted = !!myStore?.planSubmitted;

  const handleSave = useCallback(async () => {
    if (!sessionId || !cred) return;
    setSaving(true);
    await savePlan(sessionId, cred.storeId, cred.storeToken, plan);
    setSaving(false);
    setMsgTone("success");
    setMsg("Rascunho salvo");
    setTimeout(() => setMsg(""), 2000);
  }, [sessionId, cred, plan]);

  const handleSubmit = async () => {
    if (!sessionId || !cred) return;
    setSaving(true);
    try {
      await savePlan(sessionId, cred.storeId, cred.storeToken, plan);
      await submitPlan(sessionId, cred.storeId, cred.storeToken);
      setMsgTone("success");
      setMsg("Plano enviado com sucesso!");
    } catch (e) {
      setMsgTone("error");
      setMsg(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSaving(false);
    }
  };

  if (!sessionId || !cred) {
    return (
      <div className="page-narrow">
        <p>Sessao invalida. <Link to="/entrar">Entrar novamente</Link></p>
      </div>
    );
  }

  if (loading || !session) {
    return <div className="page">Carregando...</div>;
  }

  const lastRound = session.roundResults[session.roundResults.length - 1];
  const myResult = lastRound?.stores.find((r) => r.storeId === cred.storeId);
  const myFinal = session.finalRanking.find((r) => r.storeId === cred.storeId);
  const ownedStockByCategory = new Map<string, number>();
  for (const round of session.roundResults) {
    const storeRound = round.stores.find((r) => r.storeId === cred.storeId);
    if (!storeRound) continue;
    for (const [categoryId, quantity] of Object.entries(storeRound.inventoryByCategory ?? {})) {
      ownedStockByCategory.set(categoryId, (ownedStockByCategory.get(categoryId) ?? 0) + quantity);
    }
  }
  const consumedByCategory = new Map<string, number>();
  for (const round of session.roundResults) {
    for (const store of round.stores) {
      for (const [categoryId, quantity] of Object.entries(store.inventoryByCategory ?? {})) {
        consumedByCategory.set(categoryId, (consumedByCategory.get(categoryId) ?? 0) + quantity);
      }
    }
  }
  const gameConfigWithRemainingStock = {
    ...session.gameConfig,
    categories: session.gameConfig.categories.map((category) => ({
      ...category,
      maxAvailable: Math.max(0, category.maxAvailable - (consumedByCategory.get(category.id) ?? 0)),
    })),
  };
  const { csat } = csatBreakdown(
    plan.operatorsSales,
    plan.quizCorrect,
    session.gameConfig.questionCount,
    session.gameConfig.idealOperators
  );
  const money = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="badge">PIN {session.pin}</span>
          <h1 className="mt-1">{cred.companyName}</h1>
          <p className="subtitle">{cred.playerName}</p>
        </div>
        <Link to={`/telao?session=${sessionId}`} className="back-link">
          Ver telao
        </Link>
      </div>

      <div className="phase-banner">
        <strong>{PHASE_LABELS[session.phase]}</strong>
        {submitted && canEdit && (
          <span style={{ marginLeft: "0.5rem", color: "var(--success)" }}>
            Plano enviado
          </span>
        )}
      </div>

      <section className="card mb-1">
        <h3 className="section-title">Estoque que a empresa ja possui</h3>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Quantidade</th>
              <th>Valor de custo</th>
            </tr>
          </thead>
          <tbody>
            {session.gameConfig.categories.map((category) => {
              const quantity = ownedStockByCategory.get(category.id) ?? 0;
              return (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{quantity.toLocaleString("pt-BR")}</td>
                  <td>{money(quantity * category.unitCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {session.roundResults.length === 0 && (
          <p className="small-note">
            Nenhum estoque comprado ainda. Apos a primeira rodada, ele aparecera aqui.
          </p>
        )}
      </section>

      {canEdit && plan.quizTotal < session.gameConfig.questionCount && (
        <div className="card mb-1 card-csat">
          <p>
            <strong>CSAT pendente.</strong> Aguarde o facilitador registrar os acertos das
            perguntas presenciais.
          </p>
        </div>
      )}

      {canEdit && plan.quizTotal >= session.gameConfig.questionCount && (
        <p className="small-note mb-1">
          CSAT atual: <strong>{csat.toFixed(1)}%</strong> - ajuste operadores no plano ou edite as
          respostas registradas.
        </p>
      )}

      {canEdit && !submitted && (
        <>
          <PlanEditor
            plan={plan}
            onChange={setPlan}
            params={gameConfigWithRemainingStock}
            budgetInitialCash={
              session.phase === "CONFIG_2" && myResult
                ? myResult.cashRemaining
                : session.gameConfig.initialCash
            }
            includeCapexInBudget={session.phase === "CONFIG_1"}
            sessionId={sessionId}
          />
          <div className="actions">
            <button className="btn-secondary" onClick={handleSave} disabled={saving}>Salvar rascunho</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>Enviar plano</button>
          </div>
          {msg && <p className={msgTone === "success" ? "status-success" : "status-error"}>{msg}</p>}
        </>
      )}

      {canEdit && submitted && (
        <p className="muted">
          Aguarde o facilitador avancar a fase. Voce podera editar novamente na proxima configuracao.
        </p>
      )}

      {!canEdit && myResult && (
        <section className="card">
          <h3>Ultimo resultado</h3>
          <table className="mt-1">
            <tbody>
              <tr><td>Participacao na demanda</td><td>{myResult.demandShare.toFixed(1)}%</td></tr>
              <tr><td>Receita</td><td>{money(myResult.revenue)}</td></tr>
              <tr><td>EBITDA %</td><td>{myResult.ebitdaPercent.toFixed(1)}%</td></tr>
              <tr><td>CSAT</td><td>{myResult.csat.toFixed(1)}</td></tr>
            </tbody>
          </table>

          <h3 className="section-title mt-1">Contas do ranking</h3>
          <table className="mt-1">
            <tbody>
              <tr><td>Pontos de preco</td><td>{myResult.priceScore}</td></tr>
              <tr><td>Pontos de disponibilidade</td><td>{myResult.availabilityScore}</td></tr>
              <tr><td>Pontos de CSAT</td><td>{myResult.csatScore}</td></tr>
              <tr>
                <td>Participacao na demanda</td>
                <td>{myResult.totalRankPoints} / {myResult.totalMarketPoints} = {myResult.demandShare.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Receita</td>
                <td>{money(myResult.revenue / (myResult.demandShare / 100))} x {myResult.demandShare.toFixed(1)}% = {money(myResult.revenue)}</td>
              </tr>
              <tr>
                <td>Custos</td>
                <td>CMV {money(myResult.cogs)} + impostos {money(myResult.taxes)} + fixos {money(myResult.monthlyFixed / 3)} = {money(myResult.costs)}</td>
              </tr>
              <tr>
                <td>EBITDA</td>
                <td>{money(myResult.revenue)} - {money(myResult.costs)} = {money(myResult.ebitda)}</td>
              </tr>
              <tr>
                <td>EBITDA %</td>
                <td>{money(myResult.ebitda)} / {money(myResult.revenue)} = {myResult.ebitdaPercent.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {!canEdit && !myResult && (
        <p className="muted">Aguarde o facilitador. Envie seu plano quando a configuracao estiver aberta.</p>
      )}

      {session.phase === "FINAL" && session.finalRanking.length > 0 && (
        <section className="card mt-1">
          <h3>Ranking final</h3>
          <ol className="list-ranking">
            {session.finalRanking.map((r, i) => (
              <li
                key={r.storeId}
                style={{
                  fontWeight: r.storeId === cred.storeId ? 700 : 400,
                  color: r.storeId === cred.storeId ? "var(--teal)" : undefined,
                }}
              >
                {i + 1}. {r.companyName} - {r.ebitdaPercent.toFixed(1)}% EBITDA
              </li>
            ))}
          </ol>
          {myFinal && (
            <div className="mt-1">
              <h3 className="section-title">Sua conta final</h3>
              <table>
                <tbody>
                  <tr><td>EBITDA acumulado</td><td>{money(myFinal.ebitda)}</td></tr>
                  <tr><td>Receita acumulada</td><td>{money(myFinal.revenue)}</td></tr>
                  <tr>
                    <td>EBITDA final</td>
                    <td>{money(myFinal.ebitda)} / {money(myFinal.revenue)} = {myFinal.ebitdaPercent.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
