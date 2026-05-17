import { useSearchParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import KahootRanking from "../components/KahootRanking";
import { PHASE_LABELS } from "../constants";

export default function RankingPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const { session, loading } = useSession(sessionId);

  if (!sessionId) {
    return <div className="kahoot-screen">Sessão inválida</div>;
  }

  if (loading || !session) {
    return (
      <div className="kahoot-screen kahoot-screen--loading">
        <p className="kahoot-title">Carregando ranking…</p>
      </div>
    );
  }

  const isFinal = session.finalRanking.length > 0;
  const lastRound = session.roundResults[session.roundResults.length - 1];

  if (isFinal) {
    return (
      <KahootRanking
        title="🏆 Ranking final"
        subtitle={`${PHASE_LABELS[session.phase]} · PIN ${session.pin}`}
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

  if (lastRound) {
    return (
      <KahootRanking
        title={`Rodada ${lastRound.round}`}
        subtitle="Participação na demanda de vendas"
        entries={[...lastRound.stores]
          .sort((a, b) => b.demandShare - a.demandShare)
          .map((r) => ({
            id: r.storeId,
            name: r.companyName,
            score: r.demandShare,
          }))}
        valueSuffix="% demanda"
        showPodium={lastRound.stores.length >= 3}
      />
    );
  }

  return (
    <KahootRanking
      title="Aguardando rodada"
      subtitle={`PIN ${session.pin} · ${PHASE_LABELS[session.phase]}`}
      entries={session.stores.map((s) => ({
        id: s.id,
        name: s.companyName,
        score: 0,
      }))}
      valueSuffix="%"
    />
  );
}
