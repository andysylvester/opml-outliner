// Milestone 1, Step 6: type badges on rows + export validation warnings.
const { loadOutliner, makeChecker } = require('./harness');
const { win, doc, errors } = loadOutliner();
const check = makeChecker();

check('page loaded with no jsdom errors', errors.length === 0);
if (errors.length) errors.forEach(e => console.log('    ERROR: ' + e.split('\n')[0]));

// Build a tree with rss, include, link, custom type, and plain nodes.
win.eval(`
  root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
  var f = makeNode('Scripting News'); f.attributes = { type:'rss', xmlUrl:'http://x/rss' };
  var i = makeNode('A list');         i.attributes = { type:'include', url:'http://x/list.opml' };
  var l = makeNode('Home');           l.attributes = { type:'link', url:'http://x/' };
  var c = makeNode('Weird');          c.attributes = { type:'directory' };
  var p = makeNode('Plain node');
  root.children.push(f, i, l, c, p);
  window.__ids = [f.id, i.id, l.id, c.id, p.id];
  render();
`);
const [fId, iId, lId, cId, pId] = win.__ids;
const badge = id => doc.querySelector(`.node[data-id="${id}"] > .node-row > .type-badge`);

check('rss node has RSS badge',        badge(fId) && badge(fId).textContent === 'rss' && badge(fId).classList.contains('t-rss'));
check('include node has include badge', badge(iId) && badge(iId).classList.contains('t-include'));
check('link node has link badge',      badge(lId) && badge(lId).classList.contains('t-link'));
check('custom type uses t-other',      badge(cId) && badge(cId).textContent === 'directory' && badge(cId).classList.contains('t-other'));
check('plain node has no badge',       !badge(pId));

// collectIssues flags typed nodes missing their required attribute.
win.eval(`
  root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
  var good = makeNode('Good feed');      good.attributes = { type:'rss', xmlUrl:'http://x/rss' };
  var bad1 = makeNode('No url feed');    bad1.attributes = { type:'rss' };
  var bad2 = makeNode('No url include'); bad2.attributes = { type:'include' };
  root.children.push(good, bad1, bad2); render();
`);
const issues = win.collectIssues(win.eval('root'), []);
check('collectIssues flags 2 problems', issues.length === 2);
check('flags rss missing xmlUrl', issues.some(s => /No url feed.*xmlUrl/.test(s)));
check('flags include missing url', issues.some(s => /No url include.*url/.test(s)));
check('does not flag the valid feed', !issues.some(s => /Good feed/.test(s)));

// A fully valid subscription list yields no issues.
win.eval(`
  root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
  var a = makeNode('F1'); a.attributes = { type:'rss', xmlUrl:'http://x/1' };
  var b = makeNode('F2'); b.attributes = { type:'rss', xmlUrl:'http://x/2' };
  root.children.push(a, b); render();
`);
check('valid subscription list -> no issues', win.collectIssues(win.eval('root'), []).length === 0);

check.done();
