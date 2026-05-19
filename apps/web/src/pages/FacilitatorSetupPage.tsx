import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CapexType, GameConfig, ProductCategory } from "@minha-loja/shared-types";
import { CAPEX_LABELS } from "@minha-loja/shared-types";
import { fetchParams, updateGameConfig } from "../api";
import { useSession } from "../hooks/useSession";

const moneyFields: { key: keyof GameConfig; label: string }[] = [
  { key: "initialCash", label: "Caixa inicial por empresa" },
  { key: "monthlyLicenseBase", label: "Licença mensal base" },
  { key: "maintenanceEquipment", label: "Manutenção sem balança/freezer" },
  { key: "selfCheckoutLicenseEach", label: "Licença por self-checkout" },
  { key: "salarySales", label: "Salário operador de venda" },
  { key: "salaryService", label: "Salário operador de serviço" },
  { key: "roundDemandBase", label: "Demanda base por rodada" },
];

const rateFields: { key: keyof GameConfig; label: string; scale?: number }[] = [
  { key: "interestRateMonth", label: "Juros sobre caixa negativo", scale: 100 },
  { key: "taxRate", label: "Imposto sobre receita", scale: 100 },
  { key: "agingRate", label: "Envelhecimento de estoque", scale: 100 },
  { key: "breakageRate", label: "Quebra/perda operacional", scale: 100 },
  { key: "idealOperators", label: "Operadores ideais para CSAT" },
];

const capexTypes = Object.keys(CAPEX_LABELS) as CapexType[];

function numberValue(value: GameConfig[keyof GameConfig]) {
  return typeof value === "number" ? value : 0;
}

function normalizeCategoryId(name: string, index: number) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `categoria_${index + 1}`
  );
}

