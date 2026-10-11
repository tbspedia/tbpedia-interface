const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

class Element {
    constructor() {
        this.listeners = {};
        this.children = [];
        this.classList = { add() {}, remove() {} };
        this.style = { setProperty() {}, removeProperty() {} };
        this.scrollTop = 900;
        this.scrollHeight = 1000;
        this.clientHeight = 100;
        this.scrollWidth = this.clientWidth = 100;
    }
    appendChild(el) { this.children.push(el); el.parentElement = this; return el; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    removeEventListener(name) { delete this.listeners[name]; }
    setAttribute() {}
    remove() {}
    closest() { return null; }
    contains(el) { return el === this || this.children.includes(el); }
    emit(name, event) { this.listeners[name]?.(event); }
}
class TFile {
    constructor(name, parent) { this.name = name; this.basename = name.slice(0, -3); this.path = `folder/${name}`; this.extension = 'md'; this.parent = parent; }
}
class MarkdownView {}
const obsidian = { TFile, MarkdownView, Platform: { isMobile: true }, Plugin: class {}, PluginSettingTab: class {}, FuzzySuggestModal: class {}, Notice: class {} };
const context = {
    require: () => obsidian, module: { exports: {} }, console,
    document: { createElement: () => new Element() },
    window: { localStorage: { getItem: () => 'en' }, getSelection: () => null, getComputedStyle: () => ({ overflowY: 'visible' }) }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8') + '\nmodule.exports = { MobileNoteNavigation, folderSequence };', context);
const { MobileNoteNavigation, folderSequence } = context.module.exports;
const folder = { children: [] };
const first = new TFile('2.md', folder);
const next = new TFile('10.md', folder);
folder.children = [next, { name: 'subfolder', children: [] }, first];
const cache = new Map([[next, { frontmatter: { 'reading-order': 1 } }]]);
const scroller = new Element();
const host = new Element();
host.querySelector = () => scroller;
host.appendChild(scroller);
const view = new MarkdownView();
view.file = first;
view.contentEl = host;
view.getMode = () => 'preview';
const opens = [];
view.leaf = { openFile: async (file, state) => { opens.push({ file, state }); view.file = file; } };
const app = { workspace: { getActiveViewOfType: () => view }, metadataCache: { getFileCache: file => cache.get(file) } };
const plugin = { app, settings: { enableMobileSwipe: true, mobileReadingOrder: 'filename', mobileLoopFolder: false } };
const nav = new MobileNoteNavigation(plugin);
const touch = (y, x = 0) => ({ target: scroller, touches: [{ clientX: x, clientY: y }], cancelable: true, preventDefault() { this.prevented = true; } });
function swipe(distance, x = 0) {
    host.emit('touchstart', touch(200));
    host.emit('touchmove', touch(200 - distance, x));
    host.emit('touchend', { touches: [] });
}

(async () => {
    assert.deepEqual(Array.from(folderSequence(app, first, 'filename'), f => f.name), ['2.md', '10.md']);
    assert.deepEqual(Array.from(folderSequence(app, first, 'property'), f => f.name), ['10.md', '2.md']);
    nav.refresh();
    assert.equal(nav.next, next);
    assert.equal(nav.footer.hidden, false);
    swipe(40);
    assert.equal(opens.length, 0, 'short swipe cancels');
    swipe(90, 120);
    assert.equal(opens.length, 0, 'horizontal swipe cancels');
    scroller.scrollTop = 500;
    host.emit('touchstart', touch(200));
    scroller.scrollTop = 900;
    host.emit('touchmove', touch(50));
    host.emit('touchend', { touches: [] });
    assert.equal(opens.length, 0, 'scroll reaching the end requires a fresh swipe');
    host.emit('touchstart', touch(200));
    host.emit('touchcancel', {});
    host.emit('touchend', { touches: [] });
    assert.equal(opens.length, 0, 'cancelled touch does not navigate');
    swipe(90);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(opens.length, 1);
    assert.equal(opens[0].file, next);
    assert.equal(opens[0].state.eState.scroll, 0);
    assert.equal(scroller.scrollTop, 0);
    assert.equal(nav.next, null, 'last note stops without looping');
    plugin.settings.mobileLoopFolder = true;
    nav.refresh();
    assert.equal(nav.next, first);
    view.file = first;
    nav.refresh();
    assert.equal(scroller.scrollTop, 900, 'return restores the previous position');
    view.getMode = () => 'source';
    nav.refresh();
    assert.equal(nav.scroller, null, 'editing has no gesture handlers');
    view.getMode = () => 'preview';
    nav.refresh();
    plugin.settings.enableMobileSwipe = false;
    nav.refresh();
    assert.equal(nav.scroller, null, 'disabling removes navigation');
    assert.equal(Object.keys(host.listeners).length, 0, 'listeners are cleaned up');
    console.log('Mobile navigation checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
