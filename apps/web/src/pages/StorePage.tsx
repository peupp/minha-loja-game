import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import type { StorePlan } from "@minha-loja/shared-types";
import { DEFAULT_PLAN } from "@minha-loja/shared-types";
import { useSession } from "../hooks/useSession";
import { fetchParams, savePlan, submitPlan } from "../api";
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
  const [params, setParams] = useState<{
    categories: { id: string; name: string; unitCost: number; maxAvailable: number }[];
    initialCash: number;
    capexCosts: Record<string, number>;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"success" | "error">("success");

  useEffect(() => {
    if (!sessionId) return;
    const raw = localStorage.getItem(`store:${sessionId}`);
    if (raw) setCred(JSON.parse(raw));
    fetchParams().then(setParams);
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

  const canEdit =
    session?.phase === "CONFIG_1" || session?.phase === "CONFIG_2";
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
        <p>Sessão inválida. <Link to="/entrar">Entrar novamente</Link></p>
      </div>
    );
  }

  if (loading || !session || !params) {
    return <div className="page">Carregando...</div>;
  }

  const lastRound = session.roundResults[session.roundResults.length - 1];
  const myResult = lastRound?.stores.find((r) => r.storeId === cred.storeId);
  const { csat } = csatBreakdown(
    plan.operatorsSales,
    plan.quizCorrect,
    plan.quizTotal
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="badge">PIN {session.pin}</span>
          <h1 className="mt-1">{cred.companyName}</h1>
          <p className="subtitle">
            {cred.playerName}
          </p>
        </div>
        <Link to={`/telao?session=${sessionId}`} className="back-link">
          Ver telão →
        </Link>
      </div>

      <div className="phase-banner">
        <strong>{PHASE_LABELS[session.phase]}</strong>
        {submitted && canEdit && (
          <span style={{ marginLeft: "0.5rem", color: "var(--success)" }}>
            ✓ Plano enviado
          </span>
        )}
      </div>

      {canEdit && plan.quizTotal === 0 && (
        <div className="card mb-1 card-csat">
          <p>
            <strong>Questionário pendente.</strong> O CSAT depende do quiz sobre o conteúdo
            discutido com o facilitador (estilo Kahoot).
          </p>
          <Link to={`/quiz?session=${sessionId}`} className="quiz-cta-link mt-1">
            <button type="button" className="btn-primary">
              Ir para o questionário
            </button>
          </Link>
        </div>
      )}

      {canEdit && plan.quizTotal > 0 && (
        <p className="small-note mb-1">
          CSAT atual: <strong>{csat.toFixed(1)}%</strong> — ajuste operadores no plano ou refaça o
          quiz.
        </p>
      )}

      {canEdit && !submitted && (
        <>
          <PlanEditor
            plan={plan}
            onChange={setPlan}
            params={{
              ...params,
              initialCash:
                session.phase === "CONFIG_2" && myResult
                  ? myResult.cashRemaining
                  : params.initialCash,
            }}
            includeCapexInBudget={session.phase === "CONFIG_1"}
            sessionId={sessionId}
          />
          <div className="actions">
            <button className="btn-secondary" onClick={handleSave} disabled={saving}>
              Salvar rascunho
            </button>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
              Enviar plano
            </button>
          </div>
          {msg && <p className={msgTone === "success" ? "status-success" : "status-error"}>{msg}</p>}
        </>
      )}

      {canEdit && submitted && (
        <p className="muted">
          Aguarde o facilitador avançar a fase. Você poderá editar novamente na próxima
          configuração.
        </p>
      )}

      {!canEdit && myResult && (
        <section className="card">
          <h3>Último resultado</h3>
          <table className="mt-1">
            <tbody>
              <tr>
                <td>Participação na demanda</td>
                <td>{myResult.demandShare.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>Receita</td>
                <td>R$ {myResult.revenue.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
              </tr>
              <tr>
                <td>EBITDA %</td>
                <td>{myResult.ebitdaPercent.toFixed(1)}%</td>
              </tr>
              <tr>
                <td>CSAT</td>
                <td>{myResult.csat.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {!canEdit && !myResult && (
        <p className="muted">
          Aguarde o facilitador. Envie seu plano quando a configuração estiver aberta.
        </p>
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
                {i + 1}. {r.companyName} — {r.ebitdaPercent.toFixed(1)}% EBITDA
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
