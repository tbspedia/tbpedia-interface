# tbpedia-interface
Obsidian Interface that customise for Tbpedia
The first interafce is for Theme picker 
The source code are fork from https://github.com/trey-sedate/obsidian-theme-picker , version 1.0.9
Tbpedia customise it as below
Implemented Obsidian-language-aware UI localization for all 13 requested locales.
'ja' | 'en' | 'fr' | 'es' | 'de' | 'nl' | 'sv' | 'ko' | 'zh-TW' | 'zh-CN' | 'vi' | 'id' | 'th'
- Added translations for the theme picker, default “None” entry, command palette command, and light/dark toggle tooltip in main.js (line 7)
- Uses Obsidian’s saved display-language preference, including zh/zh-Hans → zh-CN aliases, with English fallback.
- Controls refresh after Obsidian layout/language updates.
- Version 1.1.1 adds independent Enable Change Theme and Enable Change Mode toggles in the plugin settings. Both are enabled by default, apply immediately, and persist across restarts. Disabling Change Theme also disables its command.
- New settings are translated into English, Traditional Chinese, and Simplified Chinese, with English fallback for other locales.
