# GodX / My Hack API upgrade notes

This source snapshot has an initial safer API adapter update in `lib/api.ts`.

## Changes
- Added typed parsing for the documented `code`, `msg`, `serviceTime`, `data.list`, and pagination metadata fields.
- Preserved `issueNumber` as a string and validates number 0-9.
- Parses comma-separated colours into individual supported colour memberships.
- Keeps premium and sum independent.
- Does not infer size from number; normalized records use `size: null`.
- Removed random mock-data fallback on live API failures.
- Added basic retry, abort-signal, and HTTP 429 handling.

## Not yet verified / remaining work
- External endpoint could not be reached from the build environment, so the live HTTP request and response were not verified.
- Pagination request parameter names are intentionally not guessed. `fetchPage` currently supports page 1 only and explicitly reports that additional-page parameters need a browser Network capture.
- The existing application and prediction/analytics components still have legacy assumptions that `size` is always `big` or `small` and `color` is a single category. They need a coordinated follow-up refactor before this nullable-size adapter is safe to deploy.
- Database persistence of original raw API records, import audit counters, and production sync UI are not yet implemented.
- Dependencies were not installed in this environment; lint, TypeScript, tests, and production build have not been run.

Do not deploy this snapshot as a completed production upgrade until the remaining items are addressed and the full test suite passes.
