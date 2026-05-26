import { useSearchParams, Link } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import KahootRanking from "../components/KahootRanking";
import { PHASE_LABELS } from "../constants";

export default function DisplayPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const { session, loading } = useSession(sessionId);

  if (!sessionId) {
    return <div className="kahoot-screen">Sessao invalida</div>;
  }

  if (loading || !session) {
    return (
      <div className="kahoot-screen kahoot-screen--loading">
        <p className="pin-display kahoot-pin">...</p>
      </div>
    );
  }

  if (session.phase === "FINAL" && session.finalRanking.length > 0) {
    return (
      <KahootRanking
        title="Campeoes"
        subtitle={`PIN ${session.pin} - ${PHASE_LABELS[session.phase]}`}
        entries={session.finalRanking.map((r) => ({
          id: r.storeId,
          name: r.companyName,
          score: r.ebitdaPercent,
        }))}
        valueSuffix="% EBITDA"
        showPodium
      />
    );
  }

  return (
    <div className="kahoot-screen kahoot-screen--lobby">
      <div className="kahoot-header">
        <p className="kahoot-brand">Minha Loja</p>
        <p className="pin-display kahoot-pin">{session.pin}</p>
        <p className="kahoot-subtitle">{PHASE_LABELS[session.phase]}</p>
      </div>
      <div className="kahoot-lobby-card">
        <h2>Empresas na sala ({session.stores.length})</h2>
        <ul className="kahoot-lobby-list">
          {session.stores.map((s, i) => (
            <li key={s.id} style={{ animationDelay: `${i * 120}ms` }}>
              <span className="kahoot-lobby-rank">{i + 1}</span>
              {s.companyName}
              <span className="kahoot-lobby-status">{s.planSubmitted ? "OK" : "..."}</span>
            </li>
          ))}
        </ul>
        {session.stores.length === 0 && (
          <p className="kahoot-empty">Aguardando empresas entrarem com o PIN...</p>
        )}
      </div>
      <p className="kahoot-lobby-footer">
        <Link to={`/ranking?session=${sessionId}`}>Ranking final</Link>
      </p>
    </div>
  );
}
