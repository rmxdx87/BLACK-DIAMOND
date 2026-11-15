import assert from "node:assert/strict"
import test from "node:test"
import { PredictionHistoryManager } from "../lib/prediction-history.ts"

const candidates = [1, 2, 7, 9].map((number, index) => ({
  rank: index + 1,
  number,
  mappedColours: null,
  size: number < 5 ? "small" : "big",
  score: 0.9 - index * 0.1,
  supportingPatternCount: 4 - index,
  historicalSampleCount: 40,
  signalAgreement: 0.6,
  calibratedConfidence: null,
}))

test("records Top 4 hits and scores colour memberships plus derived size", () => {
  const history = new PredictionHistoryManager()
  history.clearHistory()

  const firstId = history.addTopFourPrediction(
    candidates,
    "104",
    { color: "green", size: "big" },
  )
  history.updatePredictionResult(firstId, {
    period: "104",
    number: 9,
    color: "red",
    colors: ["red", "green"],
    size: null,
    premium: 9,
    sum: 9,
    timestamp: null,
  })

  const first = history.getHistory()[0]
  assert.equal(first.predictions.topFour?.[3].number, 9)
  assert.equal(first.results?.numberTopFour, true)
  assert.equal(first.results?.color, true)
  assert.equal(first.results?.size, true)
  assert.equal(first.status, "win")

  const secondId = history.addTopFourPrediction(
    candidates,
    "105",
    { color: "green", size: "small" },
  )
  history.updatePredictionResult(secondId, {
    period: "105",
    number: 6,
    color: "red",
    colors: ["red"],
    size: null,
    premium: 6,
    sum: 6,
    timestamp: null,
  })

  const second = history.getHistory()[0]
  assert.equal(second.results?.numberTopFour, false)
  assert.equal(second.results?.color, false)
  assert.equal(second.results?.size, false)
  assert.equal(second.status, "loss")
  assert.equal(history.getStats().topFourAccuracy, 50)
  assert.equal(history.getStats().accuracy.color, 50)
  assert.equal(history.getStats().accuracy.size, 50)
  assert.deepEqual(history.getStats().markets, {
    number: { predictions: 2, wins: 1, losses: 1, winRate: 50 },
    color: { predictions: 2, wins: 1, losses: 1, winRate: 50 },
    size: { predictions: 2, wins: 1, losses: 1, winRate: 50 },
  })

  history.addTopFourPrediction(candidates, "106", { color: "red", size: "small" })
  const statsWithPendingPrediction = history.getStats()
  assert.equal(statsWithPendingPrediction.totalPredictions, 3)
  assert.equal(statsWithPendingPrediction.resolvedPredictions, 2)
  assert.equal(statsWithPendingPrediction.pendingPredictions, 1)
  assert.equal(statsWithPendingPrediction.wins, 1)
  assert.equal(statsWithPendingPrediction.losses, 1)
  assert.equal(statsWithPendingPrediction.winRate, 50)
  assert.equal(statsWithPendingPrediction.markets.number.predictions, 2)
  history.clearHistory()
})

test("rejects incomplete or duplicate Top 4 snapshots", () => {
  const history = new PredictionHistoryManager()
  assert.throws(() => history.addTopFourPrediction(candidates.slice(0, 3), "106"), /four distinct candidates/)
  assert.throws(() => history.addTopFourPrediction(
    candidates.map((candidate) => ({ ...candidate, number: 1 })),
    "106",
  ), /four distinct candidates/)
})
