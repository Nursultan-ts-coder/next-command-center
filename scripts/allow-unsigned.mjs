// Adds this plugin to allow_loading_unsigned_plugins in the local Grafana's grafana.ini, keeping
// any plugin already listed there (such as mcd-oop-app). Usage: npm run grafana:allow-unsigned
// [-- <path to grafana.ini>]. The default is Homebrew's on Apple silicon.
import { readFileSync, writeFileSync } from 'node:fs';

const PLUGIN_ID = 'mcd-nextcommandcenter-app';
const file = process.argv[2] ?? '/opt/homebrew/etc/grafana/grafana.ini';
const lines = readFileSync(file, 'utf8').split('\n');
const setting = /^[\s;#]*allow_loading_unsigned_plugins\s*=(.*)$/;

// The active line wins; otherwise the commented-out one Grafana ships is switched on.
let index = lines.findIndex((line) => /^\s*allow_loading_unsigned_plugins\s*=/.test(line));
if (index === -1) {index = lines.findIndex((line) => setting.test(line));}
if (index === -1) {
  const plugins = lines.findIndex((line) => line.trim() === '[plugins]');
  if (plugins === -1) {throw new Error(`No [plugins] section in ${file}`);}
  lines.splice(plugins + 1, 0, '');
  index = plugins + 1;
}

const active = /^\s*allow_loading_unsigned_plugins\s*=/.test(lines[index]);
const current = active ? lines[index].replace(setting, '$1').split(',').map((id) => id.trim()).filter(Boolean) : [];
const ids = current.includes(PLUGIN_ID) ? current : [...current, PLUGIN_ID];
lines[index] = `allow_loading_unsigned_plugins = ${ids.join(',')}`;
writeFileSync(file, lines.join('\n'));
console.log(`${file}: ${lines[index]}`);
