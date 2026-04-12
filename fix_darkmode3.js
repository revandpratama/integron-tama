const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// Insert the missing `COLUMNS` in `KanbanContent`
content = content.replace(
    /function KanbanContent\(\{ lang, setLang \}: \{ lang: 'en' \| 'id', setLang: \(l: 'en' \| 'id'\) => void \}\) \{\s*const t = DICT\[lang\];/,
    `function KanbanContent({ lang, setLang }: { lang: 'en' | 'id', setLang: (l: 'en' | 'id') => void }) {
    const t = DICT[lang];
    const { mode } = useColorMode();
    const COLUMNS = useMemo(() => getColumnsBase(lang).map(col => ({ ...col, bg: mode === 'light' ? alpha(col.color, 0.1) : alpha(col.color, 0.15) })), [lang, mode]);`
);


// Check if useColorMode was imported
if (!content.includes('import { useColorMode }')) {
    content = content.replace(
        "from '@dnd-kit/core';",
        "from '@dnd-kit/core';\nimport { useColorMode } from '../providers/ThemeProvider';\nimport { alpha } from '@mui/material';"
    );
}

fs.writeFileSync(pageFile, content);
console.log("COLUMNS injected");
