/**
 * BLACK DIAMOND
 * Prediction Intelligence Engine
 *
 * Features:
 * - Top 4 number candidates (0-9)
 * - RED / GREEN / VIOLET analysis
 * - BIG / SMALL analysis
 * - Recent + long-term frequency analysis
 * - Recency weighting
 * - Three evidence levels
 * - Input validation
 *
 * IMPORTANT:
 * This is a historical statistical analysis engine.
 * Its scores are not guaranteed future probabilities.
 */

export type WingoColor = "RED" | "GREEN" | "VIOLET";
export type WingoSize = "BIG" | "SMALL";

export type EvidenceLevel =
  | "LEVEL_1_STRONGER_EVIDENCE"
  | "LEVEL_2_MODERATE_EVIDENCE"
  | "LEVEL_3_LOW_EVIDENCE";

export interface HistoricalResult {
  periodId: string;
  number: number;
  color: WingoColor;
  colors?: readonly WingoColor[];
  size: WingoSize;
  timestamp?: number;
}

export interface Candidate<T> {
  value: T;
  score: number;
  estimatedFrequency: number;
  recentFrequency: number;
  historicalFrequency: number;
  sampleSize: number;
  rank: number;
}

export interface CategoryAnalysis<T> {
  primary: Candidate<T>;
  alternative: Candidate<T>;
  candidates: Candidate<T>[];
  evidence: EvidenceLevel;
  sampleSize: number;
  explanation: string[];
}

export interface PredictionResult {
  currentPeriodId: string;
  targetPeriodId: string;
  generatedAt: string;
  totalRecords: number;

  numbers: CategoryAnalysis<number>;
  colors: CategoryAnalysis<WingoColor>;
  sizes: CategoryAnalysis<WingoSize>;

  warnings: string[];
}

export interface PredictionConfig {
  recentWindow: number;
  recencyDecay: number;
  recentWeight: number;
  historicalWeight: number;
  smoothing: number;
}

const DEFAULT_CONFIG: PredictionConfig = {
  recentWindow: 50,
  recencyDecay: 0.97,
  recentWeight: 0.65,
  historicalWeight: 0.35,
  smoothing: 1
};

const NUMBER_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const COLOR_VALUES: WingoColor[] = [
  "RED",
  "GREEN",
  "VIOLET"
];

const SIZE_VALUES: WingoSize[] = [
  "BIG",
  "SMALL"
];

function validateConfig(config: PredictionConfig): void {
  if (
    !Number.isInteger(config.recentWindow) ||
    config.recentWindow < 1 ||
    config.recencyDecay <= 0 ||
    config.recencyDecay > 1 ||
    config.recentWeight < 0 ||
    config.historicalWeight < 0 ||
    config.recentWeight + config.historicalWeight === 0 ||
    config.smoothing <= 0
  ) {
    throw new Error("Invalid prediction configuration");
  }
}

