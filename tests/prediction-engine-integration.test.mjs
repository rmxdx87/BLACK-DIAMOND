import assert from "node:assert/strict"
import test from "node:test"
import { generatePrediction } from "../src/lib/prediction/engine.ts"
import { toHistoricalResults } from "../lib/prediction/engine-adapter.ts"

const apiResult = (period, number, color, colors = [color]) => ({
  period,
  number,
  color,
  colors,
  size: null,
  premium: number,
  timestamp: null,
})

test("maps API colour memberships and the existing WinGo size rule", () => {
  const mapped = toHistoricalResults([
    apiResult("2026111503", 5, "green", ["green", "violet"]),
    apiResult("2026111501", 4, "red"),
    apiResult("2026111502", 0, "violet"),
  ])

  assert.deepEqual(mapped.map(({ periodId }) => periodId), [
    "2026111501",
    "2026111502",
    "2026111503",
  ])
  assert.equal(mapped[0].color, "RED")
  assert.equal(mapped[0].size, "SMALL")
  assert.equal(mapped[1].color, "VIOLET")
  assert.equal(mapped[1].size, "SMALL")
  assert.equal(mapped[2].color, "GREEN")
  assert.deepEqual(mapped[2].colors, ["GREEN", "VIOLET"])
  assert.equal(mapped[2].size, "BIG")
})

test("rejects source history without numeric period IDs", () => {
  assert.throws(
    () => toHistoricalResults([apiResult("unknown", 1, "red")]),
    /Invalid numeric source period/,
  )
})

test("generates four ranked number candidates from validated source history", () => {
  const history = Array.from({ length: 30 }, (_, index) => {
    const number = index % 10
    const color = ["RED", "GREEN", "VIOLET"][index % 3]
    return {
      periodId: String(1000 + index),
      number,
      color,
      size: number <= 4 ? "SMALL" : "BIG",
    }
  })

  const result = generatePrediction({
    currentPeriodId: "1029",
    targetPeriodId: "1030",
    history,
  })

  assert.equal(result.totalRecords, 30)
  assert.equal(result.numbers.candidates.length, 10)
  assert.deepEqual(
    result.numbers.candidates.slice(0, 4).map(({ rank }) => rank),
    [1, 2, 3, 4],
  )
  assert.equal(result.colors.candidates.length, 3)
  assert.equal(result.sizes.candidates.length, 2)
})

test("counts all source colour memberships in the independent colour analysis", () => {
  const history = Array.from({ length: 10 }, (_, index) => {
    const color = index % 2 === 0 ? "RED" : "GREEN"
    return {
      periodId: String(3000 + index),
      number: index,
      color,
      colors: index === 0 ? ["RED", "VIOLET"] : [color],
      size: index <= 4 ? "SMALL" : "BIG",
    }
  })

  const result = generatePrediction({
    currentPeriodId: "3009",
    targetPeriodId: "3010",
    history,
  })
  const violetMembership = result.colors.candidates.find(({ value }) => value === "VIOLET")

  assert.ok(violetMembership)
  assert.ok(violetMembership.historicalFrequency > 0)
  assert.equal(violetMembership.sampleSize, 10)
  assert.ok(result.warnings.some((warning) => warning.includes("source colour memberships")))
})

test("rejects current and target periods that are not distinct", () => {
  assert.throws(() => generatePrediction({
    currentPeriodId: "2000",
    targetPeriodId: "2000",
    history: [],
  }), /Target period must differ/)
})
