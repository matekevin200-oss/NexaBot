const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const order = fs.readFileSync(path.join(root, 'module-order.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
if (!order.length || new Set(order).size !== order.length) throw new Error('Invalid module-order.txt');
const header = fs.readFileSync(path.join(root, 'bundle-header.txt'), 'utf8');
const footer = fs.readFileSync(path.join(root, 'bundle-footer.txt'), 'utf8');
const factories = order.map((name) => {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) throw new Error('Missing source module: ' + name);
  const body = fs.readFileSync(file, 'utf8').replace(/\n+$/, '');
  return '"' + name + '": function(module, exports, require) {\n' + body + '\n\n}';
});
fs.writeFileSync(path.join(root, 'index.js'), header + factories.join(',\n') + footer);
