import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../hooks/useSession";
import { advancePhase } from "../api";
import { PHASE_LABELS, NEXT_PHASE_HINT } from "../constants";
import type { GamePhase } from "@minha-loja/shared-types";

export default function FacilitatorPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const token =
    search.get("token") ||
    (sessionId ? localStorage.getItem(`facilitator:${sessionId}`) : null);
  const { session, loading } = useSession(sessionId);
  const [advancing, setAdvancing] = useState(false);

  const handleAdvance = async () => {
    if (!sessionId || !token) return;
    setAdvancing(true);
    try {
      await advancePhase(sessionId, token);
    } finally {
      setAdvancing(false);
    }
  };

  if (!sessionId || !token) {
    return (
      <div className="page-narrow">
        <p>Acesso de facilitador inválido.</p>
        <Link to="/">Voltar</Link>
      </div>
    );
  }

  if (loading || !session) {
    return <div className="page">Carregando painel...</div>;
  }

  const submitted = session.stores.filter((s) => s.planSubmitted).length;
  const phase = session.phase as GamePhase;
  const canAdvance = phase !== "FINAL";

  return (
    <div className="page">
      <h1>Painel do facilitador</h1>
      <p className="subtitle">Controle as rodadas — qualquer número de empresas</p>

      <div className="card card-soft mb-15 centered">
        <p className="muted">PIN para as empresas</p>
        <p className="pin-display">{session.pin}</p>
        <div className="facilitator-links">
          <Link to={`/telao?session=${sessionId}`}>Telão (ranking Kahoot)</Link>
          <Link to={`/ranking?session=${sessionId}`}>Ranking em tela cheia</Link>
        </div>
      </div>

      <div className="phase-banner">
        <strong>Fase atual:</strong> {PHASE_LABELS[phase]}
        {NEXT_PHASE_HINT[phase] && (
          <p className="hint">
            Próximo: {NEXT_PHASE_HINT[phase]}
          </p>
        )}
      </div>

      <div className="card mb-1">
        <h3 className="section-title">
          Empresas ({session.stores.length})
        </h3>
        {session.stores.length === 0 ? (
          <p className="muted">
            Nenhuma empresa entrou ainda. Compartilhe o PIN — não há mínimo para iniciar.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Representante</th>
                <th>Plano</th>
              </tr>
            </thead>
            <tbody>
              {session.stores.map((s) => (
                <tr key={s.id}>
                  <td>{s.companyName}</td>
                  <td>{s.playerName}</td>
                  <td>{s.planSubmitted ? "✓ Enviado" : "Pendente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(phase === "CONFIG_1" || phase === "CONFIG_2") && (
          <p className="small-note">
            Planos enviados: {submitted} / {session.stores.length} (rodada usa só quem enviou)
          </p>
        )}
      </div>

      {session.roundResults.length > 0 && (
        <div className="card mb-1">
          <h3 className="section-title">Última rodada</h3>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Demanda %</th>
                <th>EBITDA %</th>
              </tr>
            </thead>
            <tbody>
              {session.roundResults[session.roundResults.length - 1].stores.map((r) => (
                <tr key={r.storeId}>
                  <td>{r.companyName}</td>
                  <td>{r.demandShare.toFixed(1)}%</td>
                  <td>{r.ebitdaPercent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {session.finalRanking.length > 0 && (
        <div className="card mb-1">
          <h3>🏆 Ranking final</h3>
          <ol className="list-ranking">
            {session.finalRanking.map((r, i) => (
              <li key={r.storeId} className={i === 0 ? "rank-1" : ""}>
                {r.companyName} — {r.ebitdaPercent.toFixed(1)}%
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="actions">
        {canAdvance && (
          <button className="btn-primary" onClick={handleAdvance} disabled={advancing}>
            {advancing ? "Avançando..." : "Avançar fase"}
          </button>
        )}
        <Link to="/">
          <button className="btn-secondary">Início</button>
        </Link>
      </div>
    </div>
  );
}
