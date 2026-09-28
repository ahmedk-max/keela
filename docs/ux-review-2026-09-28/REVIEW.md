# Keela UI/UX review and proposed redesign

**28 September 2026 · historical review and prototype record**

The user subsequently approved implementation and production deployment, with the previous design retained as a backup. See [the release record](RELEASE.md) for the implemented scope, verification and rollback. Statements below about production remaining unchanged describe the earlier proposal stage.

The revised direction is a lively, more compact iPhone interface using Keela’s existing warm visual identity. Monthly spending and contribution charts remain central, with actions alongside them. Buckets should be easy to find, switch between and use at every balance. A form must communicate whether it is editing, saving, saved or failed.

**Revision 2 correction:** The first concept removed too much visual character and was a partial interaction mockup. The revised concept restores rings, monthly spending, contribution progress, savings trends, allocation visuals and warm note styling across all five destinations. Smaller dialogs come from compact rows, lighter typography and collapsed optional fields. The recommendation to hide monthly planning and analytics is superseded by the changes below.

**Latest review direction:** Keep one main summary card per page; charts and lists sit directly on the background. Restore the original floating pill menu and accurate four-circle Keela mark. Remove the visible revision/sample-data banner. Put Deposit, Withdraw and Spend on a single row. Ring centers contain the percentage only, with their descriptions below the circle to prevent crowding. This is the current visual direction and supersedes the boxed sections and full-width bottom bar in earlier concepts.

The interactive concept accompanies this review in the task. It contains synthetic amounts and sample notes, with no connection to the financial database. Production app code and financial records have not been changed.

## What was reviewed

- The current design brief, all five screen families, navigation, sheets, data adaptation, save handlers, theme and motion definitions.
- The running current app at iPhone width using its existing demo route: Home, Spending, Buckets, In use, Assets, bucket creation and dismissal. Notes and settings were also reviewed in source.
- Current primary guidance from Apple, W3C and Nielsen Norman Group.
- The reported new-bucket failure was traced to a definite source-level condition. No production deposit, withdrawal, transaction, creation or deletion was attempted.

This is an expert review and interactive design proposal. It is not a completed user study, an audit of financial balances, or a certification of real-device accessibility. The precise animation problems you experience on your installed PWA still need an on-device regression pass when implementation starts.

## Findings, evidence and proposed response

