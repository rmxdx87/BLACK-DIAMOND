import assert from "node:assert/strict"
import test from "node:test"
import { detectHistoricalAnomalies } from "../lib/intelligence/anomalies.ts"
import { analyzeHistoricalSequences } from "../lib/intelligence/sequences.ts"

const result = (period, number, colors = ["red"]) => ({
  period: String(period),
  number,
  color: colors[0],
  colors,
  size: null,
  sum: number,
  premium: number,
  timestamp: null,
})

test("sequence analysis sorts history, excludes the target period, and separates combined colours", () => {
  const history = [
    result("105", 8, ["red"]),
    result("104", 2, ["red", "green"]),
    result("103", 7, ["red"]),
    result("102", 6, ["green"]),
    result("101", 6, ["red", "green"]),
  ]

  const analysis = analyzeHistoricalSequences(history, { targetPeriod: "105" })

  assert.equal(analysis.includedRecordCount, 4)
  assert.equal(analysis.dataCutoffPeriod, "104")
  assert.equal(analysis.sequences.find((entry) => entry.market === "colour-combination")?.context.join("|"), "red|red+green")
  assert.equal(analysis.patternBreaks.find((entry) => entry.market === "size")?.status, "observed-break")
  assert.ok(analysis.limitations.some((limitation) => limitation.includes("descriptive")))
})

test("anomaly screening reports duplicate periods and consecutive period gaps without claiming cause", () => {
  const report = detectHistoricalAnomalies(
    [result("20261109000001", 1), result("20261109000004", 2), result("20261109000004", 3)],
    { scannedAt: "2026-11-09T00:00:00.000Z" },
  )

  assert.equal(report.duplicatePeriodCount, 1)
  assert.equal(report.events.length, 1)
  assert.equal(report.events[0].feature, "period-sequence-gap")
  assert.equal(report.events[0].verificationStatus, "requires-source-review")
  assert.ok(report.limitations.some((limitation) => limitation.includes("not a persistent event log")))
})

test("distribution-shift screening waits for two complete windows and detects a large shift", () => {
  const insufficient = detectHistoricalAnomalies(Array.from({ length: 50 }, (_, index) =>
    result(`20261109000${String(index).padStart(3, "0")}`, index % 10),
  ))
  assert.ok(insufficient.limitations.some((limitation) => limitation.includes("requires at least 100")))

  const history = Array.from({ length: 100 }, (_, index) =>
    result(`20261109000${String(index).padStart(3, "0")}`, index < 50 ? index % 10 : 9),
  )
  const report = detectHistoricalAnomalies(history, { scannedAt: "2026-11-09T00:00:00.000Z" })

  assert.equal(report.events.length, 1)
  assert.equal(report.events[0].feature, "number-distribution-shift")
  assert.ok(report.events[0].deviation > 27.877)
  assert.match(report.events[0].evidence, /not evidence of manipulation/)
})
