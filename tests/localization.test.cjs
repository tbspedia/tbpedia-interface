const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let hostLanguage = 'fr';
let rows = [];
class Setting {
    constructor() { rows.push(this); }
    setName(value) { this.name = value; return this; }
    setDesc(value) { this.description = value; return this; }
    addToggle(callback) { callback({ setValue() { return this; }, onChange() { return this; } }); return this; }
    addDropdown(callback) {
        this.options = {};
        const row = this;
        callback({
            addOption(key, label) { row.options[key] = label; return this; },
            setValue(value) { row.value = value; return this; },
            onChange(callback) { row.change = callback; return this; }
        });
        return this;
    }
}
const context = {
    require: () => ({ Setting, Plugin: class {}, FuzzySuggestModal: class {}, PluginSettingTab: class { constructor(app) { this.app = app; } } }),
    module: { exports: {} }, window: { localStorage: { getItem: () => hostLanguage } }
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8') + `
module.exports = { TRANSLATIONS, MOBILE_TEXT, NAV_TEXT, STATUS_BAR_TEXT, INTERFACE_LANGUAGES,
    LANGUAGE_SETTINGS, DEFAULT_SETTINGS, getObsidianLocale, ThemePickerSettingTab, ThemePicker };
`, context);
const api = context.module.exports;
assert.equal(Object.keys(api.INTERFACE_LANGUAGES).length, 14);
for (const table of [api.TRANSLATIONS, api.MOBILE_TEXT, api.NAV_TEXT, api.STATUS_BAR_TEXT]) {
    for (const locale of Object.keys(api.INTERFACE_LANGUAGES)) {
        assert.deepEqual(Object.keys(table[locale]).sort(), Object.keys(table.en).sort(), `${locale}: complete translation keys`);
        assert.ok(Object.values(table[locale]).every(value => typeof value === 'string' && value.trim()));
    }
}
const app = {};
const settings = { ...api.DEFAULT_SETTINGS };
api.LANGUAGE_SETTINGS.set(app, settings);
assert.equal(api.getObsidianLocale(app), 'zh-TW', 'Traditional Chinese is the default');
settings.interfaceLanguage = 'auto';
assert.equal(api.getObsidianLocale(app), 'fr');
settings.interfaceLanguage = 'bo';
assert.equal(api.getObsidianLocale(app), 'bo');
settings.interfaceLanguage = 'invalid';
hostLanguage = 'zh_Hant';
assert.equal(api.getObsidianLocale(app), 'zh-TW');
hostLanguage = 'unsupported';
assert.equal(api.getObsidianLocale(app), 'en');
assert.equal(api.getObsidianLocale({}), 'en', 'preferences do not leak across apps');

(async () => {
    let saves = 0, refreshes = 0, navigationRefreshes = 0;
    const plugin = { settings, refreshLocalizedUi() { refreshes++; },
        noteNavigation: { refresh() { navigationRefreshes++; } },
        async saveData(data) { assert.equal(data, settings); saves++; } };
    const tab = new api.ThemePickerSettingTab(app, plugin);
    tab.containerEl = { empty() { rows = []; }, createEl() {} };
    for (const locale of Object.keys(api.INTERFACE_LANGUAGES)) {
        settings.interfaceLanguage = locale;
        tab.display();
        assert.equal(rows[0].name, api.TRANSLATIONS[locale].interfaceLanguage);
        assert.equal(Object.keys(rows[0].options).length, 15);
        assert.equal(rows[0].value, locale);
        assert.equal(rows[1].name, api.TRANSLATIONS[locale].enableChangeTheme);
        assert.equal(rows[4].options.property, api.MOBILE_TEXT[locale][5]);
        assert.ok(!rows[4].options.property.includes('reading-order'), `${locale}: numeric option label is translated`);
    }
    await rows[0].change('ja');
    assert.equal(settings.interfaceLanguage, 'ja');
    assert.equal(rows[0].name, api.TRANSLATIONS.ja.interfaceLanguage, 'settings redraw immediately');
    assert.equal(saves, 1);
    assert.equal(refreshes, 1);
    assert.equal(navigationRefreshes, 1);
    await rows[0].change('auto');
    hostLanguage = 'ko';
    assert.equal(api.getObsidianLocale(app), 'ko');
    console.log('All 14 locales, rendered settings, language switching, persistence, and fallback checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
