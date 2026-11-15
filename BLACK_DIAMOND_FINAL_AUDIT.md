# BLACK DIAMOND final audit

Generated 2026-11-14T15:18:42.781Z.

## Scope and verified counts

- Framework: Next.js App Router, React 19, TypeScript strict mode.
- History source advertises 500 records across 50 pages; only 10 distinct rows were accessible because page 2 returned page 1. The app requests up to 500 and now stops on a page mismatch rather than silently counting repeated rows. Current dataset version: `history-79c18b5ea0f8dccd`.
- Registered pattern rows: 2000; current source snapshot evaluated 2000; category counts: NUMBER_FREQUENCY=100, NUMBER_COLDNESS=100, NUMBER_MOMENTUM=100, NUMBER_STREAK=100, NUMBER_GAP=100, NUMBER_PARITY=100, NUMBER_HALVES=100, NUMBER_NEIGHBOUR=100, NUMBER_PAIR=100, NUMBER_TRIPLET=100, NUMBER_RECENCY=100, NUMBER_ENTROPY=100, COLOR_FREQUENCY=100, COLOR_STREAK=100, COLOR_TRANSITION=100, COLOR_MOMENTUM=100, SIZE_FREQUENCY=100, SIZE_STREAK=100, SIZE_TRANSITION=100, CROSS_FEATURE=100.
- Legacy generated model variants: 52 (10 Markov + 10 pattern + 10 trend + 10 seasonal + 12 ensemble). They do not vote independently and are not connected to the canonical ranking.
- Specialized classifier classes: 10; Wingo sequence detector rules: 10; independent agent definitions found: 0.
- Production ranking path: `app/page.tsx → useGameData → usePredictions → analyzeTrendPatterns → canonical target snapshot → PredictionDisplay`.

## Data dependency graph

`draw.ar-lottery01.com WinGo 1M history → app/api/wingo-history proxy → lib/api.ts validation/pagination → hooks/use-game-data.ts (500-row request with pagination audit + lifecycle) → lib/period-management.ts (source IDs only) → hooks/use-predictions.ts (shared target read → trend-pattern-engine if absent) → lib/canonical-predictions.ts (atomic target snapshot/settlement) → app/page.tsx / components/prediction-display.tsx`.

Other analytics are separate: `lib/intelligence/features.ts`, `sequences.ts`, and `anomalies.ts` provide descriptive history analysis; legacy `ai-engine.ts`, `advanced-prediction-engine.ts`, specialized classifiers, and sequence detectors do not contribute votes to the canonical Top 3.

## Critical limitation

The latest authoritative history response does not expose an active or upcoming target period. Current latest completed period: 20261114100010918. Active target: Unavailable: source does not provide an active/next ID. No period is invented. The active-round prediction workflow cannot be fully verified until the upstream source adds an authoritative active-period field or a documented period service is configured.

The source also has no per-record timestamps or official size field. Number-to-colour mapping is not verified. Size analysis is explicitly derived from 0-4 / 5-9 and must not be presented as source-provided.

## Prediction evidence

- Valid source records retrieved: 10; the response advertises 500 records across 50 pages.
- Page requests made: 2; page responses accepted: 1; pagination issue: Requested page 2, but the source returned page 1..
- Dataset version: `history-79c18b5ea0f8dccd` (content-aware fingerprint).
- Walk-forward evaluated forecasts: 5; skipped: 0; minimum training records: 5.
- Top-1 number: 20.00% (1/5).
- Top-3 number: 40.00% (2/5).
- Frequency baseline Top-1: 0.00% (0/5).
- Frequency baseline Top-3: 20.00% (1/5).
- Colour membership lead: 20.00% (1/5).
- Derived BIG/SMALL lead: 60.00% (3/5).
- Per-pattern metric rows: 2000; metrics have varying denominators and must not be compared without sample counts.
- Pattern registry: 2000/2000 evaluated; 2000 enabled definitions (not agents); positive/negative/watchlist directions: 118.
- Evidence limit: INSUFFICIENT SAMPLE; do not interpret these rates as calibrated accuracy.
- Fetch time: 465 ms; one current analysis: 50 ms; walk-forward run: 151 ms.

No 97% performance guarantee is supported. See `BACKTESTING_REPORT.md`, `AGENT_VOTING_REPORT.md`, `PERIOD_SYNC_REPORT.md`, and the per-row CSV audits.

## Initial baseline

Before code changes, `npm.cmd test` passed 30/30 tests and `npm.cmd run build` completed successfully. See `TEST_RESULTS.md` for post-change verification.
