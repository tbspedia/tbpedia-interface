const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let now = 0;
let nextTimer = 0;
const timers = new Map();
function advance(milliseconds) {
    const target = now + milliseconds;
    while (true) {
        const due = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].callback();
    }
    now = target;
}
class Events {
    constructor() { this.listeners = new Map(); }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    removeEventListener(name, callback) { assert.equal(this.listeners.get(name), callback); this.listeners.delete(name); }
    emit(name, event) { this.listeners.get(name)?.(event); }
}
function bar() {
    const classes = new Set(['status-bar', 'theme-class']);
    return {
        isConnected: true, classes,
        classList: {
            toggle(name, value) { if (value) classes.add(name); else classes.delete(name); },
            remove(name) { classes.delete(name); }
        }
    };
}
function doc(withBar = true) {
    const document = new Events();
    const win = new Events();
    win.innerHeight = 800;
    win.innerWidth = 1200;
    win.setTimeout = (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, at: now + delay }); return id; };
    win.clearTimeout = id => timers.delete(id);
    document.defaultView = win;
    document.bars = withBar ? [bar()] : [];
    document.querySelectorAll = () => document.bars;
    return document;
}
const main = doc();
const obsidian = { Platform: { isMobile: false }, Plugin: class {}, PluginSettingTab: class {}, FuzzySuggestModal: class {} };
const context = { require: () => obsidian, module: { exports: {} }, document: main };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8') + '\nmodule.exports = AutoHideStatusBar;', context);
const AutoHideStatusBar = context.module.exports;
const leaves = [];
const plugin = { settings: { enableStatusBarAutoHide: false }, app: { workspace: { iterateAllLeaves: callback => leaves.forEach(callback) } } };
const controller = new AutoHideStatusBar(plugin);
const hidden = statusBar => statusBar.classes.has('tbpedia-status-bar-hidden');
const move = (document, x, y) => document.emit('pointermove', { clientX: x, clientY: y });

controller.apply();
assert.equal(main.listeners.size, 0, 'disabled feature installs no handlers');
plugin.settings.enableStatusBarAutoHide = true;
controller.apply();
assert.equal(hidden(main.bars[0]), false);
advance(14999);
controller.apply();
assert.equal(hidden(main.bars[0]), false, 'unrelated settings/layout changes do not restart countdown');
advance(1);
assert.equal(hidden(main.bars[0]), true, 'initial visibility lasts exactly 15 seconds');
move(main, 500, 791);
assert.equal(hidden(main.bars[0]), true, 'outside bottom edge does not reveal');
move(main, 500, 795);
assert.equal(hidden(main.bars[0]), false, 'entering bottom edge reveals');
advance(10000);
move(main, 501, 796);
advance(19999);
assert.equal(hidden(main.bars[0]), false);
advance(1);
assert.equal(hidden(main.bars[0]), true, 'moving within edge does not prolong the 30-second timer');
move(main, 502, 797);
assert.equal(hidden(main.bars[0]), true, 'must leave and re-enter to reveal again');
move(main, 500, 700);
move(main, 500, 800);
assert.equal(hidden(main.bars[0]), false);
advance(10000);
move(main, 500, 700);
move(main, 500, 800);
advance(29999);
assert.equal(hidden(main.bars[0]), false, 'new edge entry restarts a 30-second reveal');
advance(1);
assert.equal(hidden(main.bars[0]), true);

const oldBar = main.bars[0];
oldBar.isConnected = false;
main.bars = [bar()];
controller.apply();
assert.equal(hidden(main.bars[0]), true, 'replacement status bar retains hidden state');
assert.equal(hidden(oldBar), false, 'detached bar is restored');
controller.reveal(main);
assert.equal(hidden(main.bars[0]), false, 'keyboard command can reveal');
advance(30000);
assert.equal(hidden(main.bars[0]), true);
main.emit('pointerdown', { clientY: 800 });
assert.equal(hidden(main.bars[0]), false, 'deliberate edge press can reveal again');

const popout = doc();
leaves.push({ view: { containerEl: { ownerDocument: popout } } });
controller.apply();
advance(15000);
assert.equal(hidden(popout.bars[0]), true, 'popout has its own initial countdown');
move(popout, 500, 800);
assert.equal(hidden(popout.bars[0]), false);
controller.removeDocument(popout);
assert.equal(popout.listeners.size, 0, 'closing window removes handlers');
assert.equal(popout.defaultView.listeners.size, 0);
assert.equal(hidden(popout.bars[0]), false);
leaves.length = 0;

plugin.settings.enableStatusBarAutoHide = false;
controller.apply();
assert.equal(main.listeners.size, 0);
assert.equal(timers.size, 0, 'disabling clears all countdowns');
assert.equal(hidden(main.bars[0]), false, 'disabling restores status bar');
assert.equal(main.bars[0].classes.has('theme-class'), true, 'other styles are preserved');
plugin.settings.enableStatusBarAutoHide = true;
controller.apply();
advance(15000);
assert.equal(hidden(main.bars[0]), true, 'reenabling starts a new initial countdown');
obsidian.Platform.isMobile = true;
controller.apply();
assert.equal(controller.documents.size, 0, 'mobile is unaffected');
assert.equal(hidden(main.bars[0]), false);

obsidian.Platform.isMobile = false;
const late = doc(false);
controller.addDocument(late);
advance(15000);
assert.equal(timers.size, 0, 'wait for a status bar before starting initial countdown');
late.bars.push(bar());
controller.syncBars(controller.documents.get(late));
advance(14999);
assert.equal(hidden(late.bars[0]), false);
advance(1);
assert.equal(hidden(late.bars[0]), true);
controller.dispose();
assert.equal(late.listeners.size, 0);
assert.equal(hidden(late.bars[0]), false, 'unloading restores bars');
assert.equal(timers.size, 0);
console.log('Status-bar initial/reveal timers, edge detection, window lifecycle, and cleanup checks passed.');
