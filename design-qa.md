# Design QA — groups registry

- Source visual truth: `C:\Users\morev\.codex\generated_images\019f4c7b-d445-7022-8f6d-8e960a009d35\exec-e9fb6b43-87aa-41a9-9d0d-cedacec09f50.png`
- Implementation screenshot: `audit-groups-redesign-2026-07-11/05-implementation-final.png`
- Full-view comparison: `audit-groups-redesign-2026-07-11/06-comparison-final.png`
- Viewport: 1265 × 712 comparison crop.
- State: router mock, `config (4).yaml`, Groups tab, PROXY selected, inspector closed.

## Findings

No actionable P0, P1 or P2 findings remain.

- Typography: passed. Heading, table, compact metadata and inspector hierarchy use the established WebMihomo scale and weights.
- Spacing and layout: passed. Registry remains dominant, inspector is secondary, and table rows align with the approved subscriptions pattern.
- Colors and tokens: passed. Existing teal accent, pale selected row, neutral dividers and light surfaces are reused.
- Image and icon fidelity: passed. The target contains no raster assets; existing project icons and native controls are retained without substitute artwork.
- Copy and content: passed. Real group names, types, provider counts, route order and rule usage are rendered from the configuration. Live node counts appear when Mihomo supplies them.
- Interactions: passed. Group selection, name search, type filters, explicit edit mode, close editor, add group, guarded group deletion with undo and the existing relationship matrix remain functional.
- Responsive behavior: passed by code review. Tablet stacks registry and inspector; mobile removes lower-priority columns and keeps the search and filters usable without horizontal overflow.
- Accessibility: passed for the implemented scope. Table semantics, labeled search, keyboard-focusable row controls and explicit button names remain present.

## Intentional product constraints

- The existing panel title `Реестр групп` remains above the toolbar to match the implemented subscriptions screen, even though the concept image omits that label.
- Group deletion is blocked while rules or other groups reference the selected group; the interface lists those dependencies instead of silently rewriting routes.
- The existing subscription/group relationship matrix is preserved below the workbench as an advanced bulk-editing tool.

## Comparison history

### Iteration 1

- P2: type-filter controls were visibly smaller than the target toolbar controls.
- Fix: increased group filter height, padding and text size.
- P2: group search also matched member names, leaving unrelated groups visible.
- Fix: limited search to group name and type so the registry and inspector remain synchronized.
- Evidence after fixes: `audit-groups-redesign-2026-07-11/05-implementation-final.png` and `audit-groups-redesign-2026-07-11/06-comparison-final.png`.

## Focused comparison

A separate crop was not required: at the 1265 × 712 combined comparison, toolbar controls, table text, selected state and inspector labels remain readable at original detail.

## Verification

- `node --check app.js`: passed.
- `npm.cmd test`: 104/104 passed.
- Main/standalone synchronization: passed.
- Browser scenarios: selection, search, editor open/close and tab summary passed.

final result: passed
