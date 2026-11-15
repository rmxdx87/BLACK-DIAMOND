# Test results

Updated 2026-11-14T15:18:42.781Z.

- Baseline `npm.cmd test`: PASS — 30 tests, 0 failures.
- Baseline `npm.cmd run build`: PASS.
- Post-change `npm.cmd test`: PASS — 33 tests, 0 failures.
- Post-change `npx.cmd tsc --noEmit --pretty false`: PASS.
- Post-change `npm.cmd run build`: PASS; `/`, `/admin`, and `/wingo-1m` generated successfully.
- Post-change `npm.cmd run lint`: FAIL, 116 errors and 85 warnings across the existing project. The targeted touched-file run reports one `react-hooks/set-state-in-effect` issue in `hooks/use-game-data.ts:125` (`fetchData()` from the mount effect); no lint errors in the other targeted changed files.
- HTTP smoke check: `/`, `/admin`, and `/wingo-1m` each returned 200 from localhost:3000. Interactive browser verification could not run because the browser tool reported “No client available”.
- Live history snapshot: 10 distinct valid records from 500 advertised; 2 page requests attempted, 1 accepted; pagination issue: Requested page 2, but the source returned page 1..
