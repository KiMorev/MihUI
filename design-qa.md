# Design QA — цветовая схема YAML

- Source visual truth: `C:\Users\morev\.codex\visualizations\2026\07\24\019f952f-578c-79b1-b275-427c877013b6\webmihomo-color-audit\03-revised-direction.png`
- Implementation screenshot: `C:\Users\morev\.codex\visualizations\2026\07\24\019f952f-578c-79b1-b275-427c877013b6\webmihomo-color-audit\implementation-edit-mode-1672x940.png`
- Combined comparison: `C:\Users\morev\.codex\visualizations\2026\07\24\019f952f-578c-79b1-b275-427c877013b6\webmihomo-color-audit\comparison-reference-vs-implementation.png`
- Mobile screenshot: `C:\Users\morev\.codex\visualizations\2026\07\24\019f952f-578c-79b1-b275-427c877013b6\webmihomo-color-audit\implementation-edit-mode-mobile-yaml-390x844.png`
- Desktop comparison viewport: 1672 × 940.
- State: router mock, review page, configuration editing enabled.

## Findings

No actionable P0, P1 or P2 findings remain in the changed YAML-highlighting scope.

- Colors and tokens: passed. Keys are near-black, punctuation cyan, numbers ochre, literals purple, ordinary strings blue, and comments gray.
- URLs: passed. Both visible `http(s)` forms use the same vivid blue and 1 px underline; ordinary strings remain unlined.
- Typography: passed. Preview keys use weight 700. Edit-mode keys keep the textarea's weight and use a non-layout stroke so text metrics stay aligned.
- Content: passed. Inline collections color brackets and commas separately from their numeric and literal values.
- Editing overlay: passed. Highlight text exactly matches textarea text; transparent editor text preserves the native caret and selection layer.
- Interaction: passed. A normal link click remains in the editor; Ctrl-click opens the exact URL in a new tab.
- Responsiveness: passed. At 390 px the page has no horizontal overflow, the YAML editor remains usable, and its own horizontal scrolling contains long URLs.
- Accessibility: passed for the changed scope. Link contrast and underlining do not depend on color alone.
- Console: passed. No warnings or errors were recorded.

## Intentional differences from the source visual

- The reference is a generated visual direction, so its mock data and recommendation counts differ from the browser QA fixture.
- Existing application layout, controls, spacing, icons and status copy were not redesigned.

## Verification

- `npm.cmd test`: 146/146 passed.
- Main/standalone synchronization: passed.
- Browser desktop edit state: passed.
- Browser mobile edit state: passed.
- Browser URL interaction: passed.

final result: passed

---

# Design QA — мониторинг ресурсов

- Source visual truth: `C:\Users\morev\.codex\generated_images\019f959d-eabb-7c50-b841-e4dc59a7e805\call_y6CB6PWEAi3ek6aDfXs419m4.png`
- Implementation screenshot: `C:\Users\morev\.codex\visualizations\2026\07\24\019f959d-eabb-7c50-b841-e4dc59a7e805\resource-monitor-implementation.png`
- Combined comparison: `C:\Users\morev\.codex\visualizations\2026\07\24\019f959d-eabb-7c50-b841-e4dc59a7e805\resource-monitor-comparison.png`
- State: router mock, nodes page, monitoring enabled, one recent AI switch.

## Findings

No actionable P0, P1 or P2 findings remain in the resource-monitoring scope.

- Layout: passed. The monitoring card sits between current group selections and node filters, with the status table and event journal matching the selected direction.
- States: passed. Available, warning, error, configuration drift, recent switch and checking states have distinct copy and color.
- Interaction: passed. Settings open as a modal, the four source groups are shown, and preparing the config moves to the existing review flow.
- Safety: passed. Runtime settings remain pending until the YAML is checked, saved and confirmed by Mihomo.
- Responsiveness: passed. The card collapses to one column below 980 px and the dialog to one column below 560 px.
- Overflow: passed. The visually hidden switch input no longer expands the document width.
- Console: passed. No browser warnings or errors were recorded.

## Intentional differences from the source visual

- Existing WebMihomo typography, density, node cards and navigation remain unchanged.
- The browser fixture contains seven configured groups, while the source visual shows three; the monitoring block itself keeps the selected structure.
- Resource checks expose a per-row action on hover or focus; the recently switched row keeps it visible.

## Verification

