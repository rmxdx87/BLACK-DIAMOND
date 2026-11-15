import type { HistoricalPage } from "./api"

export type TargetPeriodStatus = "active" | "upcoming" | "settled" | "unavailable"

export interface PeriodLifecycle {
  gameId: string
  currentPeriod: string | null
  targetPeriod: string | null
  nextRoundTimestamp: number | null
  periodStatus: TargetPeriodStatus
  errorReason: string | null
  latestCompletedPeriodId: string | null
  activePeriodId: string | null
  targetPeriodId: string | null
  nextUpcomingPeriodId: string | null
  targetPeriodStatus: TargetPeriodStatus
  sourceTimestamp: number | null
  limitation: string | null
}

interface ParsedWingoPeriod {
  date: string
  sequence: number
}

const PERIOD_PREFIX = "1000"
const FIRST_DAILY_SEQUENCE = 10001
const LAST_DAILY_SEQUENCE = 11440
const ROUND_DURATION_MS = 60_000

function parseWingoPeriod(period: string): ParsedWingoPeriod | null {
  const match = /^(\d{8})1000(\d{5})$/.exec(period)
  if (!match) return null

  const [, date, sequenceText] = match
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(4, 6))
  const day = Number(date.slice(6, 8))
  const parsedDate = new Date(Date.UTC(year, month - 1, day))
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) return null

  const sequence = Number(sequenceText)
  if (sequence < FIRST_DAILY_SEQUENCE || sequence > LAST_DAILY_SEQUENCE) return null
  return { date, sequence }
}

function comparePeriods(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0+(?=\d)/, "")
  const normalizedRight = right.replace(/^0+(?=\d)/, "")
  if (normalizedLeft.length !== normalizedRight.length) return normalizedLeft.length - normalizedRight.length
  return normalizedLeft.localeCompare(normalizedRight)
}

function latestPeriod(records: HistoricalPage["records"]): string | null {
  return records.reduce<string | null>((latest, record) => {
    if (!latest || comparePeriods(record.period, latest) > 0) return record.period
    return latest
  }, null)
}

function periodAtTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const dateId = [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("")
  const minuteOfDay = date.getUTCHours() * 60 + date.getUTCMinutes()
  const sequence = FIRST_DAILY_SEQUENCE + minuteOfDay
  return `${dateId}${PERIOD_PREFIX}${String(sequence).padStart(5, "0")}`
}

function nextRoundBoundary(timestamp: number): number {
  return Math.floor(timestamp / ROUND_DURATION_MS) * ROUND_DURATION_MS + ROUND_DURATION_MS
}

function getReferenceTime(serviceTime: number, observedAt: number): number | null {
  if (!Number.isSafeInteger(observedAt) || observedAt <= 0) return serviceTime
  if (Math.abs(observedAt - serviceTime) > ROUND_DURATION_MS) return null
  return Math.max(serviceTime, observedAt)
}

function unavailable(
  input: Pick<HistoricalPage, "records" | "serviceTime" | "currentPeriodId" | "activePeriodId" | "nextPeriodId" | "nextRoundTimestamp">,
  currentPeriod: string | null,
  reason: string,
  gameId: string,
  status: TargetPeriodStatus = "unavailable",
): PeriodLifecycle {
  return {
    gameId,
    currentPeriod,
    targetPeriod: null,
    nextRoundTimestamp: null,
    periodStatus: status,
    errorReason: reason,
    latestCompletedPeriodId: currentPeriod,
    activePeriodId: input.activePeriodId ?? input.currentPeriodId,
    targetPeriodId: null,
    nextUpcomingPeriodId: input.nextPeriodId,
    targetPeriodStatus: status,
    sourceTimestamp: Number.isFinite(input.serviceTime) ? input.serviceTime : null,
    limitation: reason,
  }
}

/**
 * The observed WinGo 1M issue numbers use YYYYMMDD + "1000" + a five-digit
 * daily sequence (10001 through 11440). Derived targets are only inferences:
 * the source clock must match the latest issue, and the estimated countdown
 * boundary is anchored to the response-received time to tolerate source lag.
 */
