import { useSearchParams, Link } from "react-router-dom";
import { useState } from "react";
import { useSession } from "../hooks/useSession";
import { useFinalRedirect } from "../hooks/useFinalRedirect";
import { advancePhase } from "../api";
import { PHASE_LABELS, NEXT_PHASE_HINT } from "../constants";
import {
  CAPEX_LABELS,
  type GamePhase,
  type RoundEventImpact,
  type RoundEventType,
} from "@minha-loja/shared-types";

const ROUND_EVENT_LABELS = CAPEX_LABELS;
const EVENT_TYPES = Object.keys(ROUND_EVENT_LABELS) as RoundEventType[];
const DEFAULT_EVENT_DAYS = 3;
const emptyEventDays = () =>
  Object.fromEntries(EVENT_TYPES.map((type) => [type, 0])) as Record<RoundEventType, number>;

export default function FacilitatorPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const token =
    search.get("token") ||
    (sessionId ? localStorage.getItem(`facilitator:${sessionId}`) : null);
  const { session, loading } = useSession(sessionId);
  useFinalRedirect(sessionId, session);
  const [advancing, setAdvancing] = useState(false);
  const [eventDaysByType, setEventDaysByType] =
    useState<Record<RoundEventType, number>>(emptyEventDays);

  const handleAdvance = async () => {
    if (!sessionId || !token) return;
    setAdvancing(true);
    try {
      const shouldApplyEvent = session?.phase === "CONFIG_1" || session?.phase === "CONFIG_2";
      await advancePhase(
        sessionId,
        token,
        shouldApplyEvent
          ? EVENT_TYPES.map((type) => ({
              type,
              days: eventDaysByType[type],
            })).filter((event) => event.days > 0)
          : []
      );
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
  const canConfigureEvent = phase === "CONFIG_1" || phase === "CONFIG_2";
  const setupUrl = `/facilitador/configuracao?session=${sessionId}&token=${token}`;
  const selectedEventsCount = EVENT_TYPES.filter((type) => eventDaysByType[type] > 0).length;
  const lastRound = session.roundResults[session.roundResults.length - 1];

  const setEventDays = (type: RoundEventType, days: number) => {
    setEventDaysByType((current) => ({
      ...current,
      [type]: Math.min(Math.max(days, 0), 30),
    }));
  };
  const money = (value: number) =>
    value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  const eventLossBase = (impact: RoundEventImpact, finalRevenue: number) =>
    impact.revenueBeforeLoss ?? finalRevenue + impact.revenueLoss;
  const lastRoundLossRows =
    lastRound?.stores
      .map((store) => ({
        store,
        impacts: (store.eventImpacts ?? (store.eventImpact ? [store.eventImpact] : [])).filter(
          (impact) => !impact.protectedByCapex && impact.revenueLoss > 0
        ),
      }))
      .filter((row) => row.impacts.length > 0) ?? [];
  const totalStoreLoss = (impacts: RoundEventImpact[]) =>
    impacts.reduce((total, impact) => total + impact.revenueLoss, 0);
  const formatLossFormula = (impact: RoundEventImpact, finalRevenue: number) => {
    const base = eventLossBase(impact, finalRevenue);
    const percent = impact.lossPercent ?? (base > 0 ? impact.revenueLoss / base : 0);
    return {
      base,
      percent,
      loss: impact.revenueLoss,
    };
  };

  return (
    <div className="page">
      <h1>Painel do facilitador</h1>
      <p className="subtitle">Controle as rodadas — qualquer número de empresas</p>

      <div className="card card-soft mb-15 centered">
        <p className="muted">PIN para as empresas</p>
        <p className="pin-display">{session.pin}</p>
        <div className="facilitator-links">
          <Link to={setupUrl}>Configuração inicial</Link>
        </div>
      </div>

      {phase === "LOBBY" && (
        <div className="phase-banner">
          Revise a configuração inicial antes de avançar para a primeira rodada.
          <p className="hint">
            Caixa inicial: R$ {session.gameConfig.initialCash.toLocaleString("pt-BR")} · Demanda
            base: R$ {session.gameConfig.roundDemandBase.toLocaleString("pt-BR")}
          </p>
        </div>
      )}

      <div className="phase-banner">
        <strong>Fase atual:</strong> {PHASE_LABELS[phase]}
        {NEXT_PHASE_HINT[phase] && (
          <p className="hint">
            Próximo: {NEXT_PHASE_HINT[phase]}
          </p>
        )}
      </div>

      {canConfigureEvent && (
        <div className="card mb-1 event-control">
          <div className="event-control-head">
            <div>
              <h3 className="section-title">Eventos da rodada</h3>
              <p className="small-note">
                Escolha um ou mais riscos para testar se o CAPEX aprovado protegeu cada loja.
              </p>
            </div>
            <span className="badge">{selectedEventsCount} selecionado(s)</span>
          </div>
          <div className="event-list">
            {EVENT_TYPES.map((type) => {
              const days = eventDaysByType[type];
              const enabled = days > 0;
              return (
                <div key={type} className="event-row">
                  <label className="event-toggle">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        setEventDays(type, e.target.checked ? DEFAULT_EVENT_DAYS : 0)
                      }
                    />
                    {ROUND_EVENT_LABELS[type]}
                  </label>
                  <div className="form-group">
                    <label>Dias</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={days}
                      disabled={!enabled}
                      onChange={(e) => setEventDays(type, Number(e.target.value))}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {selectedEventsCount > 0 && (
            <p className="hint">
              Ao avançar, cada loja perde vendas nos eventos em que não tiver o CAPEX
              correspondente.
            </p>
          )}
        </div>
      )}

      <div className="card mb-1">
        <h3 className="section-title">
          Empresas ({session.stores.length})
        </h3>
        <p className="small-note mb-1">
          Acompanha quem entrou na partida, quem já enviou o plano e permite registrar o CSAT de
          cada empresa.
        </p>
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
                <th>CSAT</th>
                <th>Plano</th>
              </tr>
            </thead>
            <tbody>
              {session.stores.map((s) => (
                <tr key={s.id}>
                  <td>{s.companyName}</td>
                  <td>{s.playerName}</td>
                  <td>
                    <Link to={`/quiz?session=${sessionId}&store=${s.id}&token=${token}`}>
                      Registrar CSAT
                    </Link>
                    {s.planSubmitted && (
                      <span className="small-note csat-inline-status">
                        {s.planSubmitted.quizCorrect}/{session.gameConfig.questionCount}
                      </span>
                    )}
                  </td>
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

      {lastRound && (
        <div className="card mb-1">
          <h3 className="section-title">Última rodada</h3>
          <p className="small-note mb-1">
            Mostra o desempenho de cada empresa na rodada encerrada e o impacto dos eventos
            aplicados.
          </p>
          {(lastRound.events?.length ?? (lastRound.event ? 1 : 0)) > 0 && (
            <p className="small-note mb-1">
              Eventos aplicados:{" "}
              {(lastRound.events ?? (lastRound.event ? [lastRound.event] : []))
                .map((event) => `${ROUND_EVENT_LABELS[event.type]} (${event.days} dia(s))`)
                .join(", ")}
            </p>
          )}
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Demanda %</th>
                <th>EBITDA %</th>
                <th>Perdas por evento</th>
              </tr>
            </thead>
            <tbody>
              {lastRound.stores.map((r) => (
                <tr key={r.storeId}>
                  <td>{r.companyName}</td>
                  <td>{r.demandShare.toFixed(1)}%</td>
                  <td>{r.ebitdaPercent.toFixed(1)}%</td>
                  <td>
                    {money(
                      (r.eventImpacts ?? (r.eventImpact ? [r.eventImpact] : []))
                        .filter((impact) => !impact.protectedByCapex)
                        .reduce((total, impact) => total + impact.revenueLoss, 0)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {lastRoundLossRows.length > 0 && (
            <div className="facilitator-loss-section">
              <h3 className="section-title">Perdas por CAPEX não selecionado</h3>
              <p className="small-note mb-1">
                Detalha a conta de quanto cada empresa deixou de vender nos eventos em que não
                tinha o CAPEX correspondente.
              </p>
              <div className="facilitator-loss-grid">
                {lastRoundLossRows.map(({ store, impacts }) => (
                  <div className="facilitator-loss-card" key={store.storeId}>
                    <div className="facilitator-loss-card-head">
                      <strong>{store.companyName}</strong>
                      <span className="badge">Perda total {money(totalStoreLoss(impacts))}</span>
                    </div>
                    <div className="facilitator-loss-list">
                      {impacts.map((impact) => {
                        const formula = formatLossFormula(impact, store.revenue);
                        return (
                          <div className="facilitator-loss-item" key={impact.eventType}>
                            <div className="facilitator-loss-label">
                              <strong>{impact.eventLabel}</strong>
                              <span>{impact.affectedDays} dia(s) sem CAPEX correspondente</span>
                            </div>
                            <div className="facilitator-loss-formula">
                              <span>{money(formula.base)}</span>
                              <span>x</span>
                              <span>{(formula.percent * 100).toFixed(1)}%</span>
                              <span>=</span>
                              <strong>{money(formula.loss)}</strong>
                            </div>
                            <p className="small-note">{impact.note}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {session.finalRanking.length > 0 && (
        <div className="card mb-1">
          <h3>🏆 Ranking final</h3>
          <p className="small-note mb-1">
            Classificação final das empresas pelo resultado financeiro acumulado na partida.
          </p>
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

