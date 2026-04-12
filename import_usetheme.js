const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// Ensure useTheme is imported
if (!content.includes('useTheme')) {
    content = content.replace(
        /import \{(.*?)\} from '@mui\/material';/s,
        `import {$1, useTheme} from '@mui/material';`
    );
}

fs.writeFileSync(pageFile, content);
console.log("useTheme imported");
