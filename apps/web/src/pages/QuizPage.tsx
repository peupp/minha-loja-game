import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { StorePlan } from "@minha-loja/shared-types";
import { savePlan } from "../api";
import { csatBreakdown } from "../utils/csat";
import { useSession } from "../hooks/useSession";

interface StoreCred {
  storeId: string;
  storeToken: string;
  companyName: string;
  playerName: string;
}

export default function QuizPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const { session } = useSession(sessionId);
  const [cred, setCred] = useState<StoreCred | null>(null);
  const [plan, setPlan] = useState<StorePlan | null>(null);
  const [saving, setSaving] = useState(false);

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

  const questionCount = Math.max(session?.gameConfig.questionCount ?? 1, 1);
  const answered = plan?.quizTotal ?? 0;
  const correct = plan?.quizCorrect ?? 0;
  const finished = answered >= questionCount;

  const recordAnswer = async (isCorrect: boolean) => {
    if (!sessionId || !cred || !plan || finished) return;
    const updated: StorePlan = {
      ...plan,
      quizCorrect: correct + (isCorrect ? 1 : 0),
      quizTotal: answered + 1,
    };
    setSaving(true);
    try {
      await savePlan(sessionId, cred.storeId, cred.storeToken, updated);
      setPlan(updated);
    } finally {
      setSaving(false);
    }
  };

  const resetAnswers = async () => {
    if (!sessionId || !cred || !plan) return;
    const updated: StorePlan = { ...plan, quizCorrect: 0, quizTotal: 0 };
    setSaving(true);
    try {
      await savePlan(sessionId, cred.storeId, cred.storeToken, updated);
      setPlan(updated);
    } finally {
      setSaving(false);
    }
  };

  if (!sessionId || !cred) {
    return (
      <div className="page-narrow">
        <p>Entre na sessao primeiro.</p>
        <Link to="/entrar">Entrar no jogo</Link>
      </div>
    );
  }

  if (!plan) {
    return <div className="page">Carregando registro de CSAT...</div>;
  }

  const { opsPercent, quizPercent, csat } = csatBreakdown(
    plan.operatorsSales,
    plan.quizCorrect,
    questionCount,
    session?.gameConfig.idealOperators
  );
  const idealOperators = session?.gameConfig.idealOperators ?? 10;

  return (
    <div className="page-narrow">
      <Link to={`/loja?session=${sessionId}`} className="back-link">
        Voltar ao plano
      </Link>
      <h1 className="mt-1">Registro de CSAT</h1>
      <p className="subtitle">
        Marque o resultado da pergunta feita presencialmente pelo facilitador.
      </p>

      <section className="card mb-1">
        <div className="csat-register-head">
          <span>Pergunta {Math.min(answered + 1, questionCount)} de {questionCount}</span>
          <strong>{correct}/{questionCount}</strong>
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
      </section>

      <section className="card mb-1">
        <h3 className="section-title">Calculo do CSAT</h3>
        <div className="csat-breakdown csat-breakdown--light">
          <div className="csat-row">
            <span>Operadores ({plan.operatorsSales} / {idealOperators} ideal)</span>
            <strong>{opsPercent.toFixed(0)}%</strong>
          </div>
          <div className="csat-row">
            <span>Perguntas corretas ({correct}/{questionCount})</span>
            <strong>{quizPercent.toFixed(0)}%</strong>
          </div>
          <div className="csat-row csat-row--total">
            <span>CSAT</span>
            <strong>{csat.toFixed(1)}%</strong>
          </div>
        </div>
        <p className="small-note">
          Formula: operadores / ideal x acertos / perguntas = CSAT.
        </p>
      </section>

      <button type="button" className="btn-secondary btn-block" disabled={saving} onClick={resetAnswers}>
        Reiniciar respostas
      </button>
    </div>
  );
}
