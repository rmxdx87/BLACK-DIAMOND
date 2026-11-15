import assert from "node:assert/strict"
import test from "node:test"
import { coordinatePrediction, withTimeout } from "../lib/prediction/coordinator.ts"

const currentPeriod = "20261115100010596"

function makeHistory(count = 10) {
  return Array.from({ length: count }, (_, index) => {
    const number = index % 10
    const suffix = 10587 + index
    return {
      period: `202611151000${String(suffix).padStart(5, "0")}`,
      number,
      color: ["red", "green", "violet"][index % 3],
      colors: [["red"], ["green"], ["violet", "red"]][index % 3],
      size: null,
      premium: number,
      timestamp: null,
    }
  })
}

test("coordinates independent engines and returns four ranked candidates with honest execution counts", () => {
  const output = coordinatePrediction({
    targetPeriod: "20261115100010597",
    currentPeriodId: currentPeriod,
    history: makeHistory(),
  })

  assert.equal(output.status, "SUCCESS")
  assert.deepEqual(output.candidates.map(({ rank }) => rank), [1, 2, 3, 4])
  assert.equal(new Set(output.candidates.map(({ number }) => number)).size, 4)
  assert.equal(output.sampleSize, 10)
  assert.equal(output.recordsProcessedByEngines, 10)
  assert.equal(output.trendAnalysis?.lowConfidence, true)
  assert.equal(output.executionStats.patterns.defined, 2000)
  assert.equal(output.executionStats.patterns.registered, 2000)
  assert.equal(output.executionStats.patterns.executed, 2000)
  assert.equal(output.executionStats.patterns.validOutput, 2000)
  assert.equal(output.executionStats.patterns.failed, 0)
  assert.equal(output.executionStats.patterns.duplicates, 0)
  assert.equal(output.executionStats.patterns.disconnected, 0)
  assert.equal(output.executionStats.statisticalFrequency.validOutput, 1)
  assert.equal(output.executionStats.agents.defined, 0)
})

test("deduplicates history and counts rejected rows without losing independent rankings", () => {
  const history = makeHistory()
  history.push({ ...history[0] })
  history.push({ ...history[1], number: 12 })
  const output = coordinatePrediction({
    targetPeriod: "20261115100010597",
    currentPeriodId: currentPeriod,
    history,
  })

  assert.equal(output.status, "SUCCESS")
  assert.equal(output.sampleSize, 10)
  assert.equal(output.duplicateRecords, 1)
  assert.equal(output.recordsRejected, 1)
  assert.equal(output.candidates.length, 4)
})

test("classifies missing periods, unusable source records, and empty history distinctly", () => {
  const emptyHistory = coordinatePrediction({
    targetPeriod: "20261115100010597",
    currentPeriodId: currentPeriod,
    history: [],
  })
  assert.equal(emptyHistory.status, "INSUFFICIENT_DATA")

  const invalidSource = coordinatePrediction({
    targetPeriod: "20261115100010597",
    currentPeriodId: currentPeriod,
    history: [{ ...makeHistory(1)[0], period: "bad", number: 4 }],
  })
  assert.equal(invalidSource.status, "SOURCE_ERROR")

  const missingTarget = coordinatePrediction({
    targetPeriod: "",
    currentPeriodId: currentPeriod,
    history: makeHistory(),
  })
  assert.equal(missingTarget.status, "PERIOD_ERROR")
  assert.match(missingTarget.errorReason, /Target period is not a numeric/)
})

test("rejects a stale current period instead of generating a target forecast", () => {
  const output = coordinatePrediction({
    targetPeriod: "20261115100010597",
    currentPeriodId: "20261115100010595",
    history: makeHistory(),
  })
  assert.equal(output.status, "PERIOD_ERROR")
  assert.match(output.errorReason, /does not match the latest valid history period/)
})

test("times out a pending dependency so coordinator callers cannot wait forever", async () => {
  const pending = new Promise(() => {})
  await assert.rejects(withTimeout(pending, 5, "dependency timed out"), /dependency timed out/)
})
