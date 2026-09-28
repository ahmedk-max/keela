# Keela interface overhaul — 29 September 2026

**Implemented and desktop-verified. Live publication was explicitly authorized by the user on 29 September 2026. Physical iPhone sign-off remains pending.**

[Open the before/after review](comparison.html). The four comparison pairs show Home, expense entry, discard confirmation, and Settings at 390 × 844. Screenshots use synthetic demo records; the baseline was commit `51c0330`.

## Delivered

- One semantic palette and control system for both themes, with 20 px gutters, 14 px body text, labels at least 12 px, inputs at least 16 px, 44 px targets, and 12 px control corners. Text layouts reflow when enlarged. Local Plus Jakarta Sans and existing JetBrains numerals are included in the PWA cache.
- Shared Radix sheet header, scrollable body, and persistent footer. Compact entry and selection sheets; full-height Settings with Appearance, Income & savings, and Account sections. No drag handle.
- Focused discard, delete, archive, restore, and sign-out confirmations. Forms retain draft values, scroll, and field focus. Dirty state compares current values with the opening values, including custom controls.
- Field validation and disabled-state guidance. Failed saves retain the draft and show a retry beside the actions. Pending operations block repeated submission; success follows the completed write.
- Shared 120 ms feedback, 180 ms fades/disclosures, and 240 ms sheet/detail motion. Exit completion replaces closing timers. Detail navigation restores its parent position and focus. The floating navigation keeps stationary targets and persistent labels.
- Notes, memory, details, loading, sign-in, and error screens use the same visual language. Private and archived memory remain excluded from the rendered interface.
- Zoom is enabled. Reduced motion removes positional transitions and delays. The overlay follows the visible viewport; safe-area values remain native device inputs.

The financial adapters, write functions, calculation modules, Firestore rules, and stored schemas are unchanged. No financial migration or production record changes were performed.

## Verification checklist

### Completed in the development environment

- [x] All **17 existing financial tests** pass unchanged.
- [x] **20 new UI tests** pass: focus trapping/restoration, draft preservation and reversion, custom controls, discard/destructive confirmations, whole-number and currency validation, failed-save retry, duplicate submission, committed-save notifications, offline recovery, interrupted closing/navigation, initial bucket funding, parent detail restoration, private memory, and visible-viewport events/cleanup.
- [x] TypeScript and the production build pass (`npm run build`).
- [x] A clean `npm ci` installation passes on Node 22. The first publication attempt exposed a missing optional esbuild dependency in the lockfile and a Node 20/22 mismatch. The lockfile was regenerated with standard dependency resolution and the existing workflow now uses Node 22. The Vite 5 app toolchain coexists with Vitest's newer nested Vite and still reports an optional-peer warning.
- [x] **228 normal layout cases:** 38 real screen/form/state scenes × 320, 390, and 430 px × light/dark. Checked rendering, horizontal overflow, sheet/footer containment, and control targets.
- [x] **76 stress cases:** every scene in both themes at 320 px, with 200% text, expanded options, long bucket names, and seven-digit amounts.
- [x] **36 empty-state cases:** Home, Spending, Buckets, Assets, notes, and memory across all widths and themes.
- [x] **12 selection-sheet cases:** bucket menu and bucket switching across all widths and themes.
- [x] **6 offline-entry cases:** all widths and themes, with retained-draft guidance beside the disabled save action.
- [x] **6 shortened-viewport cases:** expense, bucket options, and Settings at 390 × 400 in both themes. Header and actions remain visible while the body scrolls.
- [x] Integrated browser checks: all five destinations, light/dark appearance, discard → Keep editing with field focus restored, menu → Settings, bucket switching, and a failed expense save → one successful retry.
- [x] Keyboard tests cover Tab/Shift+Tab, Escape, conservative confirmation focus, field labels/errors, and return focus. Browser accessibility trees expose dialog names and descriptions.
- [x] **18 semantic contrast pairs pass:** main text ≥4.5:1 in both themes; input boundaries ≥3:1. Lowest secondary-text contrast is 4.69:1. Disabled controls and decorative chart swatches are excluded from this calculation.
- [x] Production output includes local font files in the service worker precache. No Google Fonts network dependency. The development catalogue and fixtures are excluded from the production entry.
- [x] Before/after screenshots captured; changes reviewed for whitespace errors and accidental financial-data changes.

These are browser geometry, component, and interaction checks. They do not certify Safari keyboard behavior, VoiceOver, or an installed app update. The shortened viewport is a simulation, not an iPhone keyboard test. Chart data remains available through accessible labels; small ring labels retain a readable bound within their graphics.

Evidence: [layout-results.json](layout-results.json), [contrast-results.json](contrast-results.json), and [screenshots](screenshots/). Normal catalogue measurements use reduced motion to inspect settled geometry; motion-enabled integrated flows were checked separately. The production build retains its pre-existing large-bundle warning.

### Physical iPhone release gate — pending

- [ ] In Safari and installed standalone mode, open each entry form with the real keyboard. Check title/close/action visibility, focused-field scrolling, date/month pickers, dismissal, and rotation.
- [ ] Check top/bottom safe areas on a notched or Dynamic Island iPhone, including the home indicator and floating navigation.
- [ ] With VoiceOver, traverse all five destinations, open a detail, edit a field, trigger a validation error, keep a draft, confirm/cancel a destructive action, and return to the opener.
- [ ] Check iOS Larger Text, pinch zoom, and Reduce Motion on the device.
- [ ] Install a test PWA build, then update it through the existing release workflow. Confirm the build stamp changes, offline reload uses local fonts, cached records remain available, and no stale UI remains.

**Do not call this fully production-ready until these device checks are completed.** The user subsequently authorized pushing this version live through the existing GitHub Pages workflow; that authorization does not mark the device checks complete.

## Reproduce

With Node 22.14 or later, from `web/`:

```sh
npm ci
npm test
npm run build
npm run dev -- --host 127.0.0.1
```

Use `/?demo` for the synthetic integrated app and `/?demo&failSave` to reject the first synthetic save. The catalogue is `/tests/gallery.html?demo`; its index lists all scenes and flags. Neither path accesses production records. Use the catalogue's `theme`, `expanded`, `empty`, `stress`, `largeText`, `offline`, and `reduced` options to reproduce edge cases.

Shared implementation: `web/src/ui/sheets.jsx`, `detail.jsx`, `motion.js`, `viewport.js`, and `web/src/styles/{tokens,controls,compact}.css`. Dialog behavior follows the [Radix Dialog API](https://www.radix-ui.com/primitives/docs/components/dialog).