export default function FacilitatorSetupPage() {
  const [search] = useSearchParams();
  const sessionId = search.get("session");
  const token =
    search.get("token") ||
    (sessionId ? localStorage.getItem(`facilitator:${sessionId}`) : null);
  const { session, loading } = useSession(sessionId);
  const [draft, setDraft] = useState<GameConfig | null>(null);
  const [defaultConfig, setDefaultConfig] = useState<GameConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");

  useEffect(() => {
    fetchParams().then((params) => setDefaultConfig(params.defaultGameConfig));
  }, []);

  useEffect(() => {
    if (session?.gameConfig) setDraft(session.gameConfig);
  }, [session?.gameConfig]);

  const canEdit = session?.phase === "LOBBY";
  const facilitatorUrl = useMemo(() => {
    if (!sessionId || !token) return "/facilitador";
    return `/facilitador?session=${sessionId}&token=${token}`;
  }, [sessionId, token]);

  const updateNumber = (key: keyof GameConfig, value: number, scale = 1) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value / scale });
  };

  const updateCategory = (
    index: number,
    field: keyof ProductCategory,
    value: string | number
  ) => {
    if (!draft) return;
    setDraft({
      ...draft,
      categories: draft.categories.map((category, i) => {
        if (i !== index) return category;
        const updated = { ...category, [field]: value };
        if (field === "name") {
          updated.id = normalizeCategoryId(String(value), index);
        }
        return updated;
      }),
    });
  };

  const addCategory = () => {
    if (!draft) return;
    const nextIndex = draft.categories.length;
    setDraft({
      ...draft,
      categories: [
        ...draft.categories,
        {
          id: `categoria_${nextIndex + 1}`,
          name: `Categoria ${nextIndex + 1}`,
          unitCost: 10,
          maxAvailable: 30000,
        },
      ],
    });
  };

  const removeCategory = (index: number) => {
    if (!draft || draft.categories.length <= 1) return;
    setDraft({
      ...draft,
      categories: draft.categories.filter((_, i) => i !== index),
    });
  };

  const handleSave = async () => {
    if (!sessionId || !token || !draft) return;
    setSaving(true);
    setMessage("");
    try {
      await updateGameConfig(sessionId, token, draft);
      setTone("success");
      setMessage("Configuração salva.");
    } catch (e) {
      setTone("error");
      setMessage(e instanceof Error ? e.message : "Erro ao salvar configuração.");
    } finally {
      setSaving(false);
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

  if (loading || !session || !draft) {
    return <div className="page">Carregando configuração...</div>;
  }

  return (
    <div className="page facilitator-setup">
      <div className="page-header mb-15">
        <div>
          <span className="badge">PIN {session.pin}</span>
          <h1 className="mt-1">Configuração inicial</h1>
          <p className="subtitle">
            Ajuste os parâmetros antes de liberar a primeira rodada para as empresas.
          </p>
        </div>
        <Link to={facilitatorUrl} className="back-link">
          Painel do facilitador
        </Link>
      </div>

      {!canEdit && (
        <div className="phase-banner">
          A configuração fica bloqueada depois que o jogo sai do lobby.
        </div>
      )}

      <section className="card mb-1">
        <h3 className="section-title">Economia do jogo</h3>
        <div className="config-grid">
          {moneyFields.map((field) => (
            <div className="form-group" key={field.key}>
              <label>{field.label}</label>
              <input
                type="number"
                min={0}
                value={numberValue(draft[field.key])}
                disabled={!canEdit}
                onChange={(e) => updateNumber(field.key, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-1">
        <h3 className="section-title">Taxas e regras</h3>
        <div className="config-grid">
          {rateFields.map((field) => (
            <div className="form-group" key={field.key}>
              <label>{field.label}{field.scale ? " (%)" : ""}</label>
              <input
                type="number"
                min={0}
                step={field.scale ? 0.1 : 1}
                value={numberValue(draft[field.key]) * (field.scale ?? 1)}
                disabled={!canEdit}
                onChange={(e) =>
                  updateNumber(field.key, Number(e.target.value), field.scale)
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-1">
        <h3 className="section-title">Custos de CAPEX</h3>
        <div className="config-grid">
          {capexTypes.map((type) => (
            <div className="form-group" key={type}>
              <label>{CAPEX_LABELS[type]}</label>
              <input
                type="number"
                min={0}
                value={draft.capexCosts[type] ?? 0}
                disabled={!canEdit}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    capexCosts: {
                      ...draft.capexCosts,
                      [type]: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card mb-1">
        <div className="setup-section-heading">
          <h3 className="section-title">Categorias de estoque</h3>
          <button type="button" className="btn-secondary" disabled={!canEdit} onClick={addCategory}>
            + Categoria
          </button>
        </div>
        <div className="config-category-list">
          {draft.categories.map((category, index) => (
            <div className="config-category-row" key={`${category.id}-${index}`}>
              <div className="form-group">
                <label>Nome</label>
                <input
                  value={category.name}
                  disabled={!canEdit}
                  onChange={(e) => updateCategory(index, "name", e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Custo unitário</label>
                <input
                  type="number"
                  min={0}
                  value={category.unitCost}
                  disabled={!canEdit}
                  onChange={(e) => updateCategory(index, "unitCost", Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Disponível máximo</label>
                <input
                  type="number"
                  min={0}
                  value={category.maxAvailable}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateCategory(index, "maxAvailable", Number(e.target.value))
                  }
                />
              </div>
              <button
                type="button"
                className="btn-secondary config-remove-btn"
                disabled={!canEdit || draft.categories.length <= 1}
                onClick={() => removeCategory(index)}
                aria-label={`Remover ${category.name}`}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="actions">
        <button className="btn-primary" onClick={handleSave} disabled={saving || !canEdit}>
          {saving ? "Salvando..." : "Salvar configuração"}
        </button>
        {defaultConfig && (
          <button
            type="button"
            className="btn-secondary"
            disabled={!canEdit}
            onClick={() => setDraft(defaultConfig)}
          >
            Restaurar padrão
          </button>
        )}
        <Link to={facilitatorUrl}>
          <button className="btn-secondary">Continuar</button>
        </Link>
      </div>
      {message && (
        <p className={tone === "success" ? "status-success" : "status-error"}>{message}</p>
      )}
    </div>
  );
}
