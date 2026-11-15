import assert from "node:assert/strict"
import test from "node:test"
import { buildHistoricalFeatureSnapshot } from "../lib/intelligence/features.ts"

const result = (period, number, colors, size = null) => ({
  period,
  number,
  color: colors[0],
  colors,
  premium: number,
  sum: number,
  size,
  timestamp: null,
})

test("features exclude target and future periods before analysis", () => {
  const history = [
    result("104", 9, ["violet"]),
    result("103", 2, ["green"]),
    result("102", 2, ["red"]),
    result("101", 1, ["red"]),
  ]

  const snapshot = buildHistoricalFeatureSnapshot(history, "103")

  assert.equal(snapshot.dataCutoffPeriod, "102")
  assert.equal(snapshot.includedRecordCount, 2)
  assert.equal(snapshot.excludedTargetOrFutureCount, 2)
  assert.equal(snapshot.features.numberDistribution.value.counts["1"], 1)
  assert.equal(snapshot.features.numberDistribution.value.counts["2"], 1)
  assert.equal(snapshot.features.numberDistribution.value.counts["9"], 0)
})

test("keeps colour membership and exact combined outcomes distinct", () => {
  const history = [
    result("101", 1, ["red", "green"]),
    result("102", 2, ["red"]),
  ]
  const snapshot = buildHistoricalFeatureSnapshot(history, "103")

  assert.equal(snapshot.features.colorMembershipDistribution.value.counts.red, 2)
  assert.equal(snapshot.features.colorMembershipDistribution.value.counts.green, 1)
  assert.equal(snapshot.features.colorCombinationDistribution.value.counts["red+green"], 1)
  assert.equal(snapshot.features.colorCombinationDistribution.value.counts.red, 1)
  assert.equal(snapshot.features.bigSmallDistribution, null)
})

test("calculates recent streaks, gaps, and transitions in chronological order", () => {
  const history = [
    result("101", 1, ["red"]),
    result("102", 2, ["green"]),
    result("103", 2, ["green"]),
  ]
  const snapshot = buildHistoricalFeatureSnapshot(history, "104")

  assert.equal(snapshot.features.numberStreaks.value["2"], 2)
  assert.equal(snapshot.features.numberGaps.value["2"], 0)
  assert.equal(snapshot.features.numberGaps.value["1"], 2)
  assert.equal(snapshot.features.numberTransitions.value["1"]["2"], 1)
  assert.equal(snapshot.features.numberTransitions.value["2"]["2"], 1)
})

test("reports duplicate and unordered period records rather than analyzing them", () => {
  const history = [
    result("101", 1, ["red"]),
    result("101", 2, ["green"]),
    result("period-x", 3, ["violet"]),
  ]
  const snapshot = buildHistoricalFeatureSnapshot(history, "102")

  assert.equal(snapshot.includedRecordCount, 1)
  assert.equal(snapshot.duplicatePeriodCount, 1)
  assert.equal(snapshot.incomparablePeriodCount, 1)
  assert.equal(snapshot.features.numberDistribution.dataCutoffPeriod, "101")
})

test("rejects invalid feature windows and recency decay", () => {
  assert.throws(() => buildHistoricalFeatureSnapshot([], "103", { windowSize: 0 }), /window size/)
  assert.throws(() => buildHistoricalFeatureSnapshot([], "103", { recencyDecay: 0 }), /Recency decay/)
})