function validateHistory(
  history: HistoricalResult[]
): HistoricalResult[] {
  if (!Array.isArray(history)) {
    throw new Error("Historical data must be an array");
  }

  const seenPeriods = new Set<string>();

  for (const result of history) {
    if (!result || typeof result.periodId !== "string") {
      throw new Error("Invalid historical period");
    }

    if (!result.periodId.trim()) {
      throw new Error("Empty period ID");
    }

    if (seenPeriods.has(result.periodId)) {
      throw new Error(
        `Duplicate historical period: ${result.periodId}`
      );
    }

    seenPeriods.add(result.periodId);

    if (
      !Number.isInteger(result.number) ||
      result.number < 0 ||
      result.number > 9
    ) {
      throw new Error(
        `Invalid number in period ${result.periodId}`
      );
    }

    if (!COLOR_VALUES.includes(result.color)) {
      throw new Error(
        `Invalid colour in period ${result.periodId}`
      );
    }
    if (
      result.colors &&
      (!result.colors.length || result.colors.some((color) => !COLOR_VALUES.includes(color)))
    ) {
      throw new Error(`Invalid colour memberships in period ${result.periodId}`);
    }

    if (!SIZE_VALUES.includes(result.size)) {
      throw new Error(
        `Invalid size in period ${result.periodId}`
      );
    }
  }

  // The caller must provide history in chronological order.
  return [...history];
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function getDistribution<T extends string | number>(
  records: HistoricalResult[],
  values: readonly T[],
  selector: (record: HistoricalResult) => T,
  config: PredictionConfig
): Map<T, {
  combined: number;
  recent: number;
  historical: number;
}> {
  const recentRecords = records.slice(
    -config.recentWindow
  );

  const recentCounts = new Map<T, number>();
  const historicalCounts = new Map<T, number>();

  const recentWeights = new Map<T, number>();

  for (const value of values) {
    recentCounts.set(value, 0);
    historicalCounts.set(value, 0);
    recentWeights.set(value, 0);
  }

  records.forEach((record) => {
    const value = selector(record);

    historicalCounts.set(
      value,
      (historicalCounts.get(value) ?? 0) + 1
    );
  });

  const recentLength = recentRecords.length;

  recentRecords.forEach((record, index) => {
    const value = selector(record);

    recentCounts.set(
      value,
      (recentCounts.get(value) ?? 0) + 1
    );

    const age = recentLength - 1 - index;

    const weight = Math.pow(
      config.recencyDecay,
      age
    );

    recentWeights.set(
      value,
      (recentWeights.get(value) ?? 0) + weight
    );
  });

  const totalRecentWeight = Array.from(
    recentWeights.values()
  ).reduce((sum, value) => sum + value, 0);

  const totalWeight =
    config.recentWeight + config.historicalWeight;

  const output = new Map<T, {
    combined: number;
    recent: number;
    historical: number;
  }>();

  for (const value of values) {
    const recentProbability =
      (
        (recentWeights.get(value) ?? 0) +
        config.smoothing
      ) /
      (
        totalRecentWeight +
        config.smoothing * values.length
      );

    const historicalProbability =
      (
        (historicalCounts.get(value) ?? 0) +
        config.smoothing
      ) /
      (
        records.length +
        config.smoothing * values.length
      );

    const combined =
      (
        recentProbability * config.recentWeight +
        historicalProbability * config.historicalWeight
      ) / totalWeight;

    const recentFrequency =
      recentLength > 0
        ? (recentCounts.get(value) ?? 0) / recentLength
        : 0;

    const historicalFrequency =
      records.length > 0
        ? (historicalCounts.get(value) ?? 0) /
          records.length
        : 0;

    output.set(value, {
      combined,
      recent: recentFrequency,
      historical: historicalFrequency
    });
  }

  return output;
}

function determineEvidence(
  sampleSize: number,
  primaryScore: number,
  baseline: number
): EvidenceLevel {
  if (
    sampleSize >= 100 &&
    primaryScore >= baseline * 1.15
  ) {
    return "LEVEL_1_STRONGER_EVIDENCE";
  }

  if (sampleSize >= 30) {
    return "LEVEL_2_MODERATE_EVIDENCE";
  }

  return "LEVEL_3_LOW_EVIDENCE";
}

function analyseCategory<T extends string | number>(
  records: HistoricalResult[],
  values: readonly T[],
  selector: (record: HistoricalResult) => T,
  config: PredictionConfig,
  categoryName: string
): CategoryAnalysis<T> {
  if (records.length === 0) {
    throw new Error(
      `Cannot analyse ${categoryName}: no historical records`
    );
  }

  const distribution = getDistribution(
    records,
    values,
    selector,
    config
  );

  const candidates: Candidate<T>[] = values.map(
    (value) => {
      const data = distribution.get(value)!;

      return {
        value,
        score: round(data.combined * 100),
        estimatedFrequency: round(data.combined * 100),
        recentFrequency: round(data.recent * 100),
        historicalFrequency: round(
          data.historical * 100
        ),
        sampleSize: records.length,
        rank: 0
      };
    }
  );

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return String(a.value).localeCompare(
      String(b.value),
      undefined,
      { numeric: true }
    );
  });

  candidates.forEach((candidate, index) => {
    candidate.rank = index + 1;
  });

  const primary = candidates[0];
  const alternative = candidates[1];

  const evidence = determineEvidence(
    records.length,
    primary.score,
    100 / values.length
  );

  const explanation = [
    `${categoryName} analysis used ${records.length} validated records.`,
    `Recent window: ${Math.min(records.length, config.recentWindow)} records.`,
    `Top candidate: ${primary.value}.`,
    `Observed weighted frequency score: ${primary.score}%.`,
    `Historical frequency: ${primary.historicalFrequency}%.`,
    `Recent frequency: ${primary.recentFrequency}%.`,
    "Scores describe historical evidence, not guaranteed future outcomes."
  ];

  return {
    primary,
    alternative,
    candidates,
    evidence,
    sampleSize: records.length,
    explanation
  };
}

