// Milestone 1, Step 4: attribute inspector ("suitcase").
const { loadOutliner, makeChecker, events } = require('./harness');
const { win, doc, errors } = loadOutliner();
const check = makeChecker();
const { input: fireInput, change: fireChange, click: fireClick } = events(win);

function fieldInput(label) {
  for (const f of doc.querySelectorAll('#inspector-panel-body .insp-field')) {
    const l = f.querySelector('label');
    if (l && l.textContent === label) return f.querySelector('input,textarea,select');
  }
  return null;
}
function kvRow(key) {
  for (const r of doc.querySelectorAll('#inspector-panel-body .insp-kv'))
    if (r.querySelector('.insp-key').value === key) return r;
  return null;
}

check('page loaded with no jsdom errors', errors.length === 0);
if (errors.length) errors.forEach(e => console.log('    ERROR: ' + e.split('\n')[0]));
check('win.eval can see internal root binding', win.eval('typeof root') === 'object');

win.eval(`
  root = { id:0, text:'__root__', children:[], collapsed:false, attributes:{} };
  var feed = makeNode('Scripting News');
  feed.attributes = { type:'rss', xmlUrl:'http://scripting.com/rss.xml' };
  root.children.push(feed);
  window.__feedId = feed.id;
  render(); openInspectorFor(feed);
`);
const feedId = win.__feedId;
const feed = win.eval('findNode(root, ' + feedId + ')');

check('inspector panel is visible', !doc.getElementById('inspector-panel').classList.contains('hidden'));
check('type select shows rss', fieldInput('Type') && fieldInput('Type').value === 'rss');
check('rss known fields rendered', ['xmlUrl','htmlUrl','title','description','language','version'].every(f => fieldInput(f)));
check('node row got has-attrs class', !!doc.querySelector(`.node[data-id="${feedId}"].has-attrs`));

const htmlUrl = fieldInput('htmlUrl');
htmlUrl.value = 'http://scripting.com/'; fireInput(htmlUrl);
check('editing htmlUrl field updates model', feed.attributes.htmlUrl === 'http://scripting.com/');

const title = fieldInput('title');
title.value = 'X'; fireInput(title);
check('typing title sets it', feed.attributes.title === 'X');
title.value = ''; fireInput(title);
check('clearing title removes the attribute', !('title' in feed.attributes));

const typeSel = fieldInput('Type');
typeSel.value = 'include'; fireChange(typeSel);
check('type change updates model', feed.attributes.type === 'include');
check('url field now shown for include', !!fieldInput('url'));
check('xmlUrl demoted to Other attributes list', !!kvRow('xmlUrl'));

const urlField = fieldInput('url');
urlField.value = 'http://example.com/list.opml'; fireInput(urlField);
check('editing url field updates model', feed.attributes.url === 'http://example.com/list.opml');

win.addBlankAttr(feed);
check('blank attribute added to model', 'attr' in feed.attributes);
win.renameAttr(feed, 'attr', 'category');
check('rename attr -> category', ('category' in feed.attributes) && !('attr' in feed.attributes));
feed.attributes.category = '/News';

fireClick(kvRow('xmlUrl').querySelector('.insp-del'));
check('delete button removes attribute', !('xmlUrl' in feed.attributes));

const out = win.nodeToOPML(feed, 0);
check('export has type="include"', /type="include"/.test(out));
check('export has url',            /url="http:\/\/example\.com\/list\.opml"/.test(out));
check('export has category',       /category="\/News"/.test(out));
check('export dropped cleared/deleted attrs', !/title=/.test(out) && !/xmlUrl=/.test(out));

win.eval('setReadOnly("http://x/y.opml"); renderInspector();');
check('read-only disables type select', fieldInput('Type').disabled === true);
check('read-only hides + Add button', !doc.querySelector('#inspector-panel-body .insp-addbtn'));

check.done();
