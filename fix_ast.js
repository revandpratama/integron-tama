const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// Fix PartnerDetailDialog
content = content.replace(
    /function PartnerDetailDialog\(\{\s*const theme = useTheme\(\);\s*const \{ mode \} = useColorMode\(\);\s*partner, onClose, onToggleTask, onUpdate, trafficCommentEntry, setTrafficCommentEntry, addTrafficComment\s*\}: \{/,
    `function PartnerDetailDialog({ partner, onClose, onToggleTask, onUpdate, trafficCommentEntry, setTrafficCommentEntry, addTrafficComment }: {`
);

// Fix KanbanColumn
content = content.replace(
    /function KanbanColumn\(\{\s*const theme = useTheme\(\);\s*const \{ mode \} = useColorMode\(\);\s*col, partners, onCardClick, toggleTask, onUpdatePartner\s*\}: \{/,
    `function KanbanColumn({ col, partners, onCardClick, toggleTask, onUpdatePartner }: {`
);

// Fix KanbanCard
content = content.replace(
    /function KanbanCard\(\{\s*const theme = useTheme\(\);\s*const \{ mode \} = useColorMode\(\);\s*partner, isOverlay, onClick, toggleTask, onUpdatePartner\s*\}: \{/,
    `function KanbanCard({ partner, isOverlay, onClick, toggleTask, onUpdatePartner }: {`
);

fs.writeFileSync(pageFile, content);
console.log("AST fixed");
