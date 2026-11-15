# Period synchronization report

## Source behavior

The app loads WinGo 1M history from `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json` through `/api/wingo-history`. The observed response advertises 500 records over 50 pages, but returns 10 records on page 1; requests for later pages have repeated page 1. The source provides `serviceTime` and completed `issueNumber` values, but the observed response contains no active/next period ID or next-round timestamp.

## Resolver behavior and limitations

- `resolvePeriodLifecycle` validates completed issue IDs against the observed `YYYYMMDD1000NNNNN` shape and observed daily sequence range, then checks that the latest completed issue matches the source clock.
- When this validation succeeds and the API omits an explicit target, the resolver infers the next issue from the observed one-minute sequence. This is an evidence-based inference, not an independently confirmed official format/rollover specification.
- The resolver never increments an opaque period string. Invalid, stale, and inconsistent values produce a specific error; the UI also distinguishes a missing timestamp from a period-resolution error.
- A future timestamp supplied by the source takes precedence. When it is absent, the resolver estimates the next UTC minute boundary only after the latest completed issue matches the source clock and the observed 1-minute sequence. The estimate is anchored to response-received time to tolerate source-clock lag up to one round; larger discrepancies are rejected. The dashboard labels the countdown as estimated, not as an authoritative provider timestamp.
- The source's exact rollover rules and active-period semantics remain unverified. Do not treat inferred target IDs as authoritative until the provider documents or exposes them.

## History availability

The history loader requests the source-reported pages, validates numbers and period IDs, tracks received/valid/rejected/duplicate/unique records separately, and sorts accepted records chronologically. It stops when the source returns a repeated or incorrect page and reports the pagination issue. It does not claim that the advertised 500 records were loaded when the upstream endpoint only supplies 10 distinct rows.
