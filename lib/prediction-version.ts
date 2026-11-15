type SnapshotRecord = {
  period: string
  number?: unknown
  color?: unknown
  colors?: unknown
  size?: unknown
  premium?: unknown
}

/** Hashes the actual historical outcomes used by a forecast, not only period IDs. */
export function createDataVersion(records: readonly (string | SnapshotRecord)[]): string {
  let hashA = 2166136261
  let hashB = 2246822519
  const values = records.map((record) => typeof record === "string"
    ? record
    : JSON.stringify([record.period, record.number, record.colors ?? record.color, record.size, record.premium]))
  for (const value of values) {
    // Delimit records so adjacent period strings cannot collide by concatenation.
    const snapshotValue = `${value}\u0000`
    for (let index = 0; index < snapshotValue.length; index++) {
      const code = snapshotValue.charCodeAt(index)
      hashA = Math.imul(hashA ^ code, 16777619)
      hashB = Math.imul(hashB ^ (code + index), 3266489917)
    }
  }
  return `history-${(hashA >>> 0).toString(16).padStart(8, "0")}${(hashB >>> 0).toString(16).padStart(8, "0")}`
}

/** Versioning used by pre-v3 records, which hashed only concatenated period IDs. */
export function createLegacyPeriodVersion(periods: readonly string[]): string {
  let hash = 2166136261
  for (const period of periods) {
    for (let index = 0; index < period.length; index++) {
      hash ^= period.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
  }
  return `history-${(hash >>> 0).toString(16)}`
}
