// Milestone 2: the "Add inclusion" command.
const { loadOutliner, makeChecker, tick } = require('./harness');

const SAMPLE_OPML = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>My Friend's Blogroll</title></head>
  <body><outline text="Some feed" type="rss" xmlUrl="http://x/rss"/></body>
</opml>`;

let fetchImpl = () => Promise.reject(new Error('CORS'));
const { win, errors } = loadOutliner({ fetch: (...a) => fetchImpl(...a) });
const check = makeChecker();

function resetOneEmpty() {
  win.eval(`
    root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
    var first = makeNode(''); root.children.push(first);
    render(); focusNode(first.id);
  `);
}

(async () => {
  check('page loaded with no jsdom errors', errors.length === 0);
  if (errors.length) errors.forEach(e => console.log('    ERROR: ' + e.split('\n')[0]));
  check('addInclusion is defined', typeof win.addInclusion === 'function');

  // Path 1: offline / CORS failure — include node still valid.
  fetchImpl = () => Promise.reject(new Error('CORS blocked'));
  resetOneEmpty();
  win.prompt = () => 'http://example.com/dave/list.opml';
  win.addInclusion();
  let node = win.eval('findNode(root, root.children[0].id)');
  check('reused the empty focused node (no new sibling)', win.eval('root.children.length') === 1);
  check('offline: type="include" set', node.attributes.type === 'include');
  check('offline: url set',            node.attributes.url === 'http://example.com/dave/list.opml');
  check('offline: text is filename label', node.text === 'list.opml');
  await tick();
  check('offline: node unchanged after failed fetch', node.text === 'list.opml');

  // Path 2: title fetch succeeds -> headline adopts the file's <title>.
  fetchImpl = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(SAMPLE_OPML) });
  resetOneEmpty();
  win.prompt = () => 'http://example.com/dave/list.opml';
  win.addInclusion();
  node = win.eval('findNode(root, root.children[0].id)');
  check('online: type + url set immediately', node.attributes.type === 'include' && node.attributes.url === 'http://example.com/dave/list.opml');
  await tick();
  check("online: headline adopts included file's title", node.text === "My Friend's Blogroll");
  check('online: include node has no rss/xml attributes', !('xmlUrl' in node.attributes));

  // Path 3: non-empty focused node -> creates a sibling below.
  fetchImpl = () => Promise.reject(new Error('CORS'));
  win.eval(`
    root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
    var a = makeNode('Existing headline'); root.children.push(a);
    render(); focusNode(a.id);
  `);
  win.prompt = () => 'http://example.com/other.opml';
  win.addInclusion();
  check('non-empty node: sibling created', win.eval('root.children.length') === 2);
  check('non-empty node: original untouched', win.eval('root.children[0].text') === 'Existing headline');
  check('non-empty node: new sibling is the include', win.eval('root.children[1].attributes.type') === 'include');
  await tick();

  // Path 4: cancel prompt -> nothing happens.
  resetOneEmpty();
  const before = win.eval('root.children.length');
  win.prompt = () => null;
  win.addInclusion();
  check('cancel: no node added', win.eval('root.children.length') === before);

  // Path 5: exported include validates and round-trips (type + text + url, no issues).
  resetOneEmpty();
  win.prompt = () => 'http://example.com/list.opml';
  win.addInclusion();
  await tick();
  const incNode = win.eval('root.children[0]');
  const out = win.nodeToOPML(incNode, 0);
  check('export has type="include"', /type="include"/.test(out));
  check('export has required url',    /url="http:\/\/example\.com\/list\.opml"/.test(out));
  check('export has required text',   /text="[^"]+"/.test(out));
  check('collectIssues: valid include has no warnings', win.collectIssues(win.eval('root'), []).length === 0);

  // Re-parse the exported include -> lossless round-trip.
  const reparsed = win.parseOPMLNode(new win.DOMParser().parseFromString(out, 'text/xml').documentElement);
  check('round-trip: type preserved', reparsed.attributes.type === 'include');
  check('round-trip: url preserved',  reparsed.attributes.url === 'http://example.com/list.opml');

  check.done();
})();
