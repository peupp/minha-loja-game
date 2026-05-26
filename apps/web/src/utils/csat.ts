/** Quadro ideal de operadores de venda (documento Minha Loja) */
export const IDEAL_OPERATORS = 10;

export function calcCsat(
  operatorsSales: number,
  quizCorrect: number,
  quizTotal: number,
  idealOperators = IDEAL_OPERATORS
): number {
  const opsRatio = Math.min(operatorsSales / idealOperators, 1);
  const quizRatio = quizTotal > 0 ? quizCorrect / quizTotal : 0;
  return opsRatio * quizRatio * 100;
}

export function csatBreakdown(
  operatorsSales: number,
  quizCorrect: number,
  quizTotal: number,
  idealOperators = IDEAL_OPERATORS
) {
  const opsPercent = Math.min(operatorsSales / idealOperators, 1) * 100;
  const quizPercent = quizTotal > 0 ? (quizCorrect / quizTotal) * 100 : 0;
  const csat = (opsPercent / 100) * (quizPercent / 100) * 100;
  return { opsPercent, quizPercent, csat };
}
