import assert from "node:assert/strict"
import test from "node:test"
import { JalwaApiService, normalizeHistoricalRecord, parseHistoricalApiResponse } from "../lib/api.ts"

const sourceRecord = (overrides = {}) => ({
  issueNumber: "20261109100010046",
  number: "2",
  color: "red",
  premium: "2",
  sum: 0,
  ...overrides,
})

const apiResponse = (list) => ({
  code: 0,
  msg: "success",
  data: { list, pageNo: 1, totalPage: 1, totalCount: list.length },
  serviceTime: 123,
})

test("normalizes multi-colour results without inventing size or timestamp", () => {
  const input = sourceRecord({ color: " RED, violet, red " })
  const result = normalizeHistoricalRecord(input)

  assert.equal(result.period, input.issueNumber)
  assert.equal(result.number, 2)
  assert.deepEqual(result.colors, ["red", "violet"])
  assert.equal(result.sum, 0)
  assert.equal(result.size, null)
  assert.equal(result.timestamp, null)
  assert.deepEqual(result.originalRecord, input)
})

test("rejects out-of-range numbers and unsupported colour membership", () => {
  assert.throws(() => normalizeHistoricalRecord(sourceRecord({ number: 10 })), /out of range/)
  assert.throws(() => normalizeHistoricalRecord(sourceRecord({ color: "red,blue" })), /Invalid color/)
})

test("reports invalid response records and skips duplicate periods", () => {
  const response = apiResponse([
    sourceRecord(),
    sourceRecord({ issueNumber: "20261109100010047", color: "red,unknown" }),
    null,
    sourceRecord(),
  ])
  const page = parseHistoricalApiResponse(response)

  assert.equal(page.records.length, 1)
  assert.equal(page.duplicateCount, 1)
  assert.equal(page.recordsReceived, 4)
  assert.equal(page.validRecordCount, 2)
  assert.equal(page.rejectedRecords.length, 2)
  assert.equal(page.rejectedRecords[0].index, 1)
  assert.match(page.rejectedRecords[0].reason, /Invalid color/)
  assert.equal(page.rejectedRecords[1].period, null)
})

test("rejects malformed response metadata instead of coercing empty values", () => {
  const response = apiResponse([sourceRecord()])
  response.data.pageNo = ""

  assert.throws(() => parseHistoricalApiResponse(response), /Missing pageNo/)
})

test("stops pagination when the source returns the wrong page instead of silently counting repeats", async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  const body = apiResponse([sourceRecord()])
  body.data.totalPage = 3
  body.data.totalCount = 500
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    return Response.json(body)
  }

  try {
    const service = new JalwaApiService()
    const result = await service.fetchHistoryDataWithAudit(500)
    assert.equal(calls.length, 2)
    assert.equal(result.pagesFetched, 2)
    assert.equal(result.records.length, 1)
    assert.equal(result.sourceTotalCount, 500)
    assert.equal(result.apiRecordsReceived, 2)
    assert.equal(result.validRecordCount, 2)
    assert.equal(result.uniqueRecordCount, 1)
    assert.equal(result.duplicateCount, 1)
    assert.match(result.paginationIssue, /Requested page 2, but the source returned page 1/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("loads all distinct available pages, sorts newest first, and audits invalid and duplicate rows", async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url) => {
    const requestedPage = Number(new URL(String(url)).searchParams.get("pageNo"))
    calls.push(requestedPage)
    const pages = {
      1: [sourceRecord({ issueNumber: "20261109100010046" })],
      2: [
        sourceRecord({ issueNumber: "20261109100010048" }),
        sourceRecord({ issueNumber: "20261109100010046" }),
      ],
      3: [sourceRecord({ issueNumber: "20261109100010049", number: 10 })],
    }
    return Response.json({
      ...apiResponse(pages[requestedPage]),
      data: {
        ...apiResponse(pages[requestedPage]).data,
        pageNo: requestedPage,
        totalPage: 3,
        totalCount: 30,
      },
    })
  }

  try {
    const result = await new JalwaApiService().fetchHistoryDataWithAudit(30)
    assert.deepEqual(calls, [1, 2, 3])
    assert.deepEqual(result.records.map(({ period }) => period), [
      "20261109100010048",
      "20261109100010046",
    ])
    assert.equal(result.apiRecordsReceived, 4)
    assert.equal(result.validRecordCount, 3)
    assert.equal(result.uniqueRecordCount, 2)
    assert.equal(result.invalidRecordCount, 1)
    assert.equal(result.duplicateCount, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("surfaces failed source responses without parsing them as history", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response("source unavailable", { status: 503 })
  try {
    await assert.rejects(new JalwaApiService().fetchPage(1), /HTTP 503/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("returns only records actually received when a later pagination request fails", async () => {
  const service = new JalwaApiService()
  service.fetchPageWithRetry = async (pageNo) => {
    if (pageNo === 1) {
      return parseHistoricalApiResponse({
        ...apiResponse([sourceRecord()]),
        data: { ...apiResponse([sourceRecord()]).data, totalPage: 3, totalCount: 30 },
      })
    }
    throw new Error("upstream page unavailable")
  }

  const result = await service.fetchHistoryDataWithAudit(30)
  assert.equal(result.records.length, 1)
  assert.equal(result.apiRecordsReceived, 1)
  assert.equal(result.uniqueRecordCount, 1)
  assert.equal(result.pagesFetched, 1)
  assert.match(result.paginationIssue, /Could not fetch requested page 2: upstream page unavailable/)
})

test("rejects missing API history data", () => {
  assert.throws(() => parseHistoricalApiResponse({ code: 0, serviceTime: 123, data: {} }), /Missing data.list/)
})
