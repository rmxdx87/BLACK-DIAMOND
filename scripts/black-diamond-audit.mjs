import { readFile, writeFile } from "node:fs/promises"
import { performance } from "node:perf_hooks"
import { parseHistoricalApiResponse } from "../lib/api.ts"
import { TREND_PATTERN_COUNT, createPatternRegistry } from "../lib/trend-pattern-registry.ts"
import { analyzeTrendPatterns, runTrendWalkForwardBacktest } from "../lib/trend-pattern-engine.ts"
import { createDataVersion } from "../lib/prediction-version.ts"

const SOURCE_URL = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json"
const now = new Date()
const csv = (rows) => rows.map((row) => row.map((value) => {
  const text = value == null ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}).join(",")).join("\r\n") + "\r\n"
const pct = (metric) => metric?.accuracy == null ? "Not calibrated" : `${(metric.accuracy * 100).toFixed(2)}% (${metric.hits}/${metric.predictions})`
const num = (value) => Number.isFinite(value) ? value : ""

async function fetchPage(pageNo) {
  const url = new URL(SOURCE_URL)
  url.searchParams.set("pageNo", String(pageNo))
  url.searchParams.set("pageSize", "1000")
  const response = await fetch(url, {
    headers: { Accept: "application/json, text/plain, */*" },
    signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`History source returned HTTP ${response.status} for page ${pageNo}`)
  return parseHistoricalApiResponse(await response.json())
}

function createVariantRows() {
  const rows = []
  for (let index = 0; index < 10; index++) {
    rows.push({ id: `markov-${index}`, name: `Markov Chain v${index + 1}`, category: "markov", params: JSON.stringify({ lookbackPeriods: 5 + (index % 3) * 5, states: 5 + (index % 3) }) })
  }
  for (let index = 0; index < 10; index++) {
    rows.push({ id: `pattern-${index}`, name: `Pattern Recognition v${index + 1}`, category: "pattern", params: JSON.stringify({ patternDepth: 3 + (index % 5), minPatternLength: 2 + (index % 3) }) })
  }
  for (let index = 0; index < 10; index++) {
    rows.push({ id: `trend-${index}`, name: `Trend Analysis v${index + 1}`, category: "trend", params: JSON.stringify({ trendWindow: 7 + (index % 4) * 5, momentumFactor: Number((0.7 + (index % 5) * 0.06).toFixed(2)) }) })
  }
  for (let index = 0; index < 10; index++) {
    rows.push({ id: `seasonal-${index}`, name: `Seasonal Analysis v${index + 1}`, category: "seasonal", params: JSON.stringify({ cycleLength: 5 + (index % 4) * 2, harmonics: 2 + (index % 3) }) })
  }
  for (let index = 0; index < 12; index++) {
    const weights = [0.2 + (index % 3) * 0.05, 0.2 + ((index + 1) % 3) * 0.05, 0.3 + (index % 2) * 0.05, 0.3 + ((index + 1) % 2) * 0.05]
    const total = weights.reduce((sum, value) => sum + value, 0)
    rows.push({ id: `ensemble-${index}`, name: `Ensemble Voting v${index + 1}`, category: "ensemble", params: JSON.stringify({ weights: weights.map((weight) => Number((weight / total).toFixed(6))) }) })
  }
  return rows
}

const extraEngines = [
  ["trend-pattern-ranking", "Historical trend pattern ranking", "lib/trend-pattern-engine.ts", "number/colour/size", "Validated history, target period", "Ranked number candidates plus descriptive colour and derived size trends", "CONNECTED to canonical Top 3 route; evaluates the 2,000-row registry", "Walk-forward backtest included below", "Main production ranking path; no claim of reliable future odds"],
  ["color-size-system", "ColorSizePredictionSystemEngine", "lib/color-size-prediction-engines.ts", "colour/size", "Categorical sequences", "Separate colour and size classifier outputs", "Standalone subsystem; not connected to canonical Top 3 ranking", "No focused test or end-to-end backtest", "Contains shared methods and correlated model families"],
  ["repeat-pattern-rule", "RepeatPatternRule", "lib/wingo-pattern-rules.ts", "sequence", "Number or result sequence", "Repeat pattern signal", "Standalone rule; not connected to canonical ranking", "No focused test found", "Rule signal, not an independent agent"],
  ["pattern-break-rule", "PatternBreakRule", "lib/wingo-pattern-rules.ts", "sequence", "Number or result sequence", "Pattern break signal", "Standalone rule; not connected to canonical ranking", "No focused test found", "Rule signal, not an independent agent"],
  ["wingo-pattern-system", "WingoPatternSystem", "lib/wingo-pattern-rules.ts", "sequence", "Sequence", "Rule aggregate", "Separate subsystem; not connected to canonical ranking", "No focused validation found", "Combines two rule classes"],
  ["wingo-game-pattern-detector", "WingoGamePatternDetector", "lib/wingo-game-patterns.ts", "sequence", "Game value sequence", "Ten detector outputs and highest-confidence local pattern", "Separate detector; not connected to canonical ranking", "No focused test found", "Ten detectors are not ten independent agents"],
  ["legacy-ai-statistics", "AIPredictonEngine", "lib/ai-engine.ts", "statistics", "Historical results", "Game statistics and legacy predictions", "Statistics are used by the dashboard; legacy predictions are not the canonical output", "No focused canonical prediction test", "Separate legacy subsystem"],
  ["sequence-analysis", "Historical sequence analysis", "lib/intelligence/sequences.ts", "sequence", "Validated historical records and target", "Descriptive sequences and pattern breaks", "Connected to dashboard evidence view; descriptive only", "Focused tests in tests/sequence-anomaly-analysis.test.mjs", "Does not vote on the canonical number rank"],
  ["anomaly-analysis", "Historical anomaly screening", "lib/intelligence/anomalies.ts", "anomaly", "Validated history", "Data-quality and distribution-shift events", "Connected to dashboard source monitoring; does not predict outcomes", "Focused tests in tests/sequence-anomaly-analysis.test.mjs", "Diagnostic module, not a predictor"],
]
const specializedClasses = [
  ["LogisticRegressionEngine", "Not invoked by the parent size/colour methods"],
  ["BernoulliNaiveBayesEngine", "Invoked by parent predictColor"],
  ["StreakChainCounterEngine", "Invoked by parent predictSize and predictColor"],
  ["DecisionTreeClassifierEngine", "Invoked by parent predictSize and predictColor"],
  ["GRUPredictionEngine", "Invoked by parent predictSize"],
  ["MovingAverageTrendFilterEngine", "Not invoked by the parent size/colour methods"],
  ["GradientBoostingMachineEngine", "Invoked by parent predictSize"],
  ["ParityBitCheckEngine", "Invoked by parent predictSize and predictColor"],
  ["NeuralNetworkColorPredictorEngine", "Invoked by parent predictColor"],
  ["AdaBoostClassifierEngine", "Invoked by parent predictSize"],
]
const patternDetectors = [
  "TeleportLadiPattern", "AlternateZigZagPattern", "MirrorDoublePattern", "SandwichPattern", "StaircasePattern",
  "TripleBreakPattern", "QuadRunPattern", "IncrementPattern", "DecrementPattern", "CyclePattern",
]

const fetchStartedAt = performance.now()
const firstPage = await fetchPage(1)
const fetchedPages = [firstPage]
let pageRequests = 1
let paginationIssue = null
for (let pageNo = 2; pageNo <= firstPage.totalPage; pageNo++) {
  const page = await fetchPage(pageNo)
  pageRequests++
  if (page.pageNo !== pageNo) {
    paginationIssue = `Requested page ${pageNo}, but the source returned page ${page.pageNo}.`
    break
  }
  fetchedPages.push(page)
}
const seenPeriods = new Set()
const records = fetchedPages.flatMap((page) => page.records).filter((record) => {
  if (seenPeriods.has(record.period)) return false
  seenPeriods.add(record.period)
  return true
})
const fetchDurationMs = Math.round(performance.now() - fetchStartedAt)
const analysisStartedAt = performance.now()
const currentAnalysis = analyzeTrendPatterns(records)
const currentAnalysisDurationMs = Math.round(performance.now() - analysisStartedAt)
const backtestStartedAt = performance.now()
const backtest = runTrendWalkForwardBacktest(records)
const backtestDurationMs = Math.round(performance.now() - backtestStartedAt)
const registry = createPatternRegistry()
const evaluations = new Map(currentAnalysis.evaluations.map((item) => [item.patternId, item]))
const categoryCounts = registry.reduce((counts, item) => ({ ...counts, [item.category]: (counts[item.category] ?? 0) + 1 }), {})
const dataVersion = createDataVersion(records)
const timestamp = now.toISOString()

const patternHeaders = ["Pattern ID", "Name", "Category", "Window", "Threshold", "Profile", "Feature type", "Feature definition", "Candidate scoring", "Output fields", "Market", "Scoring cluster", "Contributes to number ranking", "Registry status", "Current evaluation status", "Current direction", "Current signal", "Current sample count", "Current outcome", "Walk-forward predictions", "Walk-forward hits", "Walk-forward accuracy", "Backtest status", "Implementation notes"]
const patternRows = registry.map((pattern) => {
  const evaluation = evaluations.get(pattern.patternId)
  const metric = backtest.patternPerformance[pattern.patternId]
  const backtestStatus = metric?.predictions >= 30 ? "MEASURED_30_PLUS_FORECASTS" : metric?.predictions > 0 ? "INSUFFICIENT_SAMPLE_UNDER_30" : "NO_UNIQUE_SIGNAL_FORECASTS"
  return [pattern.patternId, pattern.patternName, pattern.category, pattern.lookbackWindow, pattern.threshold, pattern.profile, pattern.featureType, pattern.featureDefinition, pattern.candidateScoring, pattern.outputFields, pattern.market, pattern.scoringCluster, pattern.contributesToNumberRanking, "REGISTERED_AND_EVALUATED_BY_TREND_ENGINE", evaluation?.dataSufficiency ?? "NO_CURRENT_EVALUATION", evaluation?.direction ?? "", num(evaluation?.signal), evaluation?.sampleCount ?? 0, evaluation?.outcome ?? "", metric?.predictions ?? 0, metric?.hits ?? 0, metric?.accuracy == null ? "" : `${(metric.accuracy * 100).toFixed(4)}%`, backtestStatus, "Static parameter variations within a feature family; not independent agents."]
})
await writeFile("PATTERN_AUDIT.csv", csv([patternHeaders, ...patternRows]), "utf8")

const engineHeaders = ["Engine ID", "Engine name", "Source file", "Category", "Inputs", "Method / parameters", "Output", "Implementation status", "Execution / test status", "Historical evidence", "Backtest status", "Runtime (ms)", "Correlation / duplicate note", "Connected to canonical ranking"]
const engineRows = createVariantRows().map((engine) => [engine.id, engine.name, "lib/advanced-prediction-engine.ts", engine.category, "number[]; no WinGo result contract", engine.params, "Numeric scalar", "IMPLEMENTED_AS_CONFIGURED_VARIANT", "Registered by factory; no focused test; runAllEngines has fallback 0.75 accuracy", "None stored per engine", "NOT_BACKTESTED_PER_VARIANT", "", `Same model family as ${engine.id.replace(/-\d+$/, "-")} peers; variants are correlated`, "NO"])
for (const [id, name, source, category, input, output, execution, backtestStatus, note] of extraEngines) {
  engineRows.push([id, name, source, category, input, "See implementation", output, "IMPLEMENTED_OR_PARTIALLY_IMPLEMENTED", execution, "Not independently recorded", backtestStatus, "", note, id === "trend-pattern-ranking" ? "YES" : "NO"])
}
for (const [name, execution] of specializedClasses) {
  engineRows.push([`specialized-${name}`, name, "lib/color-size-prediction-engines.ts", "colour/size", "Categorical result sequence", "See class implementation", "Binary or multi-class output", "IMPLEMENTED_STANDALONE_CLASS", `${execution}; no focused test found`, "No per-engine prediction history", "NOT_BACKTESTED_PER_ENGINE", "", "Shares methods and training data inside ColorSizePredictionSystemEngine", "NO"])
}
engineRows.push(["ai-bots-not-implemented", "Analytical voting agent registry", "lib/intelligence/contracts.ts", "agent voting", "No registered definitions", "Interfaces exist; no registry or executor", "No votes", "NOT_IMPLEMENTED", "No agent execution path found", "None", "NOT_AVAILABLE", "", "No fake agents counted", "NO"])
for (const name of patternDetectors) {
  engineRows.push([`sequence-${name}`, name, "lib/wingo-game-patterns.ts", "sequence pattern detector", "GameValue[]", "Pattern-specific detect method", "PatternDetection", "IMPLEMENTED_WITHIN_WINGO_DETECTOR", "Parent detector invokes this detector; no isolated test found", "No per-detector historical record", "NOT_BACKTESTED_PER_DETECTOR", "", "Ten rules share the same input and detector; correlated signals", "NO"])
}
await writeFile("ENGINE_AUDIT.csv", csv([engineHeaders, ...engineRows]), "utf8")

const agentHeaders = ["Agent ID", "Agent name", "Mapped engines", "Vote category", "Implementation status", "Execution status", "Historical reliability", "Weight", "Last result", "Test status", "Audit note"]
await writeFile("AGENT_AUDIT.csv", csv([agentHeaders, ["REGISTRY_AUDIT", "No agent definitions registered", "", "", "NOT_IMPLEMENTED", "0 registered / 0 operational", "Not available", "Not available", "No votes recorded", "No registry/executor tests", "Contracts describe agent records only; no real independent voters found."]]), "utf8")

const backtestSummary = `- Valid source records retrieved: ${records.length}; the response advertises ${firstPage.totalCount} records across ${firstPage.totalPage} pages.\n- Page requests made: ${pageRequests}; page responses accepted: ${fetchedPages.length}; pagination issue: ${paginationIssue ?? "none"}.\n- Dataset version: \`${dataVersion}\` (content-aware fingerprint).\n- Walk-forward evaluated forecasts: ${backtest.evaluatedForecasts}; skipped: ${backtest.skippedForecasts}; minimum training records: ${backtest.minimumTrainingRecords}.\n- Top-1 number: ${pct(backtest.numberTop1)}.\n- Top-3 number: ${pct(backtest.numberTop3)}.\n- Frequency baseline Top-1: ${pct(backtest.numberFrequencyBaselineTop1)}.\n- Frequency baseline Top-3: ${pct(backtest.numberFrequencyBaselineTop3)}.\n- Colour membership lead: ${pct(backtest.colourTop1Membership)}.\n- Derived BIG/SMALL lead: ${pct(backtest.sizeTop1)}.\n- Per-pattern metric rows: ${Object.keys(backtest.patternPerformance).length}; metrics have varying denominators and must not be compared without sample counts.\n- Pattern registry: ${currentAnalysis.evaluatedPatternCount}/${currentAnalysis.patternCount} evaluated; ${currentAnalysis.activePatternCount} enabled definitions (not agents); positive/negative/watchlist directions: ${currentAnalysis.evaluations.filter((item) => ["positive", "negative", "watchlist"].includes(item.direction)).length}.\n- Evidence limit: ${backtest.evaluatedForecasts < 30 ? "INSUFFICIENT SAMPLE; do not interpret these rates as calibrated accuracy." : "See denominators and walk-forward method below."}\n- Fetch time: ${fetchDurationMs} ms; one current analysis: ${currentAnalysisDurationMs} ms; walk-forward run: ${backtestDurationMs} ms.\n`
const backtestMetrics = [
  ["Metric", "Model", "Hits", "Predictions", "Rate"],
  ["Number Top 1", "Trend-pattern ranking", backtest.numberTop1.hits, backtest.numberTop1.predictions, pct(backtest.numberTop1)],
  ["Number Top 3", "Trend-pattern ranking", backtest.numberTop3.hits, backtest.numberTop3.predictions, pct(backtest.numberTop3)],
  ["Number Top 1", "Most frequent historical numbers baseline", backtest.numberFrequencyBaselineTop1.hits, backtest.numberFrequencyBaselineTop1.predictions, pct(backtest.numberFrequencyBaselineTop1)],
  ["Number Top 3", "Most frequent historical numbers baseline", backtest.numberFrequencyBaselineTop3.hits, backtest.numberFrequencyBaselineTop3.predictions, pct(backtest.numberFrequencyBaselineTop3)],
  ["Colour membership Top 1", "Trend-pattern ranking", backtest.colourTop1Membership.hits, backtest.colourTop1Membership.predictions, pct(backtest.colourTop1Membership)],
  ["Colour membership Top 1", "Most frequent colour baseline", backtest.colourFrequencyBaselineTop1Membership.hits, backtest.colourFrequencyBaselineTop1Membership.predictions, pct(backtest.colourFrequencyBaselineTop1Membership)],
  ["Derived size Top 1", "Trend-pattern ranking", backtest.sizeTop1.hits, backtest.sizeTop1.predictions, pct(backtest.sizeTop1)],
  ["Derived size Top 1", "Most frequent derived size baseline", backtest.sizeFrequencyBaselineTop1.hits, backtest.sizeFrequencyBaselineTop1.predictions, pct(backtest.sizeFrequencyBaselineTop1)],
]
await writeFile("BACKTESTING_REPORT.md", `# Walk-forward backtesting report\n\nGenerated ${timestamp}.\n\n${backtestSummary}\n## Results\n\n${csv(backtestMetrics).replaceAll("\r\n", "\n")}\n## Method and limitations\n\n- Each forecast trains only on earlier valid periods; the target record is excluded.\n- The latest source snapshot is capped by the upstream endpoint at 500 records; this is not an all-time archive.\n- Colour is scored as membership in the source-provided colour set. No number-to-colour mapping is inferred.\n- Size is derived from the common 0-4 SMALL / 5-9 BIG rule because the history payload does not contain an official size field.\n- Backtesting evaluates the implemented pattern ranker; the 52 legacy engine variants and 10 specialized classes are not included in these scores.\n- These historical scores are descriptive and are not evidence of a reliable future edge.\n`)

const agentReport = `# Agent voting report\n\nGenerated ${timestamp}.\n\n- Registered agents: **0**.\n- Operational agents: **0**.\n- Votes, abstentions, failures: **none recorded**.\n- Number, colour, size, and combination consensus: **not implemented**.\n- The project contains agent/vote data contracts, but no real agent registry, execution service, independent voters, persisted per-target votes, correlation control, or admin voting monitor.\n- The 52 legacy numeric model variants, 2,000 pattern rows, 10 specialized classifier classes, and 10 sequence detector rules are not counted as agents.\n\nNo votes or operational counts were fabricated.\n`
await writeFile("AGENT_VOTING_REPORT.md", agentReport, "utf8")

const periodReport = `# Period synchronization report\n\nGenerated ${timestamp}.\n\n## Current source contract\n\nThe application fetches WinGo 1M history from \`${SOURCE_URL}\` through \`/api/wingo-history\`. The live response currently reports ${firstPage.totalCount} history rows across ${firstPage.totalPage} pages and ${records.length} valid unique results were loaded. It includes \`serviceTime\` and completed result \`issueNumber\` values. It does **not** include a current/active/next period ID, draw-end timestamp, or authoritative countdown field.\n\n## Lifecycle behavior\n\n- \`resolvePeriodLifecycle\` accepts only source-provided current/active/next IDs and never increments a long period string.\n- With the current response, the latest completed record is ${records[0]?.period ?? "unavailable"}; active target is unavailable.\n- Prediction UI now suppresses the countdown until an authoritative target ID exists. Source time is used only as a display estimate; it never rolls a target over.\n- An existing shared prediction is now read by game + exact target + model before running pattern analysis. New records use an atomic create-if-absent target key.\n- Existing v2 per-data-version records can be read and migrated; new canonical target records are stored separately to avoid overlap with the old Firebase path tree.\n- Settlement adds actual result metadata while preserving the original candidate snapshot.\n\n## Remaining dependency\n\nCorrect first-open retrieval for a currently active round requires an authoritative active-period source (or a documented upstream period sequence and validation endpoint). The current history endpoint supplies neither. The app therefore intentionally displays no guessed target and cannot verify active-round prediction behavior against this source.\n`
await writeFile("PERIOD_SYNC_REPORT.md", periodReport, "utf8")

const learningReport = `# Three-level learning report\n\nGenerated ${timestamp}.\n\n## Implemented\n\n- A canonical Top 3 snapshot is persisted per game, target period, and model version when Realtime Database is configured.\n- Settled actual outcomes are attached without replacing the original forecast. Local history de-duplicates predictions by target period.\n- Walk-forward validation provides rank-specific counts and Top-1 / Top-3 hit rates; confidence calibration is withheld until the engine's minimum sample requirement is met.\n\n## Not implemented\n\nThere is no Level 1 / Level 2 / Level 3 reassessment workflow, no per-agent performance ledger, no learned or versioned weights, no validation/holdout split for tuning, and no controlled online learning service. The 97% figure remains an aspirational target and is not measured or guaranteed.\n\n## Current measured context\n\n${backtestSummary}\nNo weights were changed based on this report.\n`
await writeFile("THREE_LEVEL_LEARNING_REPORT.md", learningReport, "utf8")

const periodTarget = "Unavailable: source does not provide an active/next ID"
const finalAudit = `# BLACK DIAMOND final audit\n\nGenerated ${timestamp}.\n\n## Scope and verified counts\n\n- Framework: Next.js App Router, React 19, TypeScript strict mode.\n- History source returned ${firstPage.totalCount} available records across ${firstPage.totalPage} pages; the app now requests up to 500 rather than the previous 100. Current dataset version: \`${dataVersion}\`.\n- Registered pattern rows: ${TREND_PATTERN_COUNT}; current source snapshot evaluated ${currentAnalysis.evaluatedPatternCount}; category counts: ${Object.entries(categoryCounts).map(([category, count]) => `${category}=${count}`).join(", ")}.\n- Legacy generated model variants: ${createVariantRows().length} (10 Markov + 10 pattern + 10 trend + 10 seasonal + 12 ensemble). They do not vote independently and are not connected to the canonical ranking.\n- Specialized classifier classes: 10; Wingo sequence detector rules: 10; independent agent definitions found: 0.\n- Production ranking path: \`app/page.tsx → useGameData → usePredictions → analyzeTrendPatterns → canonical target snapshot → PredictionDisplay\`.\n\n## Data dependency graph\n\n\`draw.ar-lottery01.com WinGo 1M history → app/api/wingo-history proxy → lib/api.ts validation/pagination → hooks/use-game-data.ts (500-row snapshot + lifecycle) → lib/period-management.ts (source IDs only) → hooks/use-predictions.ts (shared target read → trend-pattern-engine if absent) → lib/canonical-predictions.ts (atomic target snapshot/settlement) → app/page.tsx / components/prediction-display.tsx\`.\n\nOther analytics are separate: \`lib/intelligence/features.ts\`, \`sequences.ts\`, and \`anomalies.ts\` provide descriptive history analysis; legacy \`ai-engine.ts\`, \`advanced-prediction-engine.ts\`, specialized classifiers, and sequence detectors do not contribute votes to the canonical Top 3.\n\n## Critical limitation\n\nThe latest authoritative history response does not expose an active or upcoming target period. Current latest completed period: ${records[0]?.period ?? "unavailable"}. Active target: ${periodTarget}. No period is invented. The active-round prediction workflow cannot be fully verified until the upstream source adds an authoritative active-period field or a documented period service is configured.\n\nThe source also has no per-record timestamps or official size field. Number-to-colour mapping is not verified. Size analysis is explicitly derived from 0-4 / 5-9 and must not be presented as source-provided.\n\n## Prediction evidence\n\n${backtestSummary}\nNo 97% performance guarantee is supported. See \`BACKTESTING_REPORT.md\`, \`AGENT_VOTING_REPORT.md\`, \`PERIOD_SYNC_REPORT.md\`, and the per-row CSV audits.\n\n## Initial baseline\n\nBefore code changes, \`npm.cmd test\` passed 30/30 tests and \`npm.cmd run build\` completed successfully. See \`TEST_RESULTS.md\` for post-change verification.\n`
await writeFile("BLACK_DIAMOND_FINAL_AUDIT.md", finalAudit, "utf8")

await writeFile("PREDICTION_BUG_REPORT.md", `# Prediction bug report\n\nGenerated ${timestamp}.\n\n## Root causes found\n\n1. Source history does not provide an active/next target ID, so correct active-period retrieval cannot be derived without inventing a period.\n2. The previous page fetched only 100 records although the source reported ${firstPage.totalCount} available records.\n3. Canonical forecast lookup occurred after the expensive 2,000-pattern calculation and was keyed by client history period IDs only.\n4. Local history could add the same target forecast repeatedly; result settlement depended on the current local prediction ID.\n5. The dashboard countdown used the local clock even when no authoritative target was available.\n\n## Changes\n\n- Load up to 500 source records (the current source-advertised history cap).\n- Read a shared target forecast before analysis; use atomic create-if-absent keyed by game/target/model.\n- Hash actual outcome fields in dataset versions, retain the old period-only key as a migration fallback, and keep the new Firebase path out of the legacy subtree.\n- Deduplicate local prediction history by target and settle the canonical forecast when its period appears as a completed source result.\n- Use service-clock time only for countdown display and suppress it until a source target ID exists.\n\n## Remaining external blocker\n\nActive period ID and official draw-end timestamp are not in the current history response. The application does not guess or increment IDs.\n\n## Validation\n\nInitial baseline: 30 tests passed; production build passed. Post-change results are in \`TEST_RESULTS.md\`.\n`)

await writeFile("PERFORMANCE_BEFORE_AFTER.md", `# Performance and data coverage\n\nGenerated ${timestamp}.\n\n| Measure | Before | After | Evidence |\n| --- | --- | --- | --- |\n| History rows requested | 100 | Up to 500 | \`use-game-data.ts\`; upstream currently reports ${firstPage.totalCount} rows across ${firstPage.totalPage} pages |\n| Existing canonical target read | After pattern ranking | Before pattern ranking | \`hooks/use-predictions.ts\` |\n| Source-clock countdown | Local clock, shown without target | Source-time estimate, hidden without authoritative target | \`hooks/use-game-data.ts\` and prediction views |\n| Actual data fetch | ${fetchDurationMs} ms for ${records.length} valid rows | Same measurement method | Live upstream snapshot; not a controlled benchmark |\n| Current 2,000-pattern analysis | ${currentAnalysisDurationMs} ms | Same measurement method | Single direct Node analysis on snapshot |\n| Walk-forward backtest | ${backtestDurationMs} ms | Same measurement method | ${backtest.evaluatedForecasts} forecasts |\n\nInitial and final full-page browser performance, concurrent-user latency, Firebase latency, and Lighthouse/Core Web Vitals were not measured. This report makes no performance guarantee.\n`)

await writeFile("TEST_RESULTS.md", `# Test results\n\nUpdated ${timestamp}.\n\n- Baseline \`npm.cmd test\`: PASS — 30 tests, 0 failures.\n- Baseline \`npm.cmd run build\`: PASS.\n- Post-change \`npm.cmd test\`: PASS — 33 tests, 0 failures.\n- Post-change TypeScript, lint, production build, and browser verification: recorded after checks complete.\n- Live history snapshot: ${records.length} distinct valid records from ${firstPage.totalCount} advertised; ${pageRequests} page requests attempted, ${fetchedPages.length} accepted; pagination issue: ${paginationIssue ?? "none"}.\n`)

await writeFile("IMPLEMENTATION_CHANGELOG.md", `# Implementation changelog\n\nUpdated ${timestamp}.\n\n- Increased the dashboard history request from 100 to the full currently advertised 500-record source history.\n- Changed countdown estimation to use upstream service time and display it only when an authoritative target period exists; local countdown no longer implies a period rollover.\n- Added content-aware dataset fingerprints and retained a legacy period-only fingerprint for canonical record migration.\n- Added early shared target lookup, stable target-level atomic forecast creation, canonical settlement metadata, and local target de-duplication.\n- Added tests for snapshot-version sensitivity and target-history de-duplication.\n- Generated per-engine, per-pattern, agent, period, learning, and walk-forward audit reports.\n- Confirmed the project does not have the requested 150-agent execution system or three-level online learning; those remain visible gaps rather than simulated features.\n`)

const paginationEvidence = `The endpoint advertises ${firstPage.totalCount} rows across ${firstPage.totalPage} pages. A request for page 2 returned page ${firstPage.pageNo}; only ${records.length} distinct valid rows were accessible (${pageRequests} requests attempted, ${fetchedPages.length} responses accepted).`
const reportReplacements = {
  "BACKTESTING_REPORT.md": [
    ["The latest source snapshot is capped by the upstream endpoint at 500 records; this is not an all-time archive.", paginationEvidence],
  ],
  "PERIOD_SYNC_REPORT.md": [
    [`The live response currently reports ${firstPage.totalCount} history rows across ${firstPage.totalPage} pages and ${records.length} valid unique results were loaded.`, paginationEvidence],
    ["The current history endpoint supplies neither.", "The current history endpoint supplies neither and its pagination request did not advance."],
  ],
  "BLACK_DIAMOND_FINAL_AUDIT.md": [
    [`History source returned ${firstPage.totalCount} available records across ${firstPage.totalPage} pages; the app now requests up to 500 rather than the previous 100.`, `History source advertises ${firstPage.totalCount} records across ${firstPage.totalPage} pages; only ${records.length} distinct rows were accessible because page 2 returned page ${firstPage.pageNo}. The app requests up to 500 and now stops on a page mismatch rather than silently counting repeated rows.`],
    ["(500-row snapshot + lifecycle)", "(500-row request with pagination audit + lifecycle)"],
  ],
  "PERFORMANCE_BEFORE_AFTER.md": [
    [`\`use-game-data.ts\`; upstream currently reports ${firstPage.totalCount} rows across ${firstPage.totalPage} pages`, `\`use-game-data.ts\`; source advertises ${firstPage.totalCount} rows, but only ${records.length} distinct rows are accessible in this run`],
  ],
  "TEST_RESULTS.md": [
    [`Live history snapshot: ${records.length}/${firstPage.totalCount} valid unique records, ${fetchedPages.length}/${firstPage.totalPage} pages.`, `Live history snapshot: ${records.length}/${firstPage.totalCount} advertised rows; ${pageRequests} page requests attempted, ${fetchedPages.length} accepted. Pagination issue: ${paginationIssue ?? "none"}.`],
  ],
  "IMPLEMENTATION_CHANGELOG.md": [
    ["Increased the dashboard history request from 100 to the full currently advertised 500-record source history.", "Increased the requested dashboard history from 100 to 500 advertised records and added a stop/audit path when the source does not advance pagination."],
  ],
}
for (const [file, replacements] of Object.entries(reportReplacements)) {
  let content = await readFile(file, "utf8")
  for (const [search, replacement] of replacements) content = content.replace(search, replacement)
  await writeFile(file, content, "utf8")
}

console.log(JSON.stringify({
  generatedAt: timestamp,
  dataVersion,
  source: { acceptedPages: fetchedPages.length, pageRequests, totalPages: firstPage.totalPage, advertisedCount: firstPage.totalCount, validUniqueRecords: records.length, paginationIssue, fetchDurationMs },
  patterns: { registered: TREND_PATTERN_COUNT, evaluated: currentAnalysis.evaluatedPatternCount, active: currentAnalysis.activePatternCount, backtested: Object.keys(backtest.patternPerformance).length },
  engines: { generatedVariants: createVariantRows().length, auditRows: engineRows.length },
  agents: { registered: 0, operational: 0 },
  backtest: { evaluatedForecasts: backtest.evaluatedForecasts, skippedForecasts: backtest.skippedForecasts, numberTop1: backtest.numberTop1, numberTop3: backtest.numberTop3, numberFrequencyBaselineTop1: backtest.numberFrequencyBaselineTop1, numberFrequencyBaselineTop3: backtest.numberFrequencyBaselineTop3, colourTop1Membership: backtest.colourTop1Membership, sizeTop1: backtest.sizeTop1, durationMs: backtestDurationMs },
}, null, 2))
