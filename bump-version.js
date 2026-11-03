// Run before each deploy:  node bump-version.js
// Rewrites every ?v=... in index.html to a fresh build stamp so browsers load the new files
// instead of stale cached copies.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
const d = new Date();
const pad = n => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

const html = fs.readFileSync(file, 'utf8');
const out = html.replace(/\?v=[\w.]+/g, `?v=${stamp}`);
const n = (html.match(/\?v=[\w.]+/g) || []).length;
fs.writeFileSync(file, out);
console.log(`index.html: ${n} asset links now use ?v=${stamp}`);
