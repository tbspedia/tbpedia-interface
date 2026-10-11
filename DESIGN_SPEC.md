# TBpedia Interface — Design specification

Last updated: 11 October 2026 (Asia/Kuala_Lumpur)

## Release and scope

Mobile reading navigation was introduced in
[version 1.2.0](https://github.com/tbspedia/tbpedia-interface/releases/tag/1.2.0).
Version **1.3.0** adds desktop wheel/trackpad navigation and an explicit
next-chapter property sequence on both platforms.
Version **1.3.1** rebuilds the current source and republishes the plugin assets;
the navigation behavior is unchanged from 1.3.0.
The feature lets readers deliberately continue to the next Markdown note after
finishing the current note. It operates in Obsidian Reading view on Android,
iOS, and desktop when the corresponding option is enabled. Real-app/device
verification remains pending.

The existing theme-picker and light/dark controls retain their independent
settings. Mobile navigation adds the following settings to the same plugin.

## Settings

Location: **Settings → True Buddha Pedia Interaface → Mobile / Desktop**.

| Setting | Default | Behavior |
| --- | --- | --- |
| Swipe up to next note | Off | Enables the footer and gesture in mobile Reading view. Changes apply immediately and persist. |
| Scroll to next note | Off | Enables desktop Reading view wheel/trackpad navigation and the footer. |
| Reading order | Filename | Each platform independently selects filename order, numeric `reading-order`, or Next chapter property. |
| Loop at end of folder | Off | Each platform can loop the last note to the first note in folder-based modes. Ignored in Next chapter property mode. |

Both settings sections are visible on either platform. Each platform uses its
own toggle, reading order, and loop preference. Touch handlers run on mobile;
wheel handlers run on desktop. Editing view has no navigation footer or handlers.

## Footer and interaction

At the bottom of an eligible note, display a footer above the mobile safe area:

```text
Next note
10 — Next article
↑ Swipe up to continue · or tap
```

The destination title is the next file's basename, without `.md`. The footer is
a button and can also be tapped or clicked to open that note. Space below the Markdown
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

For filename and numeric property ordering, include only Markdown files in the current note's **immediate parent folder**.
Exclude subfolders and non-Markdown files. A folder with fewer than two Markdown
notes has no footer in these folder-based modes.

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
End of reading sequence
```

With looping enabled, preview the first note instead. Looping requires at least
two notes.

### Next chapter property mode

Resolve the first populated field on the current note in this priority order:
`next chapter`, `下一章節`, `下一章节`. Accept an Obsidian wikilink (including
aliases), a plain note name/path, a Markdown link, or a one-item YAML list.
Resolve with Obsidian's metadata link resolver relative to the current file.
For example:

```yaml
下一章節: "[[第二章]]"
```

An explicit link may lead outside the current folder. Heading and block suffixes
are ignored because navigation starts at the destination note's beginning.
Reject external URLs, unresolved links, non-Markdown targets, self links, and
multi-item lists. If the first populated field is invalid, do not try another
field or fall back to filename order. Automatic folder looping is ignored in
this mode; an author can explicitly link the last chapter to the first.

This mode shows a footer even in a single-note folder. Without a valid link,
show the disabled message **No valid next chapter link**. Refreshing metadata
updates the destination. Before opening, resolve again and cancel if the
destination no longer matches the preview.

## Desktop scroll interaction

When the pointer is over the Reading view or footer at the bottom, display the
same destination card with **↓ Scroll down to continue · or click**.

Require a fresh scroll burst after at least **300 milliseconds** without wheel
events. A burst that started above the bottom cannot navigate merely by reaching
the end. Accumulate additional downward wheel input, showing **Keep scrolling
to open** and a progress bar. Open at **160 normalized pixels**. Normalize line
deltas to 16 pixels per line and page deltas to viewport height; cap each event
at 120 pixels so one large event cannot open a note by itself.

Open when the threshold is reached. Reset progress on upward or predominantly
horizontal scrolling, modifier-key/zoom gestures, excluded targets, leaving the
bottom, a changed destination, or 500 milliseconds without eligible input.
Keep the mobile exclusions for embeds, interactive controls, and text selection.
An **800-millisecond cooldown** after wheel navigation, followed by the fresh
burst requirement, prevents remaining wheel/trackpad momentum from immediately
opening another chapter. Clicking the footer remains available.

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
  with English fallback for other languages. Desktop and reading-order
  explanations use the same three-language coverage.

## Implementation and release files

Edit `src/main.js` and run `node build.cjs` to generate `main.js`. The build uses
Node.js built-in modules and checks source syntax before writing the bundle.
Styles are maintained in `styles.css`.

The GitHub release includes `main.js`, `manifest.json`, and `styles.css`.
`manifest.json` declares version `1.3.1`, mobile support, and minimum Obsidian
version `1.0.0`; `versions.json` maps `1.3.1` to `1.0.0`. Compatibility at that
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
| All three next-chapter field names | Resolve wiki/plain/Markdown links and one-item lists | Automated checks passed |
| Cross-folder, broken, self, or external chapter links | Follow valid Markdown targets; stop for invalid ones | Automated checks passed |
| Desktop scroll burst reaches bottom | Requires a pause and new downward input | Automated check passed |
| Fresh desktop scroll meets threshold | Opens next note at the beginning | Automated check passed |
| Desktop reverse, horizontal, zoom, or embedded input | Does not navigate | Automated checks passed |
| Continued input after desktop navigation | Cooldown prevents chained opens | Automated check passed |
| Desktop mouse wheel and trackpad | Progress and fresh-burst behavior work naturally | Real-app check pending |
| Independent desktop toggle and footer click | Desktop works with mobile disabled and cleans up listeners | Automated checks passed |

Version 1.3.0 rebuilds the plugin assets for the new behaviors. The published
1.2.0 assets remain available in their original release.
