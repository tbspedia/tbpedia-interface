# TBpedia Interface — Design specification

Last updated: 11 October 2026 (Asia/Kuala_Lumpur)

## Release and scope

Mobile reading navigation was introduced in
[version 1.2.0](https://github.com/tbspedia/tbpedia-interface/releases/tag/1.2.0).
The feature lets readers deliberately continue to the next Markdown note after
finishing the current note. It operates in Obsidian mobile Reading view on
Android and iOS when enabled. Device verification remains pending.

The existing theme-picker and light/dark controls retain their independent
settings. Mobile navigation adds the following settings to the same plugin.

## Settings

Location: **Settings → True Buddha Pedia Interaface → Mobile**.

| Setting | Default | Behavior |
| --- | --- | --- |
| Swipe up to next note | Off | Enables the footer and gesture in mobile Reading view. Changes apply immediately and persist. |
| Reading order | Filename | Select filename order or numeric `reading-order` frontmatter values. |
| Loop at end of folder | Off | When enabled, the last note continues to the first note. |

Settings are visible on desktop so a user can configure a synced plugin. The
navigation controls and touch handlers run only on mobile. Editing view has no
navigation footer or gesture handlers.

## Footer and interaction

At the bottom of an eligible note, display a footer above the mobile safe area:

```text
Next in this folder
10 — Next article
↑ Swipe up to continue · or tap
```

The destination title is the next file's basename, without `.md`. The footer is
a button and can also be tapped to open that note. Space below the Markdown
content leaves room to read the final lines above the footer. The control lives
outside rendered Markdown and is not inserted into the note itself.

### Gesture sequence

1. Scroll the note normally to the bottom.
2. Start a new single-finger upward swipe while already at the bottom.
3. The footer moves slightly upward and its progress bar fills as the swipe
   approaches the threshold.
4. At **80 CSS pixels**, the hint changes to **Release to open**.
5. Release while the threshold is met to open the previewed destination.

The bottom check allows a 3-pixel tolerance. Releasing below the threshold resets
the footer without navigation. A swipe that starts before reaching the bottom
cannot navigate, even if that same swipe reaches the end. Momentum scrolling
alone cannot open a note.

The current gesture cancels on multi-touch, touch cancellation, leaving the
bottom, or a downward movement exceeding 12 pixels. Horizontal movement cancels
when it exceeds 24 pixels and is greater than the vertical displacement. Release
also verifies that the previewed destination has not changed. Duplicate opens
are blocked while navigation is in progress, and a completed swipe suppresses
the ensuing synthetic click for 500 milliseconds.

### Gesture exclusions

Touches must originate in the note's scrolling area or in the footer. Ignore
links, form fields, other buttons, media players, iframes, canvas elements,
embedded notes, editable content, and active text selections. Ignore nested
content that overflows horizontally or has a vertically scrollable container.
These exclusions preserve interactions with embedded content and other controls.

## Reading sequence

Include only Markdown files in the current note's **immediate parent folder**.
Exclude subfolders and non-Markdown files. A folder with fewer than two Markdown
notes has no footer.

Filename ordering uses natural numeric sorting, so `2.md` comes before `10.md`.
The implementation uses English locale comparison with base sensitivity, then
the full path to break otherwise equal filename comparisons.

With property ordering enabled, use numeric YAML values, including numeric
strings, from this field:

```yaml
reading-order: 1
```

Finite numeric values come first in ascending order. Missing, blank, invalid,
or non-finite values follow in filename order. Equal numeric values also use
filename order. Changing the setting, renaming files, or changing metadata
refreshes the destination while the feature is active.

At the last note with looping disabled, show a disabled footer:

```text
You’ve reached the end of this folder
```

With looping enabled, preview the first note instead. Looping requires at least
two notes.

## Opening and returning

Open the next note in the same Obsidian tab, in Reading view, at its beginning.
Use Obsidian's normal file-opening API so navigation participates in its history.
Retain the previous note's pixel scroll position in memory during the plugin
session and restore it when returning. If the content has not finished rendering,
retry restoration for up to two seconds.

The next note enters with a short upward animation. Reopening a destination
through this feature starts it at the top. Scroll-position memory is not
persisted across plugin reloads. Back/history behavior still requires real-device
verification.

If opening fails, show a localized notice, clear the navigation lock, and restore
the available footer. Disabling the feature, entering editing view, changing the
active view, or unloading the plugin removes its controls and listeners.

## Accessibility and presentation

- Provide a tappable button with an accessible label combining the destination
  and instruction, keyboard focus styling, and a polite live gesture hint.
- Use Obsidian theme colors and reserve space for the mobile safe area.
- Respect reduced-motion preferences by disabling entry animation and footer
  movement transitions.
- Provide mobile labels in English, Traditional Chinese, and Simplified Chinese,
  with English fallback for other languages. The property-order explanation in
  settings is currently English.

## Implementation and release files

Edit `src/main.js` and run `node build.cjs` to generate `main.js`. The build uses
Node.js built-in modules and checks source syntax before writing the bundle.
Styles are maintained in `styles.css`.

The GitHub release includes `main.js`, `manifest.json`, and `styles.css`.
`manifest.json` declares version `1.2.0`, mobile support, and minimum Obsidian
version `1.0.0`; `versions.json` maps `1.2.0` to `1.0.0`. Compatibility at that
minimum version has not been tested.

## Verification status and acceptance criteria

JavaScript syntax checks and `node tests/mobile-navigation.test.cjs` passed for
the released implementation. The test uses mocked Obsidian and DOM objects.

| Scenario | Expected result | Verification |
| --- | --- | --- |
| Filename and property ordering | Correct sequence; subfolders excluded | Automated checks passed |
| Short or horizontal swipe | No navigation | Automated checks passed |
| Swipe begins above bottom and reaches end | No navigation until a new swipe | Automated check passed |
| Touch cancellation | No navigation | Automated check passed |
| Fresh swipe exceeds threshold | Opens the next note with a top scroll request | Automated check passed |
| Last note, looping off/on | Stops / selects first note | Automated checks passed |
| Return to previous note | Restores saved session position | Mock check passed; device history pending |
| Enter editing or disable feature | Removes navigation and listeners | Automated checks passed |
| Tap footer | Opens the previewed note once | Device check pending |
| Long and short notes on Android and iOS | Scrolling stays natural; footer is reachable | Device check pending |
| Embeds, tables, selections, links, and multi-touch | Existing interactions remain usable | Device check pending |
| Large text, safe area, light/dark themes | Final lines and footer remain readable | Device check pending |
| Screen reader and reduced motion | Destination is announced; motion preference respected | Device check pending |
| Rename, metadata update, or open failure | Destination refreshes; failure recovers | Device check pending |

Documentation updates do not change the published 1.2.0 plugin assets or require
a new plugin version.
