# Contribution and production polish

Implemented after the initial refresh. The user approved this build and explicitly requested production deployment on 28 September 2026.

## Behavior

- Monthly contribution compares the calculated funding requirement with the existing recurring-income savings budget. It does not use recorded deposits or the optional personal plan as the requirement.
- Active replenishment uses current available balance, including goals with spending history. Remaining targets are divided by months from the current payday-cycle month to the deadline; due/overdue amounts are required now. Each requirement rounds up to SAR.
- Missing deadlines remain null and make the aggregate explicitly incomplete. New buckets no longer receive an invented current-month deadline. Native date/month input events update the form before saving.
- Display phases are Active, Ready, In use, Paused, Completed and Archived. Used buckets at zero complete automatically; new empty buckets stay Active. Deposits reopen used buckets. Archived takes precedence, followed by completion, pause, active replenishment, then ready/in-use funding stages. Legacy stored statuses are retained.
- Buckets are grouped by phase. Pins sort within each group, then deadline and name. Paused and Completed start collapsed. Archive lives in the header menu and has direct restore with inline error handling and duplicate-submit protection.
- Shared page/detail/sheet gutters are 20px; section spacing is 24px and rows use 14px vertical padding. Whole-row buttons retain their padding and dividers. Large numbers stay readable beside rings and in legends.
- Assets retains its portfolio/holding structure and cost-basis accounting, with quieter rows and one overview cost-basis label. Short transitions cover navigation, progress, interactions and regrouping; reduced motion is respected.

## Verification

- 17 automated tests pass, including replenishment after spending, missing/deadline boundaries, zero budget, shortfall, completed/reopened goals, payday rollover, sorting and existing transactional money tests.
- Type checking and production build pass. Vite reports its existing large-chunk warning; no build failure.
- Read-only verification with the new helper against current live records: 4,389 SAR required, 13,919 SAR savings budget, 32% needed, 9,530 SAR budget remainder. This is a planning comparison, not an account reconciliation.
- Main-screen gallery: all five destinations at 320, 390 and 430px in both themes, with no horizontal overflow and consistent 20px gutters. Portfolio, holding, session and bucket details, the contribution breakdown and shared expense/holding/bucket forms were also checked at all three widths in both themes (48 detail/form checks).
- Synthetic browser flow: create, fund, fully spend, automatically complete, archive, restore and deposit to reopen; history retained. Over-balance withdrawals stay disabled. Missing deadlines remain explicit; setting a deadline updates the requirement, while a personal plan of zero does not suppress it. Home and Buckets produce identical contribution summaries.
- Long bucket names and a 1,234,567.89 balance were checked at 320px. Dirty drafts require an explicit discard. Dialog focus containment, Escape and focus restoration were verified. Rapid switching across all five destinations settled on the selected page with no leftover dialog and the expected navigation focus.
- The development-only `web/tests/reduced-motion.html?demo` harness exercises the JavaScript media-query hooks and the existing CSS reduced-motion branches without changing system preferences. Buttons and progress show 0s transitions, the page has no transform, and dialog dismissal restores focus.
- Local screenshots, layout measurements and the comparison gallery are generated under `web/tests/artifacts/polish/` (ignored, not shipped). Open `/tests/artifacts/polish/index.html` on the development server.

Physical iOS keyboard/safe-area behavior, VoiceOver and installed-PWA service-worker replacement still require device verification. No production financial records were changed. The existing Pages deployment and rollback workflow is unchanged.

## Production release and rollback

This release uses the existing `main` push → GitHub Actions → GitHub Pages workflow at https://ahmedk-max.github.io/keela/. The workflow reruns the tests and production build before deploying.

The preceding production revision is `e7493882beec1ead138b95c3b4c0822fd6ce2ea9`, retained by the `production-before-polish-2026-09-28` tag. The earlier `design-backup-2026-09-28` tag also remains intact. To undo only this polish release, revert its commit on the latest `main` and push the resulting restoration commit through the same workflow; do not rewrite remote history. This changes the app source, not financial records.
