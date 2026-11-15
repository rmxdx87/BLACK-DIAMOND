# Performance and data coverage

Generated 2026-11-14T15:18:42.781Z.

| Measure | Before | After | Evidence |
| --- | --- | --- | --- |
| History rows requested | 100 | Up to 500 | `use-game-data.ts`; source advertises 500 rows, but only 10 distinct rows are accessible in this run |
| Existing canonical target read | After pattern ranking | Before pattern ranking | `hooks/use-predictions.ts` |
| Source-clock countdown | Local clock, shown without target | Source-time estimate, hidden without authoritative target | `hooks/use-game-data.ts` and prediction views |
| Actual data fetch | 465 ms for 10 valid rows | Same measurement method | Live upstream snapshot; not a controlled benchmark |
| Current 2,000-pattern analysis | 50 ms | Same measurement method | Single direct Node analysis on snapshot |
| Walk-forward backtest | 151 ms | Same measurement method | 5 forecasts |

Initial and final full-page browser performance, concurrent-user latency, Firebase latency, and Lighthouse/Core Web Vitals were not measured. This report makes no performance guarantee.
