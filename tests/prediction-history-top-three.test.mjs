import assert from "node:assert/strict"
import test from "node:test"
import { PredictionHistoryManager } from "../lib/prediction-history.ts"

test("records a distinct Top 3 snapshot and scores hits without legacy colour or size guesses", () => {
  const history = new PredictionHistoryManager()
  history.clearHistory()
  const candidates = [2, 5, 8].map((number, index) => ({
    rank: index + 1,
    number,
    mappedColours: null,
    size: number < 5 ? "small" : "big",
    score: 0.1 * (3 - index),
    supportingPatternCount: 4 - index,
    historicalSampleCount: 40,
    signalAgreement: 0.6,
    calibratedConfidence: null,
  }))

  const id = history.addTopThreePrediction(candidates, "104")
  assert.equal(history.addTopThreePrediction(candidates, "104"), id, "a target period should only have one local snapshot")
  assert.throws(() => history.updatePredictionResult(id, {
    period: "105",
    number: 5,
    color: "red",
    colors: ["red"],
    size: null,
    premium: 5,
    sum: 5,
    timestamp: null,
  }), /does not match prediction target/)

  history.updatePredictionResult(id, {
    period: "104",
    number: 5,
    color: "red",
    colors: ["red", "violet"],
    size: null,
    premium: 5,
    sum: 5,
    timestamp: null,
  })

  const entry = history.getHistory()[0]
  assert.deepEqual(entry.predictions.topThree?.map((candidate) => candidate.number), [2, 5, 8])
  assert.equal(entry.results?.numberTopThree, true)
  assert.equal(entry.results?.color, undefined)
  assert.equal(entry.results?.size, undefined)
  assert.equal(entry.status, "win")
  assert.deepEqual(entry.actualResult?.colors, ["red", "violet"])
  assert.equal(entry.actualResult?.size, null)
  assert.equal(history.getStats().topThreeAccuracy, 100)

  const lossId = history.addTopThreePrediction(candidates, "105")
  history.updatePredictionResult(lossId, {
    period: "105",
    number: 1,
    color: "green",
    colors: ["green"],
    size: null,
    premium: 1,
    sum: 1,
    timestamp: null,
  })
  assert.equal(history.getHistory()[0].status, "loss")
  assert.equal(history.getHistory()[0].results?.numberTopThree, false)
  assert.deepEqual(history.getStats().markets.number, {
    predictions: 2,
    wins: 1,
    losses: 1,
    winRate: 50,
  })
  history.clearHistory()
})