export function resolvePeriodLifecycle(
  page: Pick<HistoricalPage, "records" | "serviceTime" | "currentPeriodId" | "activePeriodId" | "nextPeriodId" | "nextRoundTimestamp">,
  gameId = "wingo-1m",
  observedAt = page.serviceTime,
): PeriodLifecycle {
  const currentPeriod = latestPeriod(page.records)
  if (!currentPeriod) return unavailable(page, null, "The source returned no valid completed period ID.", gameId)

  const parsedCurrent = parseWingoPeriod(currentPeriod)
  if (!parsedCurrent) {
    return unavailable(
      page,
      currentPeriod,
      `Completed period ${currentPeriod} does not match the WinGo 1M YYYYMMDD1000NNNNN format or daily sequence range.`,
      gameId,
    )
  }

  const explicitTarget = page.activePeriodId
    ?? (page.currentPeriodId !== currentPeriod ? page.currentPeriodId : null)
    ?? page.nextPeriodId
  if (explicitTarget) {
    if (!parseWingoPeriod(explicitTarget)) {
      return unavailable(
        page,
        currentPeriod,
        `Source target period ${explicitTarget} does not match the WinGo 1M YYYYMMDD1000NNNNN format or daily sequence range.`,
        gameId,
      )
    }
    if (explicitTarget === currentPeriod) {
      return unavailable(
        page,
        currentPeriod,
        `Source target period ${explicitTarget} is already the latest completed result.`,
        gameId,
        "settled",
      )
    }
    if (comparePeriods(explicitTarget, currentPeriod) < 0) {
      return unavailable(
        page,
        currentPeriod,
        `Source target period ${explicitTarget} is older than the latest completed result ${currentPeriod}.`,
        gameId,
      )
    }

    const timestampFromSource = Number.isSafeInteger(page.nextRoundTimestamp) &&
      page.nextRoundTimestamp! > page.serviceTime &&
      page.nextRoundTimestamp! > observedAt
      ? page.nextRoundTimestamp
      : null
    const referenceTime = getReferenceTime(page.serviceTime, observedAt)
    let estimatedBoundary: number | null = null
    if (referenceTime !== null) {
      const candidateBoundary = nextRoundBoundary(referenceTime)
      if (
        periodAtTimestamp(referenceTime) === explicitTarget ||
        periodAtTimestamp(candidateBoundary) === explicitTarget
      ) estimatedBoundary = candidateBoundary
    }
    const nextRoundTimestamp = timestampFromSource ?? estimatedBoundary
    const status: TargetPeriodStatus = page.activePeriodId || page.currentPeriodId !== currentPeriod
      ? "active"
      : "upcoming"
    const limitation = nextRoundTimestamp === null
      ? "The source supplied a target period but no verifiable next-round timestamp."
      : timestampFromSource === null
        ? "Countdown estimated from the validated source clock."
        : null
    return createLifecycle(page, currentPeriod, explicitTarget, nextRoundTimestamp, status, null, gameId, limitation)
  }

  if (!Number.isSafeInteger(page.serviceTime) || page.serviceTime <= 0) {
    return unavailable(page, currentPeriod, "The source did not provide a valid serviceTime; the next period cannot be verified.", gameId)
  }

  const expectedCurrentPeriod = periodAtTimestamp(page.serviceTime)
  if (expectedCurrentPeriod !== currentPeriod) {
    return unavailable(
      page,
      currentPeriod,
      `Latest completed period ${currentPeriod} does not align with the source clock period ${expectedCurrentPeriod}; refusing to derive a target from stale or inconsistent state.`,
      gameId,
    )
  }

  const referenceTime = getReferenceTime(page.serviceTime, observedAt)
  if (referenceTime === null) {
    return unavailable(
      page,
      currentPeriod,
      "The source clock and response-received time differ by more than one round; refusing to estimate a stale target or countdown.",
      gameId,
    )
  }

  const referencePeriod = periodAtTimestamp(referenceTime)
  const nextRoundTimestamp = nextRoundBoundary(referenceTime)
  const isActiveTarget = comparePeriods(referencePeriod, currentPeriod) > 0
  const targetPeriod = isActiveTarget
    ? referencePeriod
    : periodAtTimestamp(nextRoundTimestamp)
  return createLifecycle(
    page,
    currentPeriod,
    targetPeriod,
    nextRoundTimestamp,
    isActiveTarget ? "active" : "upcoming",
    null,
    gameId,
    "Countdown estimated from the validated source clock.",
  )
}

function createLifecycle(
  page: Pick<HistoricalPage, "serviceTime" | "activePeriodId" | "currentPeriodId" | "nextPeriodId">,
  currentPeriod: string,
  targetPeriod: string,
  nextRoundTimestamp: number | null,
  status: TargetPeriodStatus,
  errorReason: string | null,
  gameId: string,
  limitation: string | null,
): PeriodLifecycle {
  return {
    gameId,
    currentPeriod,
    targetPeriod,
    nextRoundTimestamp,
    periodStatus: status,
    errorReason,
    latestCompletedPeriodId: currentPeriod,
    activePeriodId: page.activePeriodId ?? page.currentPeriodId,
    targetPeriodId: targetPeriod,
    nextUpcomingPeriodId: page.nextPeriodId,
    targetPeriodStatus: status,
    sourceTimestamp: Number.isFinite(page.serviceTime) ? page.serviceTime : null,
    limitation,
  }
}

export function isPredictionEligible(lifecycle: PeriodLifecycle): boolean {
  return lifecycle.targetPeriod !== null &&
    (lifecycle.periodStatus === "active" || lifecycle.periodStatus === "upcoming")
}
