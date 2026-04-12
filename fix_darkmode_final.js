const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// Fix KanbanColumn
content = content.replace(
    /function KanbanColumn\(\{ col, partners, onCardClick, toggleTask, onUpdatePartner \}: \{([\s\S]*?)\}\) \{([\s\S]*?)const \{ setNodeRef, isOver \} = useDroppable/,
    (match, args, body) => {
        if (!body.includes('useColorMode')) {
           return `function KanbanColumn({ col, partners, onCardClick, toggleTask, onUpdatePartner }: {${args}}) {\n    const { mode } = useColorMode();${body}const { setNodeRef, isOver } = useDroppable`;
        }
        return match;
    }
);

// Fix KanbanColumn Background
content = content.replace(
    /bgcolor: '#f4f4f5'/,
    "bgcolor: mode === 'light' ? '#f4f4f5' : 'rgba(0,0,0,0.4)'"
);
content = content.replace(
    /border: '1px solid #e4e4e7'/,
    "border: '1px solid', borderColor: mode === 'light' ? '#e4e4e7' : 'divider'"
);

// Fix KanbanCard
content = content.replace(
    /function KanbanCard\(\{ partner, isOverlay, onClick, toggleTask, onUpdatePartner \}: \{([\s\S]*?)\}\) \{([\s\S]*?)const \{ attributes, listeners, setNodeRef, transform, transition, isDragging \} = useSortable/,
    (match, args, body) => {
        if (!body.includes('useColorMode')) {
           return `function KanbanCard({ partner, isOverlay, onClick, toggleTask, onUpdatePartner }: {${args}}) {\n    const { mode } = useColorMode();${body}const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable`;
        }
        return match;
    }
);

// Fix KanbanCard colors
content = content.replace(/bgcolor: 'white'/g, "bgcolor: 'background.paper'");
content = content.replace(/color: '#1f2937'/g, "color: 'text.primary'");
content = content.replace(/color: '#374151'/g, "color: 'text.primary'");
content = content.replace(/color: '#4b5563'/g, "color: 'text.secondary'");
content = content.replace(/color: '#6b7280'/g, "color: 'text.secondary'");
content = content.replace(/borderColor: '#e5e7eb'/, "borderColor: 'divider'");
content = content.replace(/border: '1px solid #e5e7eb'/, "border: '1px solid', borderColor: 'divider'");
content = content.replace(/borderTop: '1px dashed #e5e7eb'/, "borderTop: '1px dashed', borderColor: 'divider'");
content = content.replace(/borderTop: '1px solid #f3f4f6'/, "borderTop: '1px solid', borderColor: 'divider'");

// Increase alpha for column accent chips even more if requested
content = content.replace(/alpha\(col.color, 0.25\)/, "alpha(col.color, 0.3)");

fs.writeFileSync(pageFile, content);
console.log("Darkmode contrast final fix applied");
