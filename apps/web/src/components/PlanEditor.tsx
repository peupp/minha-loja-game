import type { StorePlan, CapexType } from "@minha-loja/shared-types";
import { CAPEX_LABELS } from "@minha-loja/shared-types";
import { csatBreakdown } from "../utils/csat";

interface Params {
  categories: { id: string; name: string; unitCost: number; maxAvailable: number }[];
  initialCash: number;
  capexCosts: Record<string, number>;
  idealOperators?: number;
  questionCount?: number;
}

interface Props {
  plan: StorePlan;
  onChange: (plan: StorePlan) => void;
  params: Params;
  budgetInitialCash?: number;
  includeCapexInBudget?: boolean;
  readOnly?: boolean;
  sessionId?: string;
}

export default function PlanEditor({
  plan,
  onChange,
  params,
  budgetInitialCash = params.initialCash,
  includeCapexInBudget = true,
  readOnly,
}: Props) {
  const { opsPercent, quizPercent, csat } = csatBreakdown(
    plan.operatorsSales,
    plan.quizCorrect,
    params.questionCount ?? plan.quizTotal,
    params.idealOperators
  );
  const questionCount = Math.max(params.questionCount ?? plan.quizTotal, 1);
  const quizDone = plan.quizTotal >= questionCount;
  const inventoryCost = plan.categories.reduce((total, cat) => {
    const meta = params.categories.find((c) => c.id === cat.categoryId);
    return total + (meta?.unitCost ?? 0) * cat.quantity;
  }, 0);
  const capexCost = includeCapexInBudget
    ? plan.capex.reduce(
        (total, item) =>
          item.approved ? total + (params.capexCosts[item.type] ?? 0) : total,
        0
      )
    : 0;
  const cashRemaining = budgetInitialCash - inventoryCost - capexCost;
  const moneyFormat = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

  const toggleCapex = (type: CapexType) => {
    if (readOnly) return;
    onChange({
      ...plan,
      capex: plan.capex.map((c) =>
        c.type === type ? { ...c, approved: !c.approved } : c
      ),
    });
  };

  const updateCategory = (
    categoryId: string,
    field: "quantity" | "marginPercent",
    value: number
  ) => {
    if (readOnly) return;
    onChange({
      ...plan,
      categories: plan.categories.map((c) =>
        c.categoryId === categoryId ? { ...c, [field]: value } : c
      ),
    });
  };

  return (
    <div className="plan-editor">
      <section
        className={`cash-highlight ${cashRemaining < 0 ? "cash-highlight--negative" : ""}`}
        aria-live="polite"
      >
        <div>
          <span className="cash-highlight-label">Dinheiro restante</span>
          <strong>{moneyFormat.format(cashRemaining)}</strong>
        </div>
        <div className="cash-highlight-breakdown">
          <span>Inicial: {moneyFormat.format(budgetInitialCash)}</span>
          <span>Estoque: {moneyFormat.format(inventoryCost)}</span>
          {includeCapexInBudget && <span>CAPEX: {moneyFormat.format(capexCost)}</span>}
        </div>
      </section>

      <section className="card mb-1 card-csat">
        <h3 className="section-title">CSAT — nível de serviço</h3>
        <p className="small-note mb-1">
          CSAT = operadores (ideal {params.idealOperators ?? 10}) x acertos nas perguntas
          presenciais do facilitador.
        </p>
        <div className="csat-preview">
          <div className="csat-preview-item">
            <span>Operadores de venda</span>
            <label className="sr-only">Operadores de venda</label>
            <input
              type="number"
              min={0}
              max={30}
              value={plan.operatorsSales}
              disabled={readOnly}
              onChange={(e) =>
                onChange({ ...plan, operatorsSales: Number(e.target.value) })
              }
            />
            <strong>{opsPercent.toFixed(0)}%</strong>
          </div>
          <div className="csat-preview-item">
            <span>Perguntas presenciais</span>
            {quizDone ? (
              <strong>
                {plan.quizCorrect}/{questionCount} ({quizPercent.toFixed(0)}%)
              </strong>
            ) : (
              <span className="muted">Pendente</span>
            )}
          </div>
          <div className="csat-preview-total">
            <span>CSAT</span>
            <strong>{csat.toFixed(1)}%</strong>
          </div>
        </div>
      </section>

      <section className="card mb-1">
        <h3 className="section-title">CAPEX</h3>
        <div className="capex-grid">
          {plan.capex.map((item) => (
            <label key={item.type} className="capex-item">
              <input
                type="checkbox"
                checked={item.approved}
                disabled={readOnly}
                onChange={() => toggleCapex(item.type)}
              />
              <span>
                {CAPEX_LABELS[item.type]} — R${" "}
                {(params.capexCosts[item.type] ?? 0).toLocaleString("pt-BR")}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="card mb-1">
        <h3 className="section-title">Estoque e margem</h3>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Disponível</th>
              <th>Qtd</th>
              <th>Margem %</th>
            </tr>
          </thead>
          <tbody>
            {plan.categories.map((cat) => {
              const meta = params.categories.find((c) => c.id === cat.categoryId);
              return (
                <tr key={cat.categoryId}>
                  <td>
                    {meta?.name ?? cat.categoryId}
                    <br />
                    <small className="muted">custo R$ {meta?.unitCost}</small>
                  </td>
                  <td>
                    <strong>{Math.max((meta?.maxAvailable ?? 0) - cat.quantity, 0).toLocaleString("pt-BR")}</strong>
                    <br />
                    <small className="muted">
                      de {(meta?.maxAvailable ?? 0).toLocaleString("pt-BR")}
                    </small>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={meta?.maxAvailable}
                      value={cat.quantity}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateCategory(cat.categoryId, "quantity", Number(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={cat.marginPercent}
                      disabled={readOnly}
                      onChange={(e) =>
                        updateCategory(
                          cat.categoryId,
                          "marginPercent",
                          Number(e.target.value)
                        )
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card mb-1">
        <h3 className="section-title">Operadores de serviço</h3>
        <div className="form-group">
          <label>Operadores de serviço (SLA)</label>
          <input
            type="number"
            min={0}
            max={20}
            value={plan.operatorsService}
            disabled={readOnly}
            onChange={(e) =>
              onChange({ ...plan, operatorsService: Number(e.target.value) })
            }
          />
        </div>
        <p className="small-note">
          Caixa inicial: R$ {params.initialCash.toLocaleString("pt-BR")} — estoque e CAPEX na 1ª
          configuração.
        </p>
      </section>
    </div>
  );
}

