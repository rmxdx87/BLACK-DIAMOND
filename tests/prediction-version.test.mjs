import assert from "node:assert/strict"
import test from "node:test"
import { createDataVersion, createLegacyPeriodVersion } from "../lib/prediction-version.ts"

test("data version includes result content so corrected source outcomes create a new snapshot", () => {
  const first = [{ period: "104", number: 2, colors: ["red"], size: null, premium: 2 }]
  const corrected = [{ period: "104", number: 7, colors: ["green"], size: null, premium: 7 }]
  assert.notEqual(createDataVersion(first), createDataVersion(corrected))
})

test("legacy period version preserves the old period-only canonical lookup key", () => {
  assert.equal(createLegacyPeriodVersion(["104", "103"]), createLegacyPeriodVersion(["104", "103"]))
  assert.notEqual(createLegacyPeriodVersion(["104", "103"]), createLegacyPeriodVersion(["103", "104"]))
})
