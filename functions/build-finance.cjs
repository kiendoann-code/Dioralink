'use strict';
const fs = require('node:fs');
const path = require('node:path');
const archiver = require('archiver');
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, '.neon-finance');
fs.mkdirSync(outputDir, {recursive: true});
const out = fs.createWriteStream(path.join(outputDir, 'function.zip'));
const zip = archiver('zip', {zlib: {level: 9}});
zip.on('error', error => {throw error;});
zip.pipe(out);
zip.append(fs.readFileSync(path.join(__dirname, 'finance.mjs'), 'utf8').replaceAll("'../finance-report.js'", "'./finance-report.js'").replaceAll("'../Public/admin-finance-demo.js'", "'./Public/admin-finance-demo.js'"), {name: 'index.mjs'});
zip.append('{"type":"commonjs"}', {name: 'package.json'});
for (const file of ['finance-report.js', 'demo-orders.js', 'demo/orders-20261023-27.json', 'Public/admin-finance-demo.js']) zip.file(path.join(root, file), {name: file});
const visited = new Set();
function include(name, from = root) {
  let location;
  try {location = require.resolve(name + '/package.json', {paths: [from]});}
  catch {
    try {
      let dir = path.dirname(require.resolve(name, {paths: [from]}));
      while (dir !== path.dirname(dir)) {
        const candidate = path.join(dir, 'package.json');
        if (fs.existsSync(candidate) && JSON.parse(fs.readFileSync(candidate, 'utf8')).name === name) {location = candidate; break;}
        dir = path.dirname(dir);
      }
    } catch {return;}
  }
  if (!location || visited.has(location)) return;
  visited.add(location);
  const dir = path.dirname(location), pkg = JSON.parse(fs.readFileSync(location, 'utf8'));
  const relative = path.relative(root, dir);
  if (!relative.startsWith('node_modules' + path.sep)) throw Error('Dependency is outside project: ' + name);
  zip.directory(dir, relative.replaceAll(path.sep, '/'));
  for (const dependency of Object.keys({...pkg.dependencies, ...pkg.optionalDependencies})) include(dependency, dir);
}
include('pg');
include('bcryptjs');
out.on('close', () => console.log(JSON.stringify({archive: '.neon-finance/function.zip', bytes: zip.pointer(), packages: visited.size})));
zip.finalize();
