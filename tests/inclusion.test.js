// Milestone 2, criterion 4: view-only in-place inclusion (transclusion).
const { loadOutliner, makeChecker, tick } = require('./harness');

const INCLUDED_OPML = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>Friend's Blogroll</title></head>
  <body>
    <outline text="Scripting News" type="rss" xmlUrl="http://scripting.com/rss.xml"/>
    <outline text="A category">
      <outline text="Daring Fireball" type="rss" xmlUrl="https://daringfireball.net/feeds/main"/>
    </outline>
  </body>
</opml>`;

let fetchImpl = () => Promise.reject(new Error('CORS'));
const { win, doc, errors } = loadOutliner({ fetch: (...a) => fetchImpl(...a) });
const check = makeChecker();

function setIncludeNode(attrs) {
  win.eval(`
    root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
    var n = makeNode('My include');
    n.attributes = ${JSON.stringify(attrs)};
    root.children.push(n);
    window.__nid = n.id;
    render();
  `);
  return win.eval('findNode(root, window.__nid)');
}

(async () => {
  check('page loaded with no jsdom errors', errors.length === 0);
  if (errors.length) errors.forEach(e => console.log('    ERROR: ' + e.split('\n')[0]));

  // isIncludable classification.
  check('include+url is includable',   win.isIncludable({ attributes:{ type:'include', url:'http://x/a.opml' } }) === true);
  check('link to .opml is includable', win.isIncludable({ attributes:{ type:'link', url:'http://x/list.opml' } }) === true);
  check('link to .opml?x=1 is includable', win.isIncludable({ attributes:{ type:'link', url:'http://x/list.opml?x=1' } }) === true);
  check('link to web page is NOT includable', win.isIncludable({ attributes:{ type:'link', url:'http://x/page.html' } }) === false);
  check('rss node is NOT includable',  win.isIncludable({ attributes:{ type:'rss', xmlUrl:'http://x/rss' } }) === false);

  // Expand an include node successfully.
  fetchImpl = () => Promise.resolve({ ok:true, status:200, text:()=>Promise.resolve(INCLUDED_OPML) });
  let node = setIncludeNode({ type:'include', url:'http://example.com/list.opml' });
  check('includable node marked with .includable class', !!doc.querySelector(`.node[data-id="${node.id}"].includable`));
  win.expandInclusion(node);
  await tick();
  check('node.included set true', node.included === true);
  check('transcluded children loaded (2 top-level)', node.children.length === 2);
  check('first child is a feed from the file', node.children[0].attributes.xmlUrl === 'http://scripting.com/rss.xml');
  check('every transcluded node flagged', node.children[0].transcluded === true && node.children[1].children[0].transcluded === true);
  check('rendered rows are read-only', doc.querySelector(`.node[data-id="${node.children[0].id}"] .node-text`).contentEditable === 'false');
  check('transcluded rows are not draggable', doc.querySelector(`.node[data-id="${node.children[0].id}"] .node-row`).draggable === false);
  check('rendered rows carry .transcluded class', !!doc.querySelector(`.node[data-id="${node.children[0].id}"].transcluded`));
  check('transcluded feed still shows its RSS badge', !!doc.querySelector(`.node[data-id="${node.children[0].id}"] .type-badge.t-rss`));

  // The include node must export/persist as a bare reference (no transcluded content).
  const out = win.nodeToOPML(node, 0);
  check('export emits include as a leaf reference', /^<outline text="My include" type="include" url="http:\/\/example\.com\/list\.opml"\/>$/.test(out));
  check('export contains no transcluded content', !/Scripting News/.test(out) && !/Daring Fireball/.test(out));
  const ser = win.serializeNode(node);
  check('serialize (localStorage) drops transcluded children', ser.children.length === 0);
  check('serialize keeps the include attributes', ser.attributes.type === 'include' && ser.attributes.url === 'http://example.com/list.opml');

  // Whole-document export with an expanded inclusion stays a valid reference file.
  const bodyOut = win.eval('root').children.map(n => win.nodeToOPML(n, 4)).join('\n');
  check('doc export keeps inclusion as reference only', /type="include"/.test(bodyOut) && !/xmlUrl=/.test(bodyOut));

  // Failure path: fetch rejects -> node stays unincluded, no children.
  fetchImpl = () => Promise.reject(new Error('CORS blocked'));
  node = setIncludeNode({ type:'include', url:'http://example.com/bad.opml' });
  win.expandInclusion(node);
  await tick();
  check('failed fetch: node.included stays falsy', !node.included);
  check('failed fetch: no children added', node.children.length === 0);

  // A plain link (non-.opml) is not includable and gains no children on bullet logic.
  node = setIncludeNode({ type:'link', url:'http://example.com/page.html' });
  check('web link node lacks .includable class', !doc.querySelector(`.node[data-id="${node.id}"].includable`));

  check.done();
})();