| Priority | Current behavior and evidence | Proposed response |
|---|---|---|
| Critical | A positive-target bucket with zero balance cannot receive its first deposit. `canMove = balance > 0 || funded` hides the entire action row. [BucketDetail](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Buckets.jsx#L334) | Deposit always available for current buckets. Withdraw and Record spend remain visible, disabled at zero with an explanation. Create opens the returned bucket immediately. |
| Critical | Bucket forms call the async save function and close immediately. [BucketSheet](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Buckets.jsx#L425), [EditBucketSheet](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Buckets.jsx#L481). The same pattern appears in spending forms and asset forms. | Await completion, block duplicate submission, show Saving, preserve fields on failure, offer Retry, and announce success only after a confirmed save. |
| Critical | A bucket movement creates an entry and updates its parent in separate writes. Partial failure can leave history and balance inconsistent. [moveBucket](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/App.tsx#L117) | Commit the movement and balance change atomically. Validate current available funds in a transaction for withdrawals/spending. Give retries a stable operation ID. These are required behavior changes, not just visual changes. |
| High | Withdraw/spend validation checks only that the amount is positive. It neither caps money out to the balance nor strictly rejects malformed decimal strings. [BucketSheet](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Buckets.jsx#L407) | Validate finite positive money to two decimal places; reject malformed input and excessive money out; display balance after the action. Repeat validation at the write boundary. |
| High | “In use” is defined by `status !== 'active' && spent > 0`. An active bucket with spending remains in Saving. Elsewhere, cards and details use `status === 'completed'` for drawdown. [Bucket split](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Buckets.jsx#L218), [detail](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Buckets.jsx#L309) | One Current collection with optional Saving and In use filters. Consistent lifecycle labels, explicit phase policy, and no unexpected disappearance after a movement. |
| High | The secondary action silently changes from Withdraw to Spend when funded, hiding the other intent. [BucketDetail](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Buckets.jsx#L378) | Keep Deposit, Withdraw and Record spend distinct and consistently named. Explain the accounting effect inside each form. |
| High | Buckets are reached after a savings hero, monthly plan, extra statistics and repeated ring charts. Creation sits inside the Saving view. | Keep New in the header, retain a compact monthly contribution panel above the list, and use small rings within rows. The Plan action opens the full breakdown. |
| High | The bottom tab changes width from 1 to 2.3 and labels only the selected destination. [TabBar](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/App.tsx#L50) | Preserve the original floating pill and active-label treatment, as requested in review. Keep button elements mounted for a smooth size transition, provide an accessible name for every destination, and preserve navigation state and scroll position in implementation. |
| High | Re-entering screens remounts 900 ms count-ups from zero; full-page entrance motion also replays. [CountUp](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/ui/primitives.jsx#L252), [screen mount](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/App.tsx#L328) | Display stored numbers immediately. Use motion for a meaningful interaction, not to reveal the amount. Avoid replaying entrances on tab returns. |
| High | Detail pages only have an entrance animation and unmount immediately on back. Sheets close with a 240 ms timer that is not cleaned up or guarded against repeated close requests. [DetailShell](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/ui/primitives.jsx#L354), [Sheet](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/ui/primitives.jsx#L291), [motion CSS](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/styles/keela.css) | One navigation/overlay lifecycle, matched forward/back transitions, cancellable exits, one close per instance, and reduced-motion support across all transitions. Rapid close/reopen is a specific regression case. |
| High | The shared sheet lacks dialog semantics, focus containment/restoration and Escape handling. Inputs frequently use placeholder-only labels. [Sheet and Field](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/ui/primitives.jsx#L291) | Accessible labeled dialog, inert background, keyboard focus handling, visible close/cancel and persistent labels. A dirty draft must not vanish on a casual backdrop tap. |
| High | Collection errors are swallowed, and loading finishes when the profile arrives, even if other collections have not. [useKeelaData](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/data/useKeelaData.js#L266) | Separate loading, empty, partial, cached/offline and failed states. Do not present failed reads as empty balances. Show the freshness of cached data. |
| Medium | Heavy weights, 40 px detail amounts, 26 px money fields, 28 px sheet corners, generous gaps, decorative rings and repeated statistics compete. Some metadata is only 10–11 px. | A bounded scale and fewer competing elements. Shrink the visual weight and spacing; retain useful reading sizes and touch targets. |
| Medium | Current small muted text `#A8A091` on sand `#ECE5D6` has about **2.07:1** contrast. White on terracotta `#C4623A` is about **4.07:1**. | Darker warm small text and the existing deeper accent for small filled actions. Preserve the palette’s identity; adjust token roles for readable text. |
| Medium | Spending has extensive analytics above its log; the floating add button always adds a transaction, even on Recurring or Upcoming. [Spending](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/screens/Spending.jsx), [App FAB](https://github.com/ahmedk-max/keela/blob/e3357fddd1155045026d4d1d1fe77dc6b3b99a09/web/src/App.tsx) | Keep compact monthly spending and category charts visible, followed by transactions. Use one clearly labeled context-aware add action. |
| Medium | Destructive actions are mixed with normal editing and swipe actions delete directly. | Archive buckets rather than casually deleting history. Introduce an explicit edit/delete review or reversible deletion policy for transactions. Keep swipe as a shortcut, with a visible alternative. |

“Critical” here means a core money-recording flow can be blocked or misrepresented; it is not a claim of a security incident or verified database corruption.

## Proposed information architecture

Keep the five destinations: **Home · Spend · Buckets · Assets · Keela**. The mobile-first premise remains. A new desktop dashboard is not part of this proposal.

| Surface | Change | Move/remove from the first screen | Add |
|---|---|---|---|
| Home | Spending ring, monthly income flow, contribution progress, recent expenses, savings trend and pinned buckets | Excess vertical space and redundant totals | Labeled Add expense, compact rings, warm note accent, consistent settings access |
| Spend | Budget ring, six-month spending chart, category breakdown, then transactions; Recurring and Upcoming remain subviews | Duplicate transaction FAB | Tappable spending months, context-aware Expense/Bill/Plan label, compact forms |
| Buckets | Contribution progress above one current list; compact rings, balance/target or spent/remaining rows; pin favorites | Separate Saving/In-use destinations as mandatory navigation; oversized per-bucket cards | All/Saving/In use filters, quick Deposit, direct switcher in details, immediate creation-to-deposit path |
| Bucket detail | Balance ring, lifecycle, actions, current-cycle movements, trend and activity | Duplicated balance statistics and excess chart chrome | All three money intents, before/after amount preview, editable date, archive with retained history |
| Assets | Allocation ring, cost-basis trend and portfolio/holding rows | Ambiguity between recorded basis and live market value | Consistent portfolio/holding forms; preserve quantity, price and cash semantics |
| Keela | Warm featured note, compact dated timeline, readable detail text, public memory | Settings mixed into the bottom of a reading list | Settings in app chrome; retain read-only public notes and the private-memory exclusion |
| All forms | Compact sheet header, clear labels, one main action, inline feedback | Large decorative money entry and early color/status pickers | 3-field bucket creation, optional details disclosure, saved/error/offline/draft states |

No deletion of history, private-memory exposure, financial-model migration or production rollout is implied by approving a visual layout.

## Bucket behavior contract

These are allocations tracked in Keela. Depositing here does not execute a bank transfer. The live data model’s `allocated` and `spent` fields must remain understandable.

| Action | Accounting effect | UI result |
|---|---|---|
| Deposit | `allocated += amount` | Increases available balance; works from zero |
| Withdraw | `allocated -= amount` | Releases allocation without recording a purchase; cannot exceed available balance |
| Record spend | `spent += amount` | Reduces available balance, retains purchase history; cannot exceed available balance |
| Available | `allocated − spent` | Used consistently in list, detail and forms |

The concept uses **Saving / Ready to use / In use / Paused / Archived**. These are proposed lifecycle labels, not a silent change to existing records. Saving and In use filters are shortcuts over the current list. Paused remains reachable in All; archive is a separate view.

Proposed lifecycle policy for review:

- New bucket begins in Saving and opens immediately at zero.
- Record spend moves a normal current bucket to In use. A paused bucket stays paused unless explicitly resumed.
- Depositing into an In use bucket does not switch it back to Saving.
- Ready to use is a funding stage, not a reason to hide Withdraw.
- Archiving requires zero balance in this concept; history remains intact, with a Restore action.
- Existing `completed` records require review during implementation: some mean “funded and untouched,” some “being spent,” some “finished.” Do not batch-rename them without a migration rule and preview.

The production financial model also needs an explicit reconciliation decision for “release allocation” and for preventing purchase double counting across bucket spending and the Spending log. The mockup demonstrates the current separate intents; it does not invent a source account, execute transfers, or alter net-worth accounting.

## Size and motion direction

| Element | Current examples | Proposed default |
|---|---|---|
| Page title | 26 px / 800 | 23 px / 650 |
| Detail money | 40 px / 800 | 28 px / 500, tabular numerals |
| Sheet title | 15 px / 800 | 14 px / 600 |
| Money input | 26 px / 800 | 18 px / 400; 38 px control height |
| Normal input | Mostly 16 px; some overrides at 15 px | 14 px with fine pointer; 16 px on touch; 34–38 px control height |
| Row text | 13–14 px, often 700 | 13 px / 600; metadata 11–12 px with stronger contrast |
| Sheet corner | 28 px | 17 px |
| Touch actions | Mixed sizes | About 44 px effective targets; smaller glyphs inside |
| Bottom navigation | Floating pill with growing selected tab | Restore this visual treatment; mounted buttons, consistent names and short transitions |
| Motion | 240–360 ms entrances plus 900 ms number animation | Immediate totals; short interaction transitions; Lively, Quiet, Off and system reduced-motion |

Touch inputs retain 16 px normal text because the existing code documents an iOS zoom/panning regression below that size. Fine-pointer inputs use 14 px. The compactness comes primarily from weight, spacing, inline rows and optional fields behind a disclosure. The revised expense sheet measures about 306 px high in the 390 px browser-width preview. Touch action buttons retain about 44 px effective targets.

Keep Plus Jakarta Sans for interface text, JetBrains Mono for aligned money, the sand canvas, warm paper surfaces, espresso hero and terracotta identity. Small-text contrast is adjusted within that warm family. The mockup uses the existing pressed accent for filled light-theme actions and dark foreground text on the dark-theme accent.

## Research basis

- **Stable destinations and labels.** Apple recommends labeled tab destinations, persistent availability and preserved navigation state. The original fixed-label proposal was informed by this guidance. The user's later direction retains Keela's floating pill and active-label treatment, with accessible names on every destination. [Apple: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars?changes=lat_3_1_4_6&language=objc)
- **Visible actions, feedback and recovery.** Nielsen Norman Group’s heuristics support visible options, consistent meanings, error prevention and clear system status. That informs the explicit bucket actions, optional form details and save/retry state. [10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Small appearance, usable targets.** WCAG 2.2 AA’s target-size minimum is 24 CSS px with exceptions; its enhanced target is 44 CSS px. This proposal deliberately aims around 44 for a touch-first app. [W3C minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [WCAG 2.2](https://www.w3.org/TR/wcag/)
- **Accessible sheets.** W3C’s modal pattern describes focus containment, Escape, labeling, modal semantics and focus return. These requirements shape the shared sheet rather than being reimplemented differently in every form. [W3C dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **Optional motion.** Nonessential interaction animation should be suppressible. The concept has a quiet mode, an Off option and respects the system’s reduced-motion preference. [W3C animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

## What to try in the concept

1. Open **Next adventure** at zero: Deposit is available, and unavailable money-out actions explain why.
2. Create a bucket, then make its first deposit without returning to the list.
3. Record a deposit, withdrawal and spend; observe the preview and activity log.
4. Enter more money out than the bucket holds, or a malformed amount.
5. Switch directly between buckets using the name at the top of the detail.
6. Use All / Saving / In use; pin or unpin via Bucket options.
7. Review Home, Spend, Assets and Keela. Add or edit an expense.
8. In the design controls, compare Compact/Comfortable, Light/Dark, motion, Offline, Loading and Fail next save. Offline and failure are simulated examples.

Implemented locally in the revised concept: all five destinations and their charts; bucket list/filter/pin/switch, new/edit bucket, deposit/withdraw/spend, archive/restore; expense, recurring bill, upcoming item and wishlist forms; portfolio/holding creation and investment/cash activity; appearance choices, save feedback, amount validation and draft handling. Monthly contribution totals and plans update from sample movements. All amounts and histories are synthetic. This is a fuller interactive design proposal, not an exhaustive production specification. Actual financial planning rules, server concurrency, authentication, data loading, on-device keyboard/safe areas and durable offline synchronization remain implementation work.

The inline concept expands with its content so it is usable inside this task. The actual PWA would keep its bottom navigation pinned to the safe area and scroll page content; that behavior requires real-device validation and is not claimed from this preview.

## Implementation sequence after design review

1. **Shared foundation and reliability:** establish typography/spacing tokens, accessible sheet, awaited writes and atomic money entries, strict validation, clear data/error state. Preserve existing semantics until explicitly reviewed.
2. **Buckets end to end:** list, pins, lifecycle mapping, detail switcher, all money actions, new-bucket continuation and migration preview. Validate using zero, paused, funded, spent-down, archived and long-name examples.
3. **App-wide adoption:** stable bottom navigation; apply compact components and task-first content order to Spending, Home, Assets and Keela. Retain hidden-detail content rather than deleting it.
4. **Device verification:** 320/390/430 px widths; light/dark; large text; keyboard open; safe areas; VoiceOver/focus; reduced motion; rapid navigation; double-submit; failed writes; reconnect; installed-PWA cache update. Release only after these behaviors pass.

Required money-flow tests should verify outcomes: first deposit on zero, limits at the cent boundary, no partial entry on write failure, idempotent retry, concurrent withdrawal conflict, preserved drafts and reconciliation across list/detail/history. Avoid tests that merely duplicate the styling implementation.

The review decision is about keeping Keela’s visual character while improving information order, dialog sizing and explicit bucket behavior. No commit or deployment has been made.

## First-revision prototype verification

- Created a fresh positive-target bucket at zero; its detail opened immediately with Deposit enabled and money-out actions disabled.
- Deposited **500.25**, withdrew **100.25**, then recorded spending of **50**. The resulting balance was **350**, allocated was **400**, spent was **50**, and all three entries appeared in history.
- A **600** withdrawal against **500.25** was blocked with an explicit available-balance message.
- Switched directly from one bucket detail to Kitchen.
- Added a **25.50** expense from Home; the Spending total changed from **820** to **845.50** after formatting was refined to retain two decimal places for fractional amounts.
- Simulated save failure retained the **100** draft. Retry increased Wedding from **84,000** to **84,100** once, with one new entry.
- Simulated offline state left the form open and disabled saving with an explanation. Closing a dirty form offered Keep editing and Discard.
- Checked an empty bucket’s archive and restore path. Archived rows offer Restore rather than a deposit into a missing selection.
- Inspected light and dark views at **320, 390 and 430 px browser widths**. The preview wrapper leaves a smaller inner width; at its narrowest, the **288 px** concept had matching client/scroll widths and no controls extending past its right edge. Long bucket names and stacked form fields were checked there.
- Opened all five destinations. In use filtering showed Kitchen and Japan trip; unpinning Wedding moved it out of the pinned group. Checked real progress-bar geometry after rendering. JavaScript syntax passed independently, and the final browser check reported no console errors.

These are local prototype checks. Real database failure/concurrency, iOS keyboard and safe areas, persistent offline storage, VoiceOver and installed-PWA behavior are not verified by them.

## Revision 2 verification

- Confirmed the restored monthly flow, contribution panel, savings trend, bucket rings, six-month spending chart, category bars, asset allocation and cost-basis trend render from sample data.
- Added a **25.50** expense: current-cycle spending changed from **820** to **845.50**, the remaining budget became **2,654.50**, and the Food category updated. Selecting August showed its separate **3,070** sample total.
- Added a **50** recurring bill: monthly recurring costs changed from **4,000** to **4,050**, with the bill visible in the list.
- Created a portfolio and its first holding at **10 units × 50 = 500** cost basis. Recording a sale of **11 units** was blocked; recording **2 units** left **8 units** and **400** cost basis.
- Rechecked a deposit of **500.25** into an empty bucket: actions became available and the contribution, trend and activity updated.
- Measured the revised deposit sheet at **279 px** and expense sheet at **306 px** at a **390 px** browser width. The expense sheet also fit the **288 px** inner surface of the **320 px** preview without horizontal overflow. These measurements use the browser's fine-pointer mode; touch inputs and buttons have larger effective targets.
- Checked light charts at **320 px** and dark asset/note views at **430 px**; the outer surface matched its scroll width. Aligned month controls with their chart columns and verified allocation-ring segments match the legend.
- Final browser error log was empty. JavaScript syntax was checked independently after the final edits.

The revision remains an interactive sample-data proposal. It does not change the production app, financial records or deployed build.

## Floating-layout refinement

The user confirmed **one summary card, everything else unboxed**. Charts, monthly contribution/spending visuals, trends and list rows remain present; only their repeated card backgrounds and corner treatments were removed. The original floating pill navigation returns, including its active-tab treatment and Keela mark. The mark's circle geometry was taken directly from the app's existing `Mark` component. The visible revision/sample-data banner was removed; all financial data in this proposal remains synthetic.

Percentages now sit alone inside rings, with captions below the circular marks. At the checked allocation ring, the value was centered within a fraction of a pixel and the caption began **4 px below** the ring box. Deposit, Withdraw and Spend share one row, including at the **288 px** inner surface of the **320 px** browser preview. The action buttons retain **44 px** outer height. Light and dark screens were visually inspected; the compact expense sheet remains **306 px** high.

Navigation buttons now stay mounted between selections. Saved-state echoes from the current preview are ignored so an older echoed selection cannot rewind a newer interaction. JavaScript syntax passed after the final changes. No production source files, data, commits or deployments were changed.
