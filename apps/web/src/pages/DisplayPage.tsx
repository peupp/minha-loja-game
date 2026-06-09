import { Link, useSearchParams } from "react-router-dom";
import type { Store, StorePlan } from "@minha-loja/shared-types";
import { CAPEX_LABELS } from "@minha-loja/shared-types";
import { useSession } from "../hooks/useSession";
import KahootRanking from "../components/KahootRanking";
import { PHASE_LABELS } from "../constants";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function StoreChoicesCard({
  store,
  plan,
  categories,
}: {
  store: Store;
  plan: StorePlan | null;
  categories: { id: string; name: string; unitCost: number }[];
}) {
  if (!plan) {
    return (
      <article className="kahoot-choice-card">
        <div className="kahoot-choice-head">
          <h3>{store.companyName}</h3>
          <span>Sem plano enviado</span>
        </div>
        <p className="kahoot-choice-muted">
          Esta empresa entrou no jogo, mas não possui escolhas registradas para exibir.
        </p>
      </article>
    );
  }

  const approvedCapex = plan.capex.filter((item) => item.approved);
  const inventoryCost = plan.categories.reduce((total, item) => {
    const category = categories.find((cat) => cat.id === item.categoryId);
    return total + (category?.unitCost ?? 0) * item.quantity;
  }, 0);

  return (
    <article className="kahoot-choice-card">
      <div className="kahoot-choice-head">
        <h3>{store.companyName}</h3>
        <span>{store.playerName}</span>
      </div>

      <div className="kahoot-choice-summary">
        <div>
          <span>Operadores venda</span>
          <strong>{plan.operatorsSales}</strong>
        </div>
        <div>
          <span>Operadores serviço</span>
          <strong>{plan.operatorsService}</strong>
        </div>
        <div>
          <span>CSAT perguntas</span>
          <strong>
            {plan.quizCorrect}/{plan.quizTotal}
          </strong>
        </div>
        <div>
          <span>Estoque comprado</span>
          <strong>{formatMoney(inventoryCost)}</strong>
        </div>
      </div>

      <div className="kahoot-choice-block">
        <h4>CAPEX escolhidos</h4>
        {approvedCapex.length > 0 ? (
          <div className="kahoot-choice-tags">
            {approvedCapex.map((item) => (
              <span key={item.type}>{CAPEX_LABELS[item.type]}</span>
            ))}
          </div>
        ) : (
          <p className="kahoot-choice-muted">Nenhum CAPEX selecionado.</p>
        )}
      </div>

      <div className="kahoot-choice-block">
        <h4>Estoque e margem</h4>
        <div className="kahoot-choice-table">
          {plan.categories.map((item) => {
            const category = categories.find((cat) => cat.id === item.categoryId);
            return (
              <div className="kahoot-choice-row" key={item.categoryId}>
                <span>{category?.name ?? item.categoryId}</span>
                <strong>
                  {item.quantity.toLocaleString("pt-BR")} un. · {item.marginPercent}% margem
                </strong>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function DisplayPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const { session, loading } = useSession(sessionId);

  if (!sessionId) {
    return <div className="kahoot-screen">Sessão inválida</div>;
  }

  if (loading || !session) {
    return (
      <div className="kahoot-screen kahoot-screen--loading">
        <p className="pin-display kahoot-pin">...</p>
      </div>
    );
  }

  if (session.phase === "FINAL" && session.finalRanking.length > 0) {
    const rankedStoreIds = new Set(session.finalRanking.map((entry) => entry.storeId));
    const storesByRanking = [
      ...session.finalRanking
        .map((entry) => session.stores.find((store) => store.id === entry.storeId))
        .filter((store): store is Store => Boolean(store)),
      ...session.stores.filter((store) => !rankedStoreIds.has(store.id)),
    ];

    return (
      <KahootRanking
        title="Campeões"
        subtitle={`PIN ${session.pin} - ${PHASE_LABELS[session.phase]}`}
        entries={session.finalRanking.map((r) => ({
          id: r.storeId,
          name: r.companyName,
          score: r.ebitdaPercent,
        }))}
        valueSuffix="% EBITDA"
        showPodium
      >
        <Link to="/" className="kahoot-home-button kahoot-home-button--final">
          Voltar ao início
        </Link>
        <section className="kahoot-choices-section">
          <div className="kahoot-choices-header">
            <h2>Escolhas das empresas</h2>
            <p>
              Plano enviado por cada empresa: CAPEX, operadores, CSAT, estoque comprado e margem.
            </p>
          </div>
          <div className="kahoot-choices-grid">
            {storesByRanking.map((store) => (
              <StoreChoicesCard
                key={store.id}
                store={store}
                plan={store.planSubmitted}
                categories={session.gameConfig.categories}
              />
            ))}
          </div>
        </section>
      </KahootRanking>
    );
  }

  return (
    <div className="kahoot-screen kahoot-screen--lobby">
      <Link to="/" className="kahoot-home-button">
        Voltar ao início
      </Link>
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
    </div>
  );
}
