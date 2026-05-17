import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { StorePlan } from "@minha-loja/shared-types";
import { QUIZ_QUESTIONS, QUIZ_TOTAL } from "../data/quizQuestions";
import { savePlan } from "../api";
import { csatBreakdown } from "../utils/csat";

const OPTION_SHAPES = ["▲", "◆", "●", "■"];
const OPTION_CLASSES = [
  "kahoot-opt kahoot-opt--red",
  "kahoot-opt kahoot-opt--blue",
  "kahoot-opt kahoot-opt--yellow",
  "kahoot-opt kahoot-opt--green",
];

interface StoreCred {
  storeId: string;
  storeToken: string;
  companyName: string;
  playerName: string;
}

export default function QuizPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const [cred, setCred] = useState<StoreCred | null>(null);
  const [plan, setPlan] = useState<StorePlan | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
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

  const current = QUIZ_QUESTIONS[step];

  const finishQuiz = async (allAnswers: number[]) => {
    if (!sessionId || !cred || !plan) return;
    const correct = allAnswers.filter(
      (a, i) => a === QUIZ_QUESTIONS[i].correctIndex
    ).length;
    const updated: StorePlan = {
      ...plan,
      quizCorrect: correct,
      quizTotal: QUIZ_TOTAL,
    };
    setSaving(true);
    try {
      await savePlan(sessionId, cred.storeId, cred.storeToken, updated);
      setPlan(updated);
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (selected !== null || !current) return;
    setSelected(optionIndex);
    const nextAnswers = [...answers, optionIndex];
    setTimeout(() => {
      if (step + 1 >= QUIZ_QUESTIONS.length) {
        finishQuiz(nextAnswers);
      } else {
        setAnswers(nextAnswers);
        setStep(step + 1);
        setSelected(null);
      }
    }, 700);
  };

  if (!sessionId || !cred) {
    return (
      <div className="page-narrow">
        <p>Entre na sessão primeiro.</p>
        <Link to="/entrar">Entrar no jogo</Link>
      </div>
    );
  }

  if (done && plan) {
    const { opsPercent, quizPercent, csat } = csatBreakdown(
      plan.operatorsSales,
      plan.quizCorrect,
      plan.quizTotal
    );
    return (
      <div className="kahoot-quiz-screen">
        <div className="kahoot-quiz-result">
          <p className="kahoot-brand">Questionário concluído</p>
          <h1 className="kahoot-quiz-score">
            {plan.quizCorrect}/{plan.quizTotal}
          </h1>
          <p className="kahoot-quiz-score-label">respostas corretas</p>

          <div className="csat-breakdown">
            <div className="csat-row">
              <span>Operadores ({plan.operatorsSales} / 10 ideal)</span>
              <strong>{opsPercent.toFixed(0)}%</strong>
            </div>
            <div className="csat-row">
              <span>Questionário ({plan.quizCorrect}/{plan.quizTotal})</span>
              <strong>{quizPercent.toFixed(0)}%</strong>
            </div>
            <div className="csat-row csat-row--total">
              <span>CSAT da loja</span>
              <strong>{csat.toFixed(1)}%</strong>
            </div>
            <p className="csat-formula">
              {opsPercent.toFixed(0)}% × {quizPercent.toFixed(0)}% = {csat.toFixed(1)}% CSAT
            </p>
          </div>

          <div className="kahoot-quiz-actions">
            <Link to={`/loja?session=${sessionId}`}>
              <button className="btn-primary btn-block">Voltar ao plano da loja</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!plan || !current) {
    return <div className="kahoot-quiz-screen">Carregando quiz…</div>;
  }

  return (
    <div className="kahoot-quiz-screen">
      <div className="kahoot-quiz-top">
        <span>{cred.companyName}</span>
        <span>
          {step + 1} / {QUIZ_TOTAL}
        </span>
      </div>

      <div className="kahoot-quiz-question-wrap">
        <h1 className="kahoot-quiz-question">{current.question}</h1>
      </div>

      <div className="kahoot-quiz-options">
        {current.options.map((opt, i) => (
          <button
            key={i}
            type="button"
            className={`${OPTION_CLASSES[i]} ${selected === i ? "kahoot-opt--picked" : ""} ${
              selected !== null && i === current.correctIndex ? "kahoot-opt--correct" : ""
            } ${
              selected !== null &&
              selected === i &&
              i !== current.correctIndex
                ? "kahoot-opt--wrong"
                : ""
            }`}
            disabled={selected !== null || saving}
            onClick={() => handleAnswer(i)}
          >
            <span className="kahoot-opt-shape">{OPTION_SHAPES[i]}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>

      <p className="kahoot-quiz-hint">
        <Link to={`/loja?session=${sessionId}`} className="kahoot-quiz-back">
          ← Plano da loja
        </Link>
      </p>
    </div>
  );
}
