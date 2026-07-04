// Milestone 1, Step 5: the "Add feed" command.
const { loadOutliner, makeChecker, tick } = require('./harness');

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Scripting News</title>
  <link>http://scripting.com/</link>
  <description>Dave Winer's blog</description>
  <language>en-us</language>
  <item><title>An item, not the feed</title></item>
</channel></rss>`;

// fetch behaviour is swapped per-test via this holder.
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

  // Path 1: offline / CORS failure — feed node still valid.
  fetchImpl = () => Promise.reject(new Error('CORS blocked'));
  resetOneEmpty();
  win.prompt = () => 'http://scripting.com/rss.xml';
  win.addFeed();
  let node = win.eval('findNode(root, root.children[0].id)');
  check('reused the empty focused node (no new sibling)', win.eval('root.children.length') === 1);
  check('offline: type="rss" set',   node.attributes.type === 'rss');
  check('offline: xmlUrl set',       node.attributes.xmlUrl === 'http://scripting.com/rss.xml');
  check('offline: text falls back to host label', node.text === 'scripting.com');
  await tick();
  check('offline: no metadata attributes added', !('title' in node.attributes) && !('htmlUrl' in node.attributes));

  // Path 2: metadata fetch succeeds.
  fetchImpl = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(SAMPLE_RSS) });
  resetOneEmpty();
  win.prompt = () => 'http://scripting.com/rss.xml';
  win.addFeed();
  node = win.eval('findNode(root, root.children[0].id)');
  check('online: type + xmlUrl set immediately', node.attributes.type === 'rss' && node.attributes.xmlUrl === 'http://scripting.com/rss.xml');
  await tick();
  check('online: title from feed (not item title)', node.attributes.title === 'Scripting News');
  check('online: htmlUrl from feed link',  node.attributes.htmlUrl === 'http://scripting.com/');
  check('online: description from feed',    node.attributes.description === "Dave Winer's blog");
  check('online: language from feed',       node.attributes.language === 'en-us');
  check('online: version = RSS',            node.attributes.version === 'RSS');
  check('online: headline adopts feed title', node.text === 'Scripting News');

  // Path 3: non-empty focused node -> creates a sibling below.
  fetchImpl = () => Promise.reject(new Error('CORS'));
  win.eval(`
    root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
    var a = makeNode('Existing headline'); root.children.push(a);
    render(); focusNode(a.id);
  `);
  win.prompt = () => 'https://daringfireball.net/feeds/main';
  win.addFeed();
  check('non-empty node: sibling created', win.eval('root.children.length') === 2);
  check('non-empty node: original text untouched', win.eval('root.children[0].text') === 'Existing headline');
  check('non-empty node: new sibling is the feed', win.eval('root.children[1].attributes.type') === 'rss');
  await tick();

  // Path 4: cancel prompt -> nothing happens.
  resetOneEmpty();
  const before = win.eval('root.children.length');
  win.prompt = () => null;
  win.addFeed();
  check('cancel: no node added', win.eval('root.children.length') === before);

  // Path 5: exported feed validates (type + text + xmlUrl present).
  resetOneEmpty();
  win.prompt = () => 'http://example.com/feed.xml';
  win.addFeed();
  await tick();
  const out = win.nodeToOPML(win.eval('root.children[0]'), 0);
  check('export has required type="rss"', /type="rss"/.test(out));
  check('export has required xmlUrl',      /xmlUrl="http:\/\/example\.com\/feed\.xml"/.test(out));
  check('export has required text',        /text="[^"]+"/.test(out));

  check.done();
})();
