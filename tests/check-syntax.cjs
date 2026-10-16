'use strict';
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const root = resolve(__dirname, '..');
const files = ['service-worker.js', ...readdirSync(resolve(root, 'js')).filter(name => name.endsWith('.js')).map(name => 'js/' + name), ...readdirSync(__dirname).filter(name => name.endsWith('.cjs')).map(name => 'tests/' + name)];
for (const file of files) execFileSync(process.execPath, ['--check', resolve(root, file)], { stdio: 'inherit' });
console.log(`Syntax OK: ${files.length} JavaScript files`);
