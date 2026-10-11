# TBpedia Interface

Obsidian interface customization for TBpedia. Originally forked from
[Obsidian Theme Picker](https://github.com/trey-sedate/obsidian-theme-picker),
version 1.0.9. Theme selection and light/dark switching follow Obsidian's language
preference and have independent settings toggles.

See the [design specification](DESIGN_SPEC.md) for settings, gesture behavior,
reading order, accessibility, and verification status.

Current release: **1.3.1**, rebuilt from the current source with the same navigation
behavior as 1.3.0.

Version **1.3.0** adds desktop scroll navigation and explicit next-chapter links
to the mobile navigation introduced in 1.2.0. Navigation labels are provided in
English, Traditional Chinese, and Simplified Chinese, with English fallback.

## Mobile reading navigation

Enable **Settings → True Buddha Pedia Interaface → Mobile → Swipe up to next note**.
The option is off by default and runs only on mobile in Reading view.

At the bottom of a note, the footer previews the next Markdown note in the same
immediate folder, or the note named by its next-chapter property. Make a new upward swipe of at least 80 pixels and release to
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
excluded from folder ordering. **Loop at end of folder** is optional and off by default.

### Next-chapter property sequence

Select **Reading order → Next chapter property** under Mobile or Desktop. Set
one of these fields in each note; they are checked in the order shown:

```yaml
next chapter: "[[Chapter 2]]"
```

```yaml
下一章節: "[[第二章]]"
```

```yaml
下一章节: "[[第二章]]"
```

The first populated field determines the next note. Obsidian links, plain note
names/paths, Markdown links, and one-item lists are accepted. Explicit links may
lead to another folder. Missing, broken, external, non-Markdown, or self links
stop the sequence; this mode never falls back to filename order or automatic
looping. Heading/block references open the destination note at its beginning.

## Desktop reading navigation

Enable **Settings → True Buddha Pedia Interaface → Desktop → Scroll to next note**.
Desktop has its own Reading order and Loop settings; all navigation is off by
default. The same footer previews the destination and can be clicked.

In Reading view, scroll to the bottom, pause for at least 300 milliseconds, then
scroll down again with a mouse wheel or trackpad. Further downward input fills
the progress bar and opens the next note. Reaching the end during an existing
scroll burst does not navigate. An 800-millisecond cooldown prevents continued
momentum from skipping through notes. Upward/horizontal scrolling, zoom gestures,
embedded controls, and text selections are excluded. Editing view is unaffected.

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

On desktop, verify a mouse wheel and trackpad, the pause at the bottom, continued
momentum after opening a short note, zoom/horizontal scrolling, footer clicks,
and Back navigation. Test linked chapters within and across folders and all
three property names. Real Obsidian device/app checks remain pending; automated
tests cover the sequence resolver and mobile/desktop navigation logic.
