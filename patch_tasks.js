const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'app/kanban/page.tsx');
let content = fs.readFileSync(pageFile, 'utf-8');

// The grep said: 717 and 1113
const lines = content.split(/\r?\n/);
let matchCount = 0;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('parseTaskGroup(task)')) {
        lines[i] = lines[i].replace('parseTaskGroup(task)', 'parseTaskGroup(task, lang)');
        matchCount++;
    }
}

if (matchCount > 0) {
    fs.writeFileSync(pageFile, lines.join('\n'));
    console.log(`Replaced ${matchCount} occurrences.`);
} else {
    console.log('No occurrences found.');
}
