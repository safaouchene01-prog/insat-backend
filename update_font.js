const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'frontend/src/index.css');

let css = fs.readFileSync(file, 'utf8');
css = css.replace(/font-family:\s*'Poppins',\s*sans-serif;/g, 'font-family: var(--font-main);');
fs.writeFileSync(file, css);
console.log('Fonts updated in index.css');
