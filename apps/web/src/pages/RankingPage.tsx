import { useSearchParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import KahootRanking from "../components/KahootRanking";
import { PHASE_LABELS } from "../constants";

export default function RankingPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const { session, loading } = useSession(sessionId);

  if (!sessionId) {
    return <div className="kahoot-screen">Sessao invalida</div>;
  }

  if (loading || !session) {
    return (
      <div className="kahoot-screen kahoot-screen--loading">
        <p className="kahoot-title">Carregando ranking...</p>
      </div>
    );
  }

  if (session.phase !== "FINAL" || session.finalRanking.length === 0) {
    return (
      <div className="kahoot-screen kahoot-screen--lobby">
        <div className="kahoot-header">
          <p className="kahoot-brand">Minha Loja</p>
          <p className="pin-display kahoot-pin">{session.pin}</p>
          <p className="kahoot-title">Ranking disponivel apenas no final</p>
          <p className="kahoot-subtitle">{PHASE_LABELS[session.phase]}</p>
        </div>
      </div>
    );
  }

  return (
    <KahootRanking
      title="Ranking final"
      subtitle={`${PHASE_LABELS[session.phase]} - PIN ${session.pin}`}
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
