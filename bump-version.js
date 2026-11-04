// Run before each deploy:
//   node bump-version.js                               fresh ?v= cache-busting stamps only
//   node bump-version.js --site=https://example.com    also make the link-preview urls absolute
//
// 1. Rewrites every ?v=... in index.html to a new build stamp, so browsers load the new files
//    instead of stale cached copies.
// 2. With --site, points og:url / og:image / twitter:image at the real domain. Link-preview crawlers
//    (iMessage, Discord, X, Facebook, Slack) ignore relative image urls, so this is needed once the site
//    has an address. The setting is remembered in index.html, so later runs keep it.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
const d = new Date();
const pad = n => String(n).padStart(2, '0');
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

let html = fs.readFileSync(file, 'utf8');
const n = (html.match(/\?v=[\w.]+/g) || []).length;
html = html.replace(/\?v=[\w.]+/g, `?v=${stamp}`);

const siteArg = process.argv.find(a => a.startsWith('--site='));
if (siteArg) {
  let site = siteArg.slice(7).trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/\s]+/.test(site)) { console.error('--site must look like https://your-domain.com'); process.exit(1); }
  html = html
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${site}/$2`)
    .replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*?og-image\.png(\?v=[\w.]+)?(")/g, `$1${site}/og-image.png?v=${stamp}$3`);
  console.log(`link previews now point at ${site}/`);
}
fs.writeFileSync(file, html);
console.log(`index.html: ${n} asset links now use ?v=${stamp}`);
const og = (html.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || '';
if (!/^https?:\/\//.test(og)) console.log('note: link-preview image url is still relative; add --site=https://your-domain when deploying.');