- `npm.cmd test`: 148/148 passed.
- `python -m unittest tests.test_mihui_server -v`: 58/58 passed.
- Main/standalone synchronization: passed.
- Browser desktop state and settings workflow: passed.

final result: passed

---

# Design QA — простой режим (2026-10-13)

- Selected user attachment: `C:\Users\morev\AppData\Local\Temp\codex-clipboard-c9e49c18-35a0-4f55-8388-dde4888cffbb.png`.
- Full source visual: `C:\Users\morev\.codex\generated_images\01a13694-e6cd-7152-ac2d-80b0cb0b612b\exec-8120ed29-e16f-4b43-b3a9-71c1c6ba3d19.png` (the same selected card design).
- Implementation URL: `http://127.0.0.1:50807/`, local preview with mock API responses; no live router changes.
- Desktop screenshot: `C:\Users\morev\.codex\visualizations\2026\10\13\01a13694-e6cd-7152-ac2d-80b0cb0b612b\simple-desktop-final.jpg`.
- Mobile screenshot: `C:\Users\morev\.codex\visualizations\2026\10\13\01a13694-e6cd-7152-ac2d-80b0cb0b612b\simple-mobile-final.jpg`.
- Full comparison: `C:\Users\morev\.codex\visualizations\2026\10\13\01a13694-e6cd-7152-ac2d-80b0cb0b612b\simple-comparison-final.jpg`.
- Focused card comparison: `C:\Users\morev\.codex\visualizations\2026\10\13\01a13694-e6cd-7152-ac2d-80b0cb0b612b\simple-focused-comparison.jpg`.
- Desktop CSS viewport and screenshot: 1488 × 1056. Source: 1487 × 1058, normalized to 1488 × 1056 for comparison. Screenshot density: 1 CSS pixel per image pixel.
- Responsive checks: 768 × 900, 390 × 844, and 320 × 700. Classic scrollbars reduce mobile document client width; `scrollWidth == clientWidth` at all checked sizes.
- Browser: Codex in-app browser through CUA. Local preview server requires sandbox elevation for loopback sockets; no fallback browser used.
- State: four example live groups, simple mode, no node picker, addresses, group types, or engine labels. The groups come from the runtime API, independently of the draft/provider inventory.

## Comparison history

- Initial comparison found P2 desktop density drift: buttons and group titles were smaller than the selected mock. Increased desktop title/icon/button sizing, matched card padding and spacing; retained compact tablet/mobile sizing.
- Final full and focused comparisons verify the corrected two-column card layout, name/action hierarchy, broad teal buttons and restrained white surfaces. No actionable P0/P1/P2 visual findings remain.
- Fonts/typography: existing Inter/Segoe UI/system stack retained; desktop hierarchy and mobile wrapping checked.
- Spacing/layout: two columns on desktop/tablet, one below 561 px. Narrow headers wrap rather than overflow. Card feedback can increase height naturally.
- Colors/tokens: existing light MihUI palette, teal action, dark group titles, muted supporting copy and light borders retained.
- Assets: existing licensed Tabler symbols reused for service icons and refresh; official Tabler `brand-openai` added to the existing sprite. Outline brand variants intentionally follow the project's icon family instead of introducing new raster assets or dependencies.
- Copy/content: one `Сменить сервер` action per actual Smart/Select group, identical presentation regardless of engine. No manually selected replacement or direction list.
- P3 differences: native font metrics, stroke variants and subtle button shadow differ from the generated illustration; do not change hierarchy or usability. Mock's decorative info control omitted because no function was requested.

## Verification

- Advanced is the default after reload; switching views preserves the active section and an unfinished YAML draft (browser interaction verified).
- Pending action blocks duplicate replacements; confirmed success, rejection, uncertain outcome and empty runtime list were exercised with mock API responses.
- Keyboard focus returns to the group action after completion; repeated inventory refresh preserves focused controls.
- Browser page identity, nonblank content, no framework overlay and no application console errors verified. HTTP rejection responses used in negative cases are expected.
- JavaScript: 234 tests passed, including 6 new simple-mode tests.
- Python: 188 tests passed (`test_simple_mode`, `test_resource_modes`, `test_smart_auto`, `test_mihui_server`), including 15 new simple-mode tests.
- Server tests cover managed quarantine reuse, fastest generic replacement, drift and group-remap prevention, native complaint deduplication/scope, capability/no-route handling and unknown results.
- Remaining verification limit: installed router/core not exercised; native Prizrak behavior is validated against source and mocked controller responses.

final result: passed
