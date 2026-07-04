# OPML Outliner

A single-page HTML outliner for creating **OPML subscription lists** and **OPML inclusion** files — no build step, no server, no dependencies. Open the file and start outlining.

It extends [Dave Winer's outliner](https://this.how/ai/outliner/outliner.html) (a compact, single-page version of his [Drummer](https://drummer.land/) app) with the OPML 2.0 features it originally left out: attaching feed attributes to nodes, and linking one OPML file into another.

## Features

- **Outlining** — keyboard-driven editing (Enter, Tab/Shift-Tab, Alt-↑/↓), collapse/expand, hoist, drag-to-reorder, and localStorage persistence.
- **Subscription lists** — an **Add feed** command turns a node into an RSS feed (`type="rss"` + `xmlUrl`), with a best-effort read of the feed to fill in `title`, `htmlUrl`, `description`, `language`, and `version`.
- **Inclusion** — an **Add include** command creates a `type="include"` node whose `url` points to another OPML file, so you can compose one file out of many. `type="link"` nodes are supported too.
- **In-place transclusion** — expand an `include` node (or a `link` to a `.opml` file) to view the referenced OPML inline, read-only. Transcluded content is a live view — it is never written into your file on export or save.
- **Attribute inspector** ("🧳 suitcase") — view and edit any node's OPML attributes: labeled fields for known feed/inclusion attributes, plus a generic list for anything custom.
- **Lossless OPML** — import and export preserve *every* attribute, so files round-trip without dropping data. Compatible with files from Drummer and Frontier.
- **Type badges** on rows, an **export validation** nudge for feeds/includes missing their required attribute, and a **read-only URL viewer** (`outliner.html?url=…`) for opening any public OPML file.

## Usage

Open `outliner.html` in any modern browser — that's it. Everything runs client-side.

- **Create a subscription list:** click **+ Add feed**, paste a feed URL, and repeat. Export with **Export OPML**.
- **Compose files:** click **+ Add include**, paste the URL of another `.opml` file, then click the node's bullet to expand it in place.
- **Edit attributes:** click the 🧳 icon on a row (or the **Inspect** button) to open the inspector.
- **View any OPML file:** open `outliner.html?url=https://example.com/list.opml`.

## Development & tests

The app is one self-contained file (`outliner.html`). The test suite loads that real file in [jsdom](https://github.com/jsdom/jsdom) and exercises its actual functions and DOM, so tests fail if the shipped app breaks.

```sh
npm install     # first time only — installs jsdom (dev dependency)
npm test        # runs every tests/*.test.js and prints a summary
```

7 suites / 114 checks cover the lossless round-trip, Add feed, Add include, the inspector, type badges/validation, and in-place inclusion. See [`tests/README.md`](tests/README.md) for layout and notes on writing new tests.

## Project structure

| Path | What it is |
|------|-----------|
| `outliner.html` | The app — everything is here. |
| `outliner.original.html` | Pristine upstream download, kept for reference/diffing. |
| `specForOutlinerUpdates.md` | Project spec and milestone criteria (all complete). |
| `tests/` | jsdom test suite (`npm test`) + fixtures. |
| `spec2.opml`, `editsubscriptionlists.html` | Reference copies of the OPML 2.0 spec pages. |

## Credits & license

Based on the outliner by **Dave Winer** (this.how / Drummer). Implements the [OPML 2.0 specification](https://opml.org/spec2.opml) — §Subscription lists and §Inclusion. The OPML specification is © UserLand Software / Scripting News; the reference spec files included here retain their original copyright.

Licensed under the [MIT License](LICENSE) © 2026 Andy Sylvester.
