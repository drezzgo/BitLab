# BitLab UI/UX audit — 18 November 2026

## Findings and fixes

| Severity | Finding | User impact | Resolution |
| --- | --- | --- | --- |
| P1 | Long introduction and repeated explanation preceded the file picker | The main task was hard to find, especially on mobile | Shortened the hero and workbench copy; moved the file task into the first mobile viewport |
| P1 | Mobile navigation disappeared without an equivalent route to the tool | Visitors had no persistent way back to the compressor | Added a persistent header link to the workbench |
| P1 | The mode switch used tab roles without tab keyboard behavior | Assistive technology users received misleading interaction semantics | Changed it to a labeled button group with pressed states |
| P2 | Codec selection conveyed its state only through color | Screen reader users could not identify the selected strategy | Added pressed states to every codec button |
| P2 | Word size controls were disabled but prominent for automatic and byte based strategies | The first task included many irrelevant controls | Show word size only for manual Huffman; place presets in a disclosure |
| P2 | Some scrollable panels hid their scrollbars | Overflow content was less discoverable | Restored thin visible scrollbars |
| P2 | Muted text and small controls reduced readability and touch comfort | Scanning and tapping required more effort | Raised muted contrast and enlarged key controls and labels |

## What works well

- The product already has a recognizable visual language and a responsive workbench layout.
- File selection supports both a picker and drag and drop.
- The compressor exposes progress, cancellation, downloadable output, and detailed analysis.

## Verification

- Inspected rendered desktop (1280 px) and mobile (500 px) screenshots in Edge.
- Astro build passed; the optimizer test that timed out during parallel checks passed when rerun alone.
- A separate TypeScript export issue surfaced during validation and was repaired.
- The source detector reports no remaining findings after the file glyph border was reduced to 1 px.

The rendered review covered the entry viewport. It did not include physical touch, screen reader, or every result and dialog state.
