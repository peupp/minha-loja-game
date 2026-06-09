import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { StorePlan } from "@minha-loja/shared-types";
import { fetchFacilitatorStorePlan, saveFacilitatorQuiz } from "../api";
import { csatBreakdown } from "../utils/csat";
import { useSession } from "../hooks/useSession";
import { useFinalRedirect } from "../hooks/useFinalRedirect";

export default function QuizPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const storeId = search.get("store");
  const token =
    search.get("token") ||
    (sessionId ? localStorage.getItem(`facilitator:${sessionId}`) : null);
  const { session } = useSession(sessionId);
  useFinalRedirect(sessionId, session);
  const [plan, setPlan] = useState<StorePlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId || !storeId || !token) return;
    fetchFacilitatorStorePlan(sessionId, token, storeId)
      .then((data) => setPlan(data.plan))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar CSAT"));
  }, [sessionId, storeId, token]);

  const store = session?.stores.find((item) => item.id === storeId);
  const questionCount = Math.max(session?.gameConfig.questionCount ?? 1, 1);
  const answered = plan?.quizTotal ?? 0;
  const correct = plan?.quizCorrect ?? 0;
  const finished = answered >= questionCount;

  const saveScore = async (quizCorrect: number, quizTotal: number) => {
    if (!sessionId || !storeId || !token) return;
    setSaving(true);
    setError("");
    try {
      const data = await saveFacilitatorQuiz(
        sessionId,
        token,
        storeId,
        quizCorrect,
        quizTotal
      );
      setPlan(data.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar CSAT");
    } finally {
      setSaving(false);
    }
  };

  const recordAnswer = (isCorrect: boolean) => {
    if (!plan || finished) return;
    void saveScore(correct + (isCorrect ? 1 : 0), answered + 1);
  };

  if (!sessionId || !storeId || !token) {
    return (
      <div className="page-narrow">
        <p>Acesso de facilitador invalido.</p>
        <Link to="/">Voltar</Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="page">
        {error ? <p className="status-error">{error}</p> : "Carregando registro de CSAT..."}
      </div>
    );
  }

  const { opsPercent, quizPercent, csat } = csatBreakdown(
    plan.operatorsSales,
    plan.quizCorrect,
    questionCount,
    session?.gameConfig.idealOperators
  );
  const idealOperators = session?.gameConfig.idealOperators ?? 10;
  const facilitatorUrl = `/facilitador?session=${sessionId}&token=${token}`;

  return (
    <div className="page-narrow">
      <Link to={facilitatorUrl} className="back-link">
        Voltar ao painel
      </Link>
      <h1 className="mt-1">Registro de CSAT</h1>
      <p className="subtitle">
        {store?.companyName ?? "Empresa"} - marque se a resposta presencial foi correta.
      </p>

      <section className="card mb-1">
        <div className="csat-register-head">
          <span>
            Pergunta {Math.min(answered + 1, questionCount)} de {questionCount}
          </span>
          <strong>
            {correct}/{questionCount}
          </strong>
        </div>

        <div className="actions">
          <button
            type="button"
            className="btn-primary"
            disabled={saving || finished}
            onClick={() => recordAnswer(true)}
          >
            Acertou
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={saving || finished}
            onClick={() => recordAnswer(false)}
          >
            Errou
          </button>
        </div>

        {finished && <p className="status-success">Perguntas finalizadas.</p>}
        {error && <p className="status-error">{error}</p>}
      </section>

      <section className="card mb-1">
        <h3 className="section-title">Calculo do CSAT</h3>
        <div className="csat-breakdown csat-breakdown--light">
          <div className="csat-row">
            <span>
              Operadores ({plan.operatorsSales} / {idealOperators} ideal)
            </span>
            <strong>{opsPercent.toFixed(0)}%</strong>
          </div>
          <div className="csat-row">
            <span>
              Perguntas corretas ({correct}/{questionCount})
            </span>
            <strong>{quizPercent.toFixed(0)}%</strong>
          </div>
          <div className="csat-row csat-row--total">
            <span>CSAT</span>
            <strong>{csat.toFixed(1)}%</strong>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="btn-secondary btn-block"
        disabled={saving}
        onClick={() => saveScore(0, 0)}
      >
        Reiniciar respostas
      </button>
    </div>
  );
}
