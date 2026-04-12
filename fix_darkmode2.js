const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

content = content.replace(
    /function PartnerDetailDialog\(\{\n\s*const theme = useTheme\(\);\n\s*const \{ mode \} = useColorMode\(\);\n\s*partner, onClose, onToggleTask, onUpdate, trafficCommentEntry, setTrafficCommentEntry, addTrafficComment\n\}\: \{/,
    `function PartnerDetailDialog({ partner, onClose, onToggleTask, onUpdate, trafficCommentEntry, setTrafficCommentEntry, addTrafficComment }: {`
);
content = content.replace(
    /const lang = useContext\(LangContext\);\n\s*const t = DICT\[lang\];\n\s*const stage = partner/,
    `const lang = useContext(LangContext);\n    const t = DICT[lang];\n    const theme = useTheme();\n    const { mode } = useColorMode();\n    const stage = partner`
);


content = content.replace(
    /function KanbanColumn\(\{\n\s*const theme = useTheme\(\);\n\s*const \{ mode \} = useColorMode\(\);\n\s*col, partners, onCardClick, toggleTask, onUpdatePartner \}\: \{/,
    `function KanbanColumn({ col, partners, onCardClick, toggleTask, onUpdatePartner }: {`
);
content = content.replace(
    /const lang = useContext\(LangContext\);\n\s*const t = DICT\[lang\];\n\s*const \{ setNodeRef, isOver \} = useDroppable/,
    `const lang = useContext(LangContext);\n    const t = DICT[lang];\n    const theme = useTheme();\n    const { mode } = useColorMode();\n    const { setNodeRef, isOver } = useDroppable`
);


content = content.replace(
    /function KanbanCard\(\{\n\s*const theme = useTheme\(\);\n\s*const \{ mode \} = useColorMode\(\);\n\s*partner, isOverlay, onClick, toggleTask, onUpdatePartner \}\: \{/,
    `function KanbanCard({ partner, isOverlay, onClick, toggleTask, onUpdatePartner }: {`
);
content = content.replace(
    /const lang = useContext\(LangContext\);\n\s*const t = DICT\[lang\];\n\s*const \{ attributes, listeners, setNodeRef, transform, transition, isDragging \} = useSortable/,
    `const lang = useContext(LangContext);\n    const t = DICT[lang];\n    const theme = useTheme();\n    const { mode } = useColorMode();\n    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable`
);

fs.writeFileSync(pageFile, content);
