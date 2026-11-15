# Three-level learning report

Generated 2026-11-14T15:18:42.781Z.

## Implemented

- A canonical Top 3 snapshot is persisted per game, target period, and model version when Realtime Database is configured.
- Settled actual outcomes are attached without replacing the original forecast. Local history de-duplicates predictions by target period.
- Walk-forward validation provides rank-specific counts and Top-1 / Top-3 hit rates; confidence calibration is withheld until the engine's minimum sample requirement is met.

## Not implemented

There is no Level 1 / Level 2 / Level 3 reassessment workflow, no per-agent performance ledger, no learned or versioned weights, no validation/holdout split for tuning, and no controlled online learning service. The 97% figure remains an aspirational target and is not measured or guaranteed.

## Current measured context

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

No weights were changed based on this report.
