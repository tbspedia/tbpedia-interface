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
- Bumped plugin version to 1.1.0 in manifest.json (line 4).
