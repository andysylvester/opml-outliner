# Outliner test suite

Red/green unit tests for `outliner.html` (Milestone 3). Each suite loads the
**real** `outliner.html` in [jsdom](https://github.com/jsdom/jsdom) and exercises
the app's actual functions and DOM — not a reimplementation — so the tests fail
if the shipped app breaks.

## Running

```sh
npm install     # first time only — installs jsdom
npm test        # runs every tests/*.test.js and prints a summary
```

Run a single suite directly:

```sh
node tests/roundtrip.test.js
```

## Layout

| File | Covers |
|------|--------|
| `harness.js` | Shared loader (`loadOutliner`), assertion helper (`makeChecker`), DOM event helpers. Not a test itself. |
| `run.js` | Runner — executes each `*.test.js` in its own process and aggregates results. |
| `roundtrip.test.js` | Steps 1–3: lossless import → export of a crafted OPML doc (rss/include/link/custom attrs). |
| `realfile.test.js` | Steps 1–3: lossless round-trip of the real `fixtures/subscriptionList.opml` from opml.org. |
| `inspector.test.js` | Step 4: the attribute inspector — fields, type switching, add/rename/delete, read-only. |
| `addfeed.test.js` | Step 5: the "Add feed" command — offline fallback, metadata fetch, node placement, cancel, export. |
| `badge.test.js` | Step 6: type badges on rows + `collectIssues()` export validation. |
| `fixtures/subscriptionList.opml` | Real OPML 2.0 subscription-list example (opml.org). |

## Notes for writing new tests

The app stores its model in `let root` / `let focusedId` at script scope, which
are **not** window properties. Set up and read that state with `win.eval('...')`
(runs in the app's own scope). App **functions** are reachable directly as
`win.<name>` (e.g. `win.makeNode`, `win.nodeToOPML`, `win.addFeed`).
