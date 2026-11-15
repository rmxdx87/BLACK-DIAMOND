import assert from "node:assert/strict"
import test from "node:test"
import { resolvePeriodLifecycle } from "../lib/period-management.ts"

const page = (overrides = {}) => ({
  records: [{ period: "20261115100010596" }],
  serviceTime: Date.UTC(2026, 10, 15, 9, 55, 57),
  currentPeriodId: null,
  activePeriodId: null,
  nextPeriodId: null,
  nextRoundTimestamp: null,
  ...overrides,
})

test("infers the observed next issue and estimates countdown only when the source clock matches", () => {
  const lifecycle = resolvePeriodLifecycle(page())
  assert.equal(lifecycle.currentPeriod, "20261115100010596")
  assert.equal(lifecycle.targetPeriod, "20261115100010597")
  assert.equal(lifecycle.nextRoundTimestamp, Date.UTC(2026, 10, 15, 9, 56))
  assert.equal(lifecycle.periodStatus, "upcoming")
  assert.equal(lifecycle.errorReason, null)
  assert.match(lifecycle.limitation, /Countdown estimated/)
})

test("does not mistake the latest completed currentPeriodId for a target", () => {
  const lifecycle = resolvePeriodLifecycle(page({ currentPeriodId: "20261115100010596" }))
  assert.equal(lifecycle.targetPeriod, "20261115100010597")
  assert.equal(lifecycle.periodStatus, "upcoming")
})

test("anchors the countdown to the received clock when the source response is delayed", () => {
  const lifecycle = resolvePeriodLifecycle(
    page(),
    "wingo-1m",
    Date.UTC(2026, 10, 15, 9, 56, 21),
  )
  assert.equal(lifecycle.targetPeriod, "20261115100010597")
  assert.equal(lifecycle.nextRoundTimestamp, Date.UTC(2026, 10, 15, 9, 57))
  assert.ok(lifecycle.nextRoundTimestamp > Date.UTC(2026, 10, 15, 9, 56, 21))
  assert.equal(lifecycle.periodStatus, "active")
  assert.match(lifecycle.limitation, /Countdown estimated/)
})

test("rejects inferred targets when source and receive clocks differ by more than one round", () => {
  const lifecycle = resolvePeriodLifecycle(
    page(),
    "wingo-1m",
    Date.UTC(2026, 10, 15, 9, 57, 1),
  )
  assert.equal(lifecycle.targetPeriod, null)
  assert.match(lifecycle.errorReason, /differ by more than one round/)
})

test("prefers an authoritative active target over the derived sequence", () => {
  const lifecycle = resolvePeriodLifecycle(page({ activePeriodId: "20261115100010598" }))
  assert.equal(lifecycle.latestCompletedPeriodId, "20261115100010596")
  assert.equal(lifecycle.targetPeriodId, "20261115100010598")
  assert.equal(lifecycle.targetPeriodStatus, "active")
  assert.equal(lifecycle.nextRoundTimestamp, null)
})

test("uses a future timestamp supplied by the source", () => {
  const lifecycle = resolvePeriodLifecycle(page({
    nextPeriodId: "20261115100010597",
    nextRoundTimestamp: Date.UTC(2026, 10, 15, 9, 56),
  }))
  assert.equal(lifecycle.targetPeriod, "20261115100010597")
  assert.equal(lifecycle.nextRoundTimestamp, Date.UTC(2026, 10, 15, 9, 56))
  assert.equal(lifecycle.limitation, null)
})

test("does not use a source timestamp that expired before the response arrived", () => {
  const lifecycle = resolvePeriodLifecycle(
    page({
      nextPeriodId: "20261115100010597",
      nextRoundTimestamp: Date.UTC(2026, 10, 15, 9, 56),
    }),
    "wingo-1m",
    Date.UTC(2026, 10, 15, 9, 56, 3),
  )
  assert.equal(lifecycle.nextRoundTimestamp, Date.UTC(2026, 10, 15, 9, 57))
  assert.match(lifecycle.limitation, /Countdown estimated/)
})

test("rolls the daily sequence to the next UTC date without incrementing an opaque string", () => {
  const lifecycle = resolvePeriodLifecycle(page({
    records: [{ period: "20261115100011440" }],
    serviceTime: Date.UTC(2026, 10, 15, 23, 59, 57),
  }))
  assert.equal(lifecycle.targetPeriod, "20261116100010001")
  assert.equal(lifecycle.nextRoundTimestamp, Date.UTC(2026, 10, 16))
  assert.match(lifecycle.limitation, /Countdown estimated/)
})

test("reports the exact format error for malformed period IDs", () => {
  const lifecycle = resolvePeriodLifecycle(page({
    records: [{ period: "202611151000010586" }],
  }))
  assert.equal(lifecycle.targetPeriodId, null)
  assert.equal(lifecycle.targetPeriodStatus, "unavailable")
  assert.match(lifecycle.errorReason, /does not match the WinGo 1M/)
})

test("rejects a stale source clock instead of deriving a target", () => {
  const lifecycle = resolvePeriodLifecycle(page({
    records: [{ period: "20261115100010595" }],
  }))
  assert.equal(lifecycle.targetPeriod, null)
  assert.match(lifecycle.errorReason, /does not align with the source clock period/)
})

test("does not treat a settled latest period as an active target", () => {
  const lifecycle = resolvePeriodLifecycle(page({ activePeriodId: "20261115100010596" }))
  assert.equal(lifecycle.targetPeriodId, null)
  assert.equal(lifecycle.targetPeriodStatus, "settled")
  assert.match(lifecycle.errorReason, /already the latest completed result/)
})