function analyseMembershipCategory<T extends string>(
  records: HistoricalResult[],
  values: readonly T[],
  selector: (record: HistoricalResult) => readonly T[],
  config: PredictionConfig,
  categoryName: string,
): CategoryAnalysis<T> {
  if (records.length === 0) {
    throw new Error(`Cannot analyse ${categoryName}: no historical records`);
  }

  const recentRecords = records.slice(-config.recentWindow);
  const historicalCounts = new Map<T, number>(values.map((value) => [value, 0]))
  const recentCounts = new Map<T, number>(values.map((value) => [value, 0]))
  const recentWeights = new Map<T, number>(values.map((value) => [value, 0]))
  let totalHistoricalMemberships = 0
  let totalRecentMembershipWeight = 0

  records.forEach((record) => {
    for (const value of new Set(selector(record))) {
      historicalCounts.set(value, (historicalCounts.get(value) ?? 0) + 1)
      totalHistoricalMemberships++
    }
  })

  recentRecords.forEach((record, index) => {
    const ageWeight = Math.pow(config.recencyDecay, recentRecords.length - 1 - index)
    for (const value of new Set(selector(record))) {
      recentCounts.set(value, (recentCounts.get(value) ?? 0) + 1)
      recentWeights.set(value, (recentWeights.get(value) ?? 0) + ageWeight)
      totalRecentMembershipWeight += ageWeight
    }
  })

  const totalWeight = config.recentWeight + config.historicalWeight
  const candidates: Candidate<T>[] = values.map((value) => {
    const recentProbability = ((recentWeights.get(value) ?? 0) + config.smoothing)
      / (totalRecentMembershipWeight + config.smoothing * values.length)
    const historicalProbability = ((historicalCounts.get(value) ?? 0) + config.smoothing)
      / (totalHistoricalMemberships + config.smoothing * values.length)
    const combined = (
      recentProbability * config.recentWeight +
      historicalProbability * config.historicalWeight
    ) / totalWeight

    return {
      value,
      score: round(combined * 100),
      estimatedFrequency: round(combined * 100),
      recentFrequency: round((recentCounts.get(value) ?? 0) / recentRecords.length * 100),
      historicalFrequency: round((historicalCounts.get(value) ?? 0) / records.length * 100),
      sampleSize: records.length,
      rank: 0,
    }
  }).sort((left, right) =>
    right.score - left.score || String(left.value).localeCompare(String(right.value)),
  )

  candidates.forEach((candidate, index) => { candidate.rank = index + 1 })
  const primary = candidates[0]
  const evidence = determineEvidence(records.length, primary.score, 100 / values.length)
  return {
    primary,
    alternative: candidates[1],
    candidates,
    evidence,
    sampleSize: records.length,
    explanation: [
      `${categoryName} membership analysis used ${records.length} validated results.`,
      "A result may belong to more than one colour; membership scores are not mutually exclusive outcome probabilities.",
      `Top membership: ${primary.value} (${primary.score}% relative historical score).`,
      "Scores describe historical evidence, not guaranteed future outcomes.",
    ],
  }
}

/**
 * Main prediction function.
 *
 * currentPeriodId must come from the actual period source.
 * targetPeriodId must be independently verified as the next period.
 */
export function generatePrediction(
  input: {
    currentPeriodId: string;
    targetPeriodId: string;
    history: HistoricalResult[];
    config?: Partial<PredictionConfig>;
  }
): PredictionResult {
  const {
    currentPeriodId,
    targetPeriodId,
    history
  } = input;

  if (!currentPeriodId || !targetPeriodId) {
    throw new Error("Current and target period are required");
  }

  if (currentPeriodId === targetPeriodId) {
    throw new Error(
      "Target period must differ from current period"
    );
  }

  const config: PredictionConfig = {
    ...DEFAULT_CONFIG,
    ...input.config
  };

  validateConfig(config);

  const validHistory = validateHistory(history);

  if (validHistory.length < 10) {
    throw new Error(
      "At least 10 validated historical records are required"
    );
  }

  const numbers = analyseCategory(
    validHistory,
    NUMBER_VALUES,
    (record) => record.number,
    config,
    "NUMBER"
  );

  const colors = analyseMembershipCategory(
    validHistory,
    COLOR_VALUES,
    (record) => record.colors ?? [record.color],
    config,
    "COLOUR"
  );

  const sizes = analyseCategory(
    validHistory,
    SIZE_VALUES,
    (record) => record.size,
    config,
    "BIG/SMALL"
  );

  return {
    currentPeriodId,
    targetPeriodId,
    generatedAt: new Date().toISOString(),
    totalRecords: validHistory.length,
    numbers,
    colors,
    sizes,
    warnings: [
      "Historical frequency is not proof of future probability.",
      "Four candidates are ranked by historical statistical evidence.",
      "RED/GREEN/VIOLET values are source colour memberships, not number-to-colour predictions.",
      "BIG/SMALL is derived using the existing 0–4 SMALL and 5–9 BIG rule; source history does not provide a size field.",
      "No guaranteed accuracy is claimed."
    ]
  };
}
