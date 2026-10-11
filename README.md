# TBpedia Interface

Obsidian interface customization for TBpedia. Originally forked from
[Obsidian Theme Picker](https://github.com/trey-sedate/obsidian-theme-picker),
version 1.0.9. Theme selection and light/dark switching follow Obsidian's language
preference and have independent settings toggles.

See the [design specification](DESIGN_SPEC.md) for settings, gesture behavior,
reading order, accessibility, and verification status.

Version **1.2.0** adds mobile swipe navigation. New mobile labels are provided in
English, Traditional Chinese, and Simplified Chinese, with English fallback.

## Mobile reading navigation

Enable **Settings → True Buddha Pedia Interaface → Mobile → Swipe up to next note**.
The option is off by default and runs only on mobile in Reading view.

At the bottom of a note, the footer previews the next Markdown note in the same
immediate folder. Make a new upward swipe of at least 80 pixels and release to
open it, or tap the footer. A swipe that merely scrolls to the end, a short swipe,
a horizontal swipe, or a cancelled touch does not open another note. Embedded
content, controls, text selections, and nested scrollable content are excluded.

Filename order uses natural numeric sorting (2 before 10). Alternatively, select
the **reading-order property** option and add a numeric YAML property:

```yaml
reading-order: 1
```

Notes with numeric values come first, followed by notes without values in
filename order. Ties use filename order. Subfolders and non-Markdown files are
excluded. **Loop at end of folder** is optional and off by default.

Navigation opens the next note in the same Obsidian tab at its beginning. Previous
positions are retained during the plugin session for return navigation. The
footer supports keyboard focus, screen readers, and reduced motion.

## Verification

Edit `src/main.js`, run `node build.cjs` to regenerate the distributable, then run
`node --check main.js` and `node tests/mobile-navigation.test.cjs`.
The automated checks use a mocked Obsidian environment; they do not replace
testing in the mobile app.

On Android and iOS, verify a long note and a short note, a scroll that reaches the
end, a separate swipe past the threshold, a short cancelled swipe, tapping the
footer, returning with Back, switching to editing, and disabling the option.
Check that the final lines remain readable above the footer, including with
large text and both light and dark themes.
