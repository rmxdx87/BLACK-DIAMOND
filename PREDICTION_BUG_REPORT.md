# Prediction pipeline repair report

## Root causes

1. The dashboard used optional lifecycle fields that are absent from the observed history response and could retain/fall back to stale period state. The source supplies completed issue IDs and `serviceTime`, but no active/next issue or next-round timestamp.
2. The source advertises 500 records/50 pages but has returned only 10 rows and repeats page 1 for later requests. The prior client also capped history loading and did not report all pagination outcomes.
3. Prediction execution could short-circuit on a stored forecast before the local analysis ran, while the UI exposed only three candidates and did not keep evidence availability distinct from confidence.
4. The analytical coordinator did not report an execution audit for the connected engines, and its status/loading path was not explicit for every terminal outcome.

## Repairs

- Added a strict period resolver with source-clock consistency checks, explicit format errors, daily rollover inference based on observed IDs, and no opaque string increment. Inferred period IDs are labeled as inference because no authoritative upstream specification was found. Countdown time is accepted only from a future source-provided timestamp.
- Added paginated history loading with period-ID deduplication, chronological sorting, validation, honest record counters, repeated-page detection, and partial-result reporting on pagination failure.
- Added a status-bearing prediction coordinator that runs independent pattern and statistical engines, preserves their separate results, reports execution statistics, and ranks up to four distinct candidates without requiring engine agreement.
- Ensured local analysis is not skipped by canonical forecast storage, bounded pending storage operations with a timeout, and clears the analyzing state in a `finally` path.
- Updated the UI to show target resolution errors/limitations, up to four candidates, low-evidence labeling, engine counts, and API/valid/unique/processed/rejected history counts.

## Audited execution inventory

- The static pattern audit contains 2,000 unique definitions. The coordinator evaluates the registered pattern inventory and reports defined, registered, executable, executed, valid-output, evidence-output, failed, duplicate, disconnected, and processed-record counts.
- The engine audit contains 83 unique entries: two are connected to canonical ranking (the 2,000-pattern ranker and statistical-frequency baseline), and 81 are not. The inventory includes 52 configured numeric variants, 10 specialized classifier classes, and 10 sequence-detector patterns; these are not represented as executing engines in the coordinator.
- The agent audit found no registered or operational bots. The app reports zero agents rather than fabricating bot runs.

## Remaining source blockers

- The upstream endpoint does not currently advance pagination beyond its first 10 records, so the app cannot load history that the source does not return.
- No authoritative next-period ID or next-round timestamp is present in the observed response. A target is inferred only when the observed issue shape and source clock align; the countdown is then estimated from the validated one-minute schedule and response-received time. Source/receive clock gaps over one round are rejected rather than shown as a stale countdown.
- The observed issue format/rollover inference still needs provider documentation or an authoritative active-period endpoint.
- Prediction scores are historical evidence only. No 97–98% accuracy claim is made; confidence remains uncalibrated without held-out out-of-sample results.
