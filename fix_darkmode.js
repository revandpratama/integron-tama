const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// Use semantic colors instead of hex

// Backgrounds
content = content.replace(/bgcolor: 'white'/g, "bgcolor: 'background.paper'");
content = content.replace(/bgcolor: '#ffffff'/g, "bgcolor: 'background.paper'");
content = content.replace(/bgcolor: '#f8fafc'/g, "bgcolor: 'background.default'");
content = content.replace(/bgcolor: '#f1f5f9'/g, "bgcolor: 'action.hover'");
content = content.replace(/bgcolor: '#f3f4f6'/g, "bgcolor: 'action.hover'");
content = content.replace(/bgcolor: '#eff6ff'/g, "bgcolor: 'action.hover'"); // using action.hover broadly
content = content.replace(/bgcolor: '#e5e7eb'/g, "bgcolor: 'divider'");
content = content.replace(/bgcolor: '#cbd5e1'/g, "bgcolor: 'action.disabledBackground'");

// Borders
content = content.replace(/border: '1px solid #e5e7eb'/g, "border: '1px solid', borderColor: 'divider'");
content = content.replace(/borderTop: '1px solid #f3f4f6'/g, "borderTop: '1px solid', borderColor: 'divider'");
content = content.replace(/borderTop: '1px dashed #e5e7eb'/g, "borderTop: '1px dashed', borderColor: 'divider'");
content = content.replace(/border: '2px dashed #d4d4d8'/g, "border: '2px dashed', borderColor: 'divider'");

// Colors / Text
content = content.replace(/color: '#111827'/g, "color: 'text.primary'");
content = content.replace(/color: '#1f2937'/g, "color: 'text.primary'");
content = content.replace(/color: '#374151'/g, "color: 'text.primary'");
content = content.replace(/color: '#4b5563'/g, "color: 'text.secondary'");
content = content.replace(/color: '#6b7280'/g, "color: 'text.secondary'");
content = content.replace(/color: '#9ca3af'/g, "color: 'text.disabled'");
content = content.replace(/color: '#334155'/g, "color: 'text.primary'");

// UseColorMode import
if (!content.includes('useColorMode')) {
    content = content.replace(
        "from '@dnd-kit/core';",
        "from '@dnd-kit/core';\nimport { useColorMode } from '../providers/ThemeProvider';\nimport { alpha } from '@mui/material';"
    );
}

// Ensure KanbanContent gets useColorMode
content = content.replace(
    /function KanbanContent\(\{(.*?)\}\} {\n    const t = DICT\[lang\];/,
    `function KanbanContent({$1}} {\n    const t = DICT[lang];\n    const { mode } = useColorMode();\n    const theme = useTheme();`
);

// We need getColumnsBase without static bg
content = content.replace(
    /export const getColumns = \(lang: 'en' \| 'id'\) => \{/,
    `export const getColumnsBase = (lang: 'en' | 'id') => {`
);

content = content.replace(
    /bg: '#[a-f0-9]{6}', /g,
    ``
);

// KanbanContent useMemo
content = content.replace(
    /const COLUMNS = useMemo\(\(\) => getColumns\(lang\)/,
    "const COLUMNS = useMemo(() => getColumnsBase(lang).map(col => ({ ...col, bg: mode === 'light' ? alpha(col.color, 0.1) : alpha(col.color, 0.15) }))"
);

content = content.replace(/getColumns\(lang\)/g, "COLUMNS");

// Fix PartnerDetailDialog and KanbanCard missing alpha/theme
content = content.replace(
    /function PartnerDetailDialog\(.*?\{/,
    `$&
    const theme = useTheme();
    const { mode } = useColorMode();`
);

content = content.replace(
    /function KanbanCard\(.*?\{/,
    `$&
    const theme = useTheme();
    const { mode } = useColorMode();`
);

content = content.replace(
    /function KanbanColumn\(.*?\{/,
    `$&
    const theme = useTheme();
    const { mode } = useColorMode();`
);

fs.writeFileSync(pageFile, content);
console.log("Darkmode patch applied");
