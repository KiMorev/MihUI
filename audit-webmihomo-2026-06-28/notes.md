# WebMihomo visual audit, 2026-06-28

## Scope

Checked the start screen in the browser without a loaded Mihomo YAML config.
Evidence is limited to the empty state and the top action/menu area.

## Screenshots

1. `01-wide-1600x900.png` - browser stayed at 1280x720 despite the requested wider viewport.
2. `02-default-1280x720.png` - default desktop viewport.
3. `03-compact-900x720.png` - compact desktop/tablet-like viewport.
4. `04-file-menu-open-1280x720.png` - file menu open at default desktop viewport.

## Step Health

1. Start screen, 1280x720: acceptable, but action-heavy.
2. Start screen, 900x720: overloaded. The top area grows to about 275 px and pushes the useful workspace below the fold.
3. File menu open, 1280x720: overloaded by duplicate or premature actions.

## Findings

1. The interface is visually clean in color, spacing, and typography, but it is functionally dense before any config is loaded.
2. The top bar presents several actions at once: open config, save to core, file menu, update UI. With the menu open, users also see load and download. This makes the first decision heavier than necessary.
3. Disabled actions are too prominent on the empty state. "Save to core", "Download", restore backup, interval controls, and add controls compete for attention even though the user cannot use them yet.
4. At 900 px width, responsive stacking turns the top controls into a tall command block. The actual editor area starts low on the screen, so the first viewport feels more like a control console than an editor.
5. The empty state communicates what is missing, but the page still shows many surrounding panels. This preserves layout stability, yet increases perceived complexity.

## Accessibility Risks

1. Keyboard and screen reader behavior were not fully tested.
2. The file menu is a native `details/summary`, which is likely usable, but the visible focus state and duplicated load actions may still confuse keyboard users.
3. Disabled-looking controls are visually present enough to be read as available choices.

## Recommendation

The best first improvement is not a redesign. Hide or demote actions that are not useful before a config is loaded, and make the empty state focus on one primary action: load/open config.
