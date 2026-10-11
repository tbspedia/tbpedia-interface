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
let clock = 1000;
obsidian.parseLinktext = link => ({ path: link.split('#')[0], subpath: '' });
const context = {
    require: () => obsidian, module: { exports: {} }, console,
    document: { createElement: () => new Element() },
    window: { localStorage: { getItem: () => 'en' }, getSelection: () => null, getComputedStyle: () => ({ overflowY: 'visible' }) },
    setTimeout, clearTimeout, Date: { now: () => clock }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8') + '\nmodule.exports = { NoteNavigation, folderSequence, nextChapter };', context);
const { NoteNavigation, folderSequence, nextChapter } = context.module.exports;
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
const linked = new TFile('Chapter 3.md', { children: [] });
linked.path = 'another-folder/Chapter 3.md';
app.metadataCache.getFirstLinkpathDest = (link, source) => {
    assert.equal(source, first.path);
    return ['Chapter 3', 'another-folder/Chapter 3.md'].includes(link) ? linked : link === '2' ? first : null;
};
const plugin = { app, settings: { enableMobileSwipe: true, mobileReadingOrder: 'filename', mobileLoopFolder: false } };
const nav = new NoteNavigation(plugin);
const touch = (y, x = 0) => ({ target: scroller, touches: [{ clientX: x, clientY: y }], cancelable: true, preventDefault() { this.prevented = true; } });
function swipe(distance, x = 0) {
    host.emit('touchstart', touch(200));
    host.emit('touchmove', touch(200 - distance, x));
    host.emit('touchend', { touches: [] });
}

(async () => {
    assert.deepEqual(Array.from(folderSequence(app, first, 'filename'), f => f.name), ['2.md', '10.md']);
    assert.deepEqual(Array.from(folderSequence(app, first, 'property'), f => f.name), ['10.md', '2.md']);
    for (const key of ['next chapter', '下一章節', '下一章节']) {
        for (const value of ['[[Chapter 3]]', '[[Chapter 3#Heading|Title]]', 'Chapter 3', ['[[Chapter 3]]'], '[Next](another-folder/Chapter%203.md)']) {
            cache.set(first, { frontmatter: { [key]: value } });
            assert.equal(nextChapter(app, first), linked, `${key} resolves ${value}`);
        }
    }
    for (const value of ['[[Missing]]', '[[2]]', 'https://example.com', 4, ['[[Chapter 3]]', '[[2]]']]) {
        cache.set(first, { frontmatter: { 'next chapter': value } });
        assert.equal(nextChapter(app, first), null, 'invalid or self links stop');
    }
    cache.set(first, { frontmatter: { 'next chapter': '[[Missing]]', '下一章節': '[[Chapter 3]]' } });
    assert.equal(nextChapter(app, first), null, 'first populated field takes precedence');
    cache.delete(first);
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
    plugin.settings.mobileReadingOrder = 'next-chapter';
    cache.set(first, { frontmatter: { '下一章節': '[[Chapter 3]]' } });
    nav.refresh();
    assert.equal(nav.next, linked, 'mobile follows explicit next chapter');
    cache.delete(first);
    nav.refresh();
    assert.equal(nav.next, null, 'no fallback or implicit loop for linked sequence');
    plugin.settings.mobileReadingOrder = 'filename';
    view.getMode = () => 'source';
    nav.refresh();
    assert.equal(nav.scroller, null, 'editing has no gesture handlers');
    view.getMode = () => 'preview';
    nav.refresh();
    plugin.settings.enableMobileSwipe = false;
    nav.refresh();
    assert.equal(nav.scroller, null, 'disabling removes navigation');
    assert.equal(Object.keys(host.listeners).length, 0, 'listeners are cleaned up');

    obsidian.Platform.isMobile = false;
    plugin.settings.enableDesktopScroll = true;
    plugin.settings.desktopReadingOrder = 'filename';
    plugin.settings.desktopLoopFolder = false;
    nav.refresh();
    assert.equal(nav.next, next, 'desktop enabled independently of mobile');
    assert.equal(host.listeners.touchstart, undefined, 'desktop has wheel instead of touch listeners');
    const wheel = (dy = 90, options = {}) => {
        const event = { target: scroller, deltaY: dy, deltaX: 0, deltaMode: 0, cancelable: true, preventDefault() { this.prevented = true; }, ...options };
        host.emit('wheel', event);
        return event;
    };
    const openedBefore = opens.length;
    scroller.scrollTop = 500;
    wheel();
    scroller.scrollTop = 900;
    clock += 20;
    wheel();
    clock += 20;
    wheel();
    assert.equal(opens.length, openedBefore, 'wheel burst reaching end does not navigate');
    clock += 400;
    assert.equal(wheel().prevented, true);
    assert.equal(opens.length, openedBefore, 'one short wheel event is insufficient');
    clock += 20;
    wheel(-90);
    assert.equal(nav.wheelDistance, 0, 'upward scroll cancels');
    clock += 400;
    wheel(90, { ctrlKey: true });
    assert.equal(opens.length, openedBefore, 'zoom does not navigate');
    clock += 400;
    wheel(90, { deltaX: 100 });
    assert.equal(nav.wheelDistance, 0, 'horizontal wheel does not navigate');
    const embed = scroller.appendChild(new Element());
    embed.closest = () => embed;
    clock += 400;
    wheel(200, { target: embed });
    assert.equal(nav.wheelDistance, 0, 'embedded content does not arm navigation');
    clock += 400;
    wheel(90);
    clock += 20;
    wheel(90);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(opens.length, openedBefore + 1, 'fresh downward wheel burst opens next note');
    assert.equal(scroller.scrollTop, 0);
    plugin.settings.desktopLoopFolder = true;
    scroller.scrollTop = 900;
    clock += 20;
    wheel(200);
    wheel(200);
    assert.equal(opens.length, openedBefore + 1, 'cooldown prevents chained navigation');
    view.file = first;
    plugin.settings.desktopReadingOrder = 'next-chapter';
    cache.set(first, { frontmatter: { '下一章节': '[[Chapter 3]]' } });
    nav.refresh();
    assert.equal(nav.next, linked, 'desktop supports next-chapter properties');
    clock += 1000;
    host.emit('click', {});
    nav.footer.emit('click', {});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(opens.at(-1).file, linked, 'footer click opens linked chapter');
    plugin.settings.enableDesktopScroll = false;
    nav.refresh();
    assert.equal(nav.scroller, null);
    assert.equal(Object.keys(host.listeners).length, 0, 'desktop listeners are removed');
    console.log('Mobile, desktop, and next-chapter navigation checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
