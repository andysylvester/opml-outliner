# OPML Outliner Updates - Project Spec

## Background

Outline Processor Markup Language (OPML) (https://opml.org) was created to define a specific set of characteristics/attributes for an XML format supporting editing of outlines.

In March 2026, Dave Winer created a basic outliner (https://this.how/ai/outliner/outliner.html) as a single HTML page with many of the features of his Drummer outliner product (https://drummer.land/).

There were some features that were left out, such as support for creating OPML subscription lists (https://opml.org/spec2.opml#subscriptionLists) and for adding elements supporting inclusion (https://opml.org/spec2.opml#1629042832000).

**Target users:** Anyone who wants to use an outliner to create OPML subscription lists and OPML files that can include other OPML files.

## Concept

Add updates to the user interface for the outliner app mentioned in the Background section to better support creation of OPML subscription lists and add nodes to OPML files so that other OPML files can be included within an OPML file

## Tech Stack

| Layer | Technology |
|---|---|
| Outliner app | https://this.how/ai/outliner/outliner.html |
| Testing | Red/green TDD — Add unit tests  |


## Development Roadmap

---

### Milestone 1: OPML subscription list update

**Goal:** Update the user interface of the outliner application to support adding the attributes needed for OPML subscription lists.

Use the following description for user interface changes: https://editsubscriptionlists.opml.org/#1652549531000

Per the OPML 2.0 spec (§Subscription lists), an RSS feed is an `<outline>` node with:
- **Required attributes:** `type="rss"`, `text`, `xmlUrl` (the http address of the feed)
- **Optional attributes:** `description`, `htmlUrl`, `language`, `title`, `version` (e.g. `RSS`, `RSS1`, `scriptingNews`)

Note: the current app's node model is text-only. `parseOPMLNode` reads only the `text` attribute (discarding all others) and `nodeToOPML` writes only `text`. A per-node attribute store, preserved through import → edit → export, is the shared foundation for both Milestone 1 and Milestone 2.


**Done when:** ✅ **Complete** (app v0.6.0)

- [x] 1. The node model carries arbitrary OPML attributes; import preserves them and export writes them back, so any OPML file round-trips losslessly (no attribute is silently dropped). — *`makeNode`/`parseOPMLNode`/`attrsToString`/`nodeToOPML`; tests: `roundtrip.test.js`, `realfile.test.js`*
- [x] 2. An "Add feed" command creates a node with `type="rss"`, prompting for the feed `xmlUrl` and setting `text`/`title`. — *`addFeed` + best-effort `fetchFeedMeta`; test: `addfeed.test.js`*
- [x] 3. An attribute inspector ("suitcase") lets the user view and edit a feed node's attributes: `xmlUrl`, `htmlUrl`, `description`, `language`, `title`, `version`. — *`renderInspector` + `#inspector-panel`; test: `inspector.test.js`*
- [x] 4. An exported file validates as a subscription list — every feed node has the required `type`, `text`, and `xmlUrl` attributes. — *`collectIssues` export check; test: `badge.test.js`*

---

### Milestone 2: OPML inclusion update

**Goal:** Update the user interface of the outliner application to support adding the attributes needed to add nodes to OPML files so that other OPML files can be included within an OPML file.

Per the OPML 2.0 spec (§Inclusion):
- A `type="include"` node must have a `url` attribute pointing to the OPML file to be included (always an OPML file).
- A `type="link"` node must have a `url` attribute; when expanded, if the URL ends in `.opml` the outline expands in place (inclusion), otherwise it is treated as a web link.
- `text` is, as usual, what is displayed in the outliner and in any HTML rendering.


**Done when:** ✅ **Complete** (app v0.6.0, including the stretch)

- [x] 1. An "Add inclusion" command creates a `type="include"` node with a `url` attribute pointing to an OPML file. — *`addInclusion` + best-effort `fetchInclusionTitle`; test: `addinclusion.test.js`*
- [x] 2. `type="link"` nodes with a `url` attribute are supported (the spec's older inclusion mechanism). — *inspector `link` type + `url` field; badges; tests: `inspector.test.js`, `roundtrip.test.js`*
- [x] 3. The attribute inspector exposes the `url` attribute, and export/import round-trips `include`/`link` nodes without loss. — *tests: `inspector.test.js`, `addinclusion.test.js`, `roundtrip.test.js`*
- [x] 4. *(Stretch)* Expanding an `include` node — or a `link` node whose URL ends in `.opml` — fetches the referenced OPML and inlines it in place. — *`isIncludable`/`expandInclusion`, view-only transclusion (never exported or persisted); test: `inclusion.test.js`*

---

### Milestone 3: Addition of tests

**Goal:** Create test suite for outliner application

**Done when:** ✅ **Complete** — 7 suites / 114 checks, run with `npm test` (see `tests/`)

- [x] 1. Unit tests cover an attribute-preserving import → export round-trip (no attribute dropped). — *`roundtrip.test.js`, `realfile.test.js` (real opml.org file)*
- [x] 2. Unit tests verify "Add feed" output has the required `type="rss"`, `text`, and `xmlUrl` attributes. — *`addfeed.test.js`*
- [x] 3. Unit tests verify "Add inclusion" output has `type="include"` and a `url` attribute. — *`addinclusion.test.js`*
- [x] 4. Unit tests validate that exported output conforms to the OPML 2.0 spec's required-attribute rules for subscription-list and inclusion nodes. — *`badge.test.js` (`collectIssues`), `addinclusion.test.js`*
- [x] 5. Tests follow red/green TDD and run as an automated suite. — *`tests/run.js` runner + shared `tests/harness.js` (loads the real `outliner.html` in jsdom); `npm test`*

---

## Status summary

All three milestones are complete as of app **v0.6.0**. The outliner (`outliner.html`, single file) now supports creating OPML subscription lists and OPML inclusion, with a per-node attribute store, an attribute inspector, "Add feed" / "Add include" commands, type badges, export validation, and view-only in-place inclusion. The pristine upstream download is preserved as `outliner.original.html`. A jsdom-based test suite (`tests/`, 7 suites / 114 checks) exercises the real app and runs via `npm test`.

