# Walk-forward backtesting report

Generated 2026-11-14T15:18:42.781Z.

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

## Results

"Metric","Model","Hits","Predictions","Rate"
"Number Top 1","Trend-pattern ranking","1","5","20.00% (1/5)"
"Number Top 3","Trend-pattern ranking","2","5","40.00% (2/5)"
"Number Top 1","Most frequent historical numbers baseline","0","5","0.00% (0/5)"
"Number Top 3","Most frequent historical numbers baseline","1","5","20.00% (1/5)"
"Colour membership Top 1","Trend-pattern ranking","1","5","20.00% (1/5)"
"Colour membership Top 1","Most frequent colour baseline","2","5","40.00% (2/5)"
"Derived size Top 1","Trend-pattern ranking","3","5","60.00% (3/5)"
"Derived size Top 1","Most frequent derived size baseline","2","5","40.00% (2/5)"

## Method and limitations

- Each forecast trains only on earlier valid periods; the target record is excluded.
- The endpoint advertises 500 rows across 50 pages. A request for page 2 returned page 1; only 10 distinct valid rows were accessible (2 requests attempted, 1 responses accepted).
- Colour is scored as membership in the source-provided colour set. No number-to-colour mapping is inferred.
- Size is derived from the common 0-4 SMALL / 5-9 BIG rule because the history payload does not contain an official size field.
- Backtesting evaluates the implemented pattern ranker; the 52 legacy engine variants and 10 specialized classes are not included in these scores.
- These historical scores are descriptive and are not evidence of a reliable future edge.
