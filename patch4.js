const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// Fix KanbanColumn
content = content.replace(
    /function KanbanColumn\(\{\n\s*const lang = useContext\(LangContext\);\n\s*const t = DICT\[lang\]; col, partners, onCardClick, toggleTask, onUpdatePartner \}: \{/,
    `function KanbanColumn({ col, partners, onCardClick, toggleTask, onUpdatePartner }: {`
);
content = content.replace(
    /const \{ setNodeRef, isOver \} = useDroppable\(\{ id: col\.id \}\);/,
    `const lang = useContext(LangContext);\n    const t = DICT[lang];\n    const { setNodeRef, isOver } = useDroppable({ id: col.id });`
);

// Fix KanbanCard
content = content.replace(
    /function KanbanCard\(\{\n\s*const lang = useContext\(LangContext\);\n\s*const t = DICT\[lang\]; partner, isOverlay, onClick, toggleTask, onUpdatePartner \}: \{/,
    `function KanbanCard({ partner, isOverlay, onClick, toggleTask, onUpdatePartner }: {`
);
content = content.replace(
    /const \{ attributes, listeners, setNodeRef, transform, transition, isDragging \} = useSortable\(\{ id: partner\.id, data: partner \}\);/,
    `const lang = useContext(LangContext);\n    const t = DICT[lang];\n    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: partner.id, data: partner });`
);

// In KanbanColumn, the type of col might still be typeof COLUMNS_BASE[0] but it was replaced by map.
// Let's replace any `typeof COLUMNS_BASE[0]` with `any` since it's breaking. Or just leave it if it wasn't replaced.
// Wait, my view_file output showed: `col: typeof COLUMNS[0];`
// So my script really replaced it. Let's change `typeof COLUMNS[0];` to `any;`
content = content.replace(/col: typeof COLUMNS\[0\];/g, 'col: any;');

// Also `DICT` is not exported properly? Wait, it was `export const DICT = {`
// Let's check where it says `Cannot find name 'DICT'`.
// Ah! If `DICT` is defined before `LangContext`, but `KanbanColumn` is defined at the BOTTOM of `app/kanban/page.tsx`, `DICT` is visible.
// So why did the linter complain: `Cannot find name 'DICT'` at line 806?
// Because line 805 `const t = DICT[lang];` was inside the arguments of `function KanbanColumn({ ... }`! Which is syntactically invalid!

fs.writeFileSync(pageFile, content);
console.log("Fixed args");
