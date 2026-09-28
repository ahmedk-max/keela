# Approved UI/UX refresh — 28 September 2026

The user approved implementing the final floating-layout mockup and publishing it to the existing GitHub Pages app, while keeping the prior design as a backup.

## Implemented

- Original four-circle mark, warm palette and floating expanding pill navigation retained.
- One principal summary card per screen; remaining charts, contribution planning, allocation, notes and lists are unboxed.
- Compact forms with persistent labels and optional date/note sections. Percentages sit alone in rings, with captions beneath.
- Deposit, Withdraw and Spend share one row. New buckets open immediately and accept their first deposit at zero. Current views, pins and the detail switcher simplify navigation.
- Monthly spending by payday cycle, contribution progress and plan breakdowns, daily/category spending, savings history and cost-basis activity remain available.
- All save forms await completion, block repeated submission, retain failed drafts, and report confirmed saves. Draft dismissal requires an explicit discard.
- Bucket and holding movements write their entry and parent balance in one Firestore transaction. Stable operation IDs make retries idempotent. Money-out checks use the current transaction balance; fractional currency and units retain precision.
- Buckets archive and restore without deleting history. Archiving requires a zero balance. Portfolios can be removed while their holdings remain under Unsorted; holdings with activity cannot be casually deleted.
- Loading waits for every required collection. Read failures show a retry state. Offline sessions show a banner and refuse interactive writes until reconnected.
- Backgrounds become inert while dialogs/details are open. Dialogs trap focus, support Escape, and restore focus. Closing timers are cancelled on unmount. Reduced motion is respected; balances no longer count up from zero on every visit.
- Income settings keep salary, validate payday, and save stream additions/removals with the profile in one batch. Existing recurring-income and payday-cycle accounting remain unchanged.

No production financial-record migration or test transactions are part of this release. Demo fixtures and failure simulation are development-only and absent from the production bundle.

## Verification

- Production build and TypeScript check passed.
- Nine automated outcome tests cover strict money/date parsing, first deposit on zero, cent limits, fractional units, sale cost vs proceeds, no staged writes after commit failure, retry after lost acknowledgement, and competing withdrawals. Transaction conflict tests use an in-memory optimistic adapter around the same staging function used by Firestore; they are not an emulator or live-database test.
- Local browser tests: created a bucket, deposited 500.25, withdrew 100.25, spent 50; resulting available balance 350, allocation 400, spending 50. A 350.01 withdrawal was blocked. Withdrew the remaining 350, archived and restored the bucket with all activity retained.
- Switched between buckets; a created holding with 3 units at 100.01 saved 300.03 basis. Selling 1 at 120.50 left 2 units and 200.02 basis, while showing 120.50 proceeds and 100.01 removed cost.
- Added a recurring bill. A simulated failed 25.50 expense retained its fields; retry/double-click produced one row and increased spending once. Repeated the failed-save/retry path for a 0.25 bucket deposit.
- Checked dirty-draft dismissal and rapid double-back. Inspected all five destinations, 320/390/430 px browser widths, both themes, and compact dialog bounds. At 320 px, all three bucket actions were on one line and 44 px high. The expense dialog was 343.5 px high with no horizontal overflow. Browser error log was empty at the final interaction pass.
- Production bundle inspection confirmed that demo notes, failure-switch markers and development-change events were omitted.

Physical iOS keyboard/safe-area behavior, VoiceOver, installed-device service-worker replacement, and real network interruption during a financial write are not certified by the browser checks. No production money actions were used for verification.

## Prior-design backup and rollback

Remote annotated tag: **design-backup-2026-09-28**.

Source commit: **e3357fddd1155045026d4d1d1fe77dc6b3b99a09**.

Backup: https://github.com/ahmedk-max/keela/tree/design-backup-2026-09-28

To restore the prior interface, start a new branch from the latest main, restore the `web` directory from the backup tag, build it, and commit the restoration. Push the reviewed restoration to main to trigger the same Pages deployment. Keep the release's tests/workflow in sync: the prior `web/package.json` has no test script, so remove the `npm test` deployment step when restoring that package.

Example commands, from a clean checkout:

```sh
git fetch origin --tags
git switch -c codex/restore-prior-design origin/main
git restore --source=design-backup-2026-09-28 --staged --worktree web
# Remove the npm test line added to .github/workflows/deploy.yml for this release.
npm ci --prefix web
npm run build --prefix web
git add web .github/workflows/deploy.yml
git commit -m "Restore prior Keela design"
```

Then merge that restoration commit to main and push normally. Do not rewrite remote history. Restoring source does not restore or change Firestore records; archived/pinned/monthly-plan fields are additive and no bulk status migration was performed.
