import assert from "node:assert/strict"
import test from "node:test"
import { evaluateManualPrediction } from "../lib/platform/prediction-settlement.ts"

test("settles only mapped values that have an actual matching result", () => {
  assert.equal(evaluateManualPrediction({ numberCandidates: ["2", "7"] }, 7), "WIN")
  assert.equal(evaluateManualPrediction({ numberCandidates: ["2", "7"] }, 3), "LOSS")
  assert.equal(
    evaluateManualPrediction({ colorCandidates: ["red"], sizeCandidates: ["big"] }, { color: "red", size: "big" }),
    "WIN",
  )
  assert.equal(
    evaluateManualPrediction({ colorCandidates: ["red"], sizeCandidates: ["big"] }, "red,big"),
    "WIN",
  )
})

test("keeps unavailable fields unverified and compares structured results deterministically", () => {
  assert.equal(evaluateManualPrediction({ colorCandidates: ["red"] }, 3), "UNVERIFIED")
  assert.equal(
    evaluateManualPrediction({ result: { b: 2, a: 1 } }, { a: 1, b: 2 }),
    "WIN",
  )
})
