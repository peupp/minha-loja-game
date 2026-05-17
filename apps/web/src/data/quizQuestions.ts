/**
 * Perguntas do quiz — edite aqui antes do evento (não usa banco de dados).
 * Alinhe com o conteúdo discutido presencialmente com os participantes.
 */
export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "1",
    question: "O que é EBITDA no contexto da loja?",
    options: [
      "Lucro antes de juros, impostos, depreciação e amortização",
      "Receita total de vendas do mês",
      "Valor do estoque em armazém",
      "Custo fixo de folha de pagamento",
    ],
    correctIndex: 0,
  },
  {
    id: "2",
    question: "Qual indicador mede a satisfação do cliente na simulação?",
    options: ["CSAT", "CAPEX", "Aging", "SLA de rede"],
    correctIndex: 0,
  },
  {
    id: "3",
    question: "O que significa 'disponibilidade' para a escolha da loja pelo cliente?",
    options: [
      "Proporção do estoque comprado em relação ao máximo possível",
      "Número de funcionários no caixa",
      "Valor gasto em marketing digital",
      "Quantidade de lojas no shopping",
    ],
    correctIndex: 0,
  },
  {
    id: "4",
    question: "Para melhorar o CSAT, além do quiz, a loja deve considerar:",
    options: [
      "Quantidade de operadores de venda (quadro ideal: 10)",
      "Apenas o preço mais baixo possível",
      "Eliminar todo o estoque",
      "Não investir em CAPEX",
    ],
    correctIndex: 0,
  },
  {
    id: "5",
    question: "Como a demanda de vendas é distribuída entre as lojas?",
    options: [
      "Proporcional ao ranking em preço da cesta, disponibilidade e CSAT",
      "Igual para todas, sempre",
      "Somente por ordem de cadastro",
      "Apenas pelo tamanho da empresa",
    ],
    correctIndex: 0,
  },
  {
    id: "6",
    question: "O que acontece com estoque não vendido ao final?",
    options: [
      "Pode gerar custos de aging e quebra",
      "Vira caixa automaticamente",
      "É transferido para outra loja",
      "Não tem impacto financeiro",
    ],
    correctIndex: 0,
  },
  {
    id: "7",
    question: "O CAPEX de Segurança (ciber) ajuda a evitar:",
    options: [
      "Parada da operação por ataque sem proteção",
      "Aumento da margem de todos os produtos",
      "Redução do número de clientes",
      "Custo de estoque perecível",
    ],
    correctIndex: 0,
  },
  {
    id: "8",
    question: "Na 2ª configuração, é permitido usar para recompras:",
    options: [
      "Caixa não usado e CAPEX não implementado na 1ª fase",
      "Qualquer receita de vendas já realizadas",
      "Transferência de estoque entre categorias",
      "Empréstimo ilimitado sem juros",
    ],
    correctIndex: 0,
  },
  {
    id: "9",
    question: "Preço da cesta influencia o cliente porque:",
    options: [
      "Lojas com melhor preço ranqueiam melhor na distribuição de demanda",
      "Define apenas a cor da marca",
      "Substitui a necessidade de operadores",
      "Elimina impostos sobre vendas",
    ],
    correctIndex: 0,
  },
  {
    id: "10",
    question: "Exemplo: 5 operadores (ideal 10) e 9/10 no quiz. O CSAT é:",
    options: ["45%", "90%", "50%", "100%"],
    correctIndex: 0,
  },
];

export const QUIZ_TOTAL = QUIZ_QUESTIONS.length;
