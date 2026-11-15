import assert from "node:assert/strict"
import test from "node:test"
import {
  analyzeTrendPatterns,
  runTrendWalkForwardBacktest,
  runTrendWalkForwardBacktestAsync,
  sizeFromNumber,
} from "../lib/trend-pattern-engine.ts"
import { TREND_PATTERN_COUNT, createPatternRegistry } from "../lib/trend-pattern-registry.ts"

const colorSets = [
  ["red"],
  ["green", "violet"],
  ["green"],
  ["red", "violet"],
  ["violet"],
  ["red", "green"],
]

function makeHistory(count = 100) {
  return Array.from({ length: count }, (_, index) => {
    const number = (index * 7 + Math.floor(index / 3) + 2) % 10
    const colors = colorSets[(index * 5 + Math.floor(index / 7)) % colorSets.length]
    return {
      period: String(202611090000 + index),
      number,
      color: colors[0],
      colors,
      size: null,
      premium: number,
      sum: number,
      timestamp: null,
    }
  })
}

test("imports every source pattern ID and preserves the 20-by-10-by-10 catalog", () => {
  const registry = createPatternRegistry()

  assert.equal(TREND_PATTERN_COUNT, 2000)
  assert.equal(registry.length, 2000)
  assert.deepEqual(registry.map((pattern) => pattern.patternId), Array.from(
    { length: 2000 },
    (_, index) => `P${String(index + 1).padStart(4, "0")}`,
  ))
  assert.equal(new Set(registry.map((pattern) => pattern.category)).size, 20)
  assert.deepEqual([...new Set(registry.map((pattern) => pattern.lookbackWindow))].sort((a, b) => a - b), [5, 10, 15, 20, 25, 30, 40, 50, 75, 100])
  assert.equal(new Set(registry.map((pattern) => pattern.profile)).size, 10)
  assert.ok(registry.every((pattern) => pattern.featureDefinition && pattern.candidateScoring && pattern.outputFields))
  assert.ok(registry.every((pattern) => pattern.outputFields.includes("candidate_number")))
})

test("evaluates all patterns, excludes target and future rows, and returns three distinct candidates", () => {
  const history = makeHistory()
  const targetPeriod = history[50].period
  const snapshot = analyzeTrendPatterns(history.slice().reverse(), { targetPeriod })
  const changedFuture = history.map((record, index) => index < 50
    ? record
    : { ...record, number: (record.number + 3) % 10, colors: ["violet"] })
  const changedFutureSnapshot = analyzeTrendPatterns(changedFuture, { targetPeriod })

  assert.equal(snapshot.includedRecordCount, 50)
  assert.equal(snapshot.dataCutoffPeriod, history[49].period)
  assert.equal(snapshot.excludedTargetOrFutureCount, 50)
  assert.equal(snapshot.evaluatedPatternCount, 2000)
  assert.equal(snapshot.evaluations.length, 2000)
  assert.equal(snapshot.topThree.length, 3)
  assert.equal(new Set(snapshot.topThree.map((candidate) => candidate.number)).size, 3)
  assert.deepEqual(snapshot.rankings, changedFutureSnapshot.rankings)
  assert.deepEqual(snapshot.evaluations, changedFutureSnapshot.evaluations)
  assert.ok(snapshot.topThree.every((candidate) => candidate.mappedColours === null))
  assert.ok(snapshot.topThree.every((candidate) => candidate.size === sizeFromNumber(candidate.number)))
  assert.ok(snapshot.evaluations.some((pattern) => pattern.dataSufficiency === "insufficient_window"))
  assert.ok(history.every((record) => record.size === null), "analysis must not modify source records")
})

test("changes one pattern at a time and honors family weights without inventing confidence", () => {
  const history = makeHistory()
  const disabled = analyzeTrendPatterns(history, {
    overrides: { P0001: { enabled: false, weight: 4 } },
  })
  const disabledPattern = disabled.evaluations.find((pattern) => pattern.patternId === "P0001")

  assert.equal(disabled.activePatternCount, 1999)
  assert.equal(disabled.disabledPatternCount, 1)
  assert.equal(disabledPattern?.enabled, false)
  assert.equal(disabledPattern?.dataSufficiency, "disabled")
  assert.ok(disabled.evaluations.every((pattern) => pattern.confidence === null))

  const noWeightedEvidence = analyzeTrendPatterns(history, {
    categoryWeights: Object.fromEntries(
      [...new Set(createPatternRegistry().map((pattern) => pattern.category))]
        .map((category) => [category, 0]),
    ),
  })
  assert.equal(noWeightedEvidence.topThree.length, 0)
})

test("returns a provisional dynamic Top 3 when short valid history is rankable", () => {
  const snapshot = analyzeTrendPatterns(makeHistory(10), { targetPeriod: "202611090000010" })
  assert.equal(snapshot.topThree.length, 3)
  assert.equal(snapshot.lowConfidence, true)
  assert.ok(snapshot.topThree.every((candidate) => candidate.calibratedConfidence === null))
  assert.equal(new Set(snapshot.topThree.map((candidate) => candidate.number)).size, 3)
})

test("walk-forward backtest uses earlier records only and reports baselines and performance slices", () => {
  const history = makeHistory()
  const backtest = runTrendWalkForwardBacktest(history)

  assert.equal(backtest.requestedHistoryCount, history.length)
  assert.ok(backtest.evaluatedForecasts > 0)
  assert.ok(backtest.numberTop3.predictions > 0)
  assert.ok(backtest.numberFrequencyBaselineTop3.predictions > 0)
  assert.equal(Object.keys(backtest.patternPerformance).length, 2000)
  assert.ok(Object.keys(backtest.categoryPerformance).length > 0)
  assert.ok(Object.keys(backtest.windowPerformance).length > 0)
  assert.ok(backtest.limitations.some((limitation) => limitation.includes("walk-forward")))
  assert.ok(backtest.limitations.some((limitation) => limitation.includes("number-to-colour")))
  assert.ok(backtest.calibrationByRank[1].sampleCount >= 30)
  assert.notEqual(backtest.calibrationByRank[1].hitRate, null)
})

test("asynchronous walk-forward backtest matches sync output and supports cancellation", async () => {
  const history = makeHistory(16)
  const syncResult = runTrendWalkForwardBacktest(history, { minimumTrainingRecords: 8 })
  const asyncResult = await runTrendWalkForwardBacktestAsync(history, { minimumTrainingRecords: 8 })

  assert.deepEqual(asyncResult, syncResult)

  const controller = new AbortController()
  controller.abort()
  await assert.rejects(
    runTrendWalkForwardBacktestAsync(history, { signal: controller.signal }),
    { name: "AbortError" },
  )
})

test("rejects invalid overrides, unsupported numbers, and incomplete verified colour mappings", () => {
  assert.throws(() => createPatternRegistry({ P0001: { weight: 11 } }), /weight must be between/)
  assert.throws(() => sizeFromNumber(10), /0 through 9/)
  assert.throws(
    () => analyzeTrendPatterns(makeHistory(), { verifiedNumberColorMapping: {} }),
    /must define at least one supported colour/,
  )
})
