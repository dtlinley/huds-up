'use strict';

const fs = require('fs');
const path = require('path');

function copyTemplates() {
  const pluginName = process.argv[2];
  const camelCasePlugin = pluginName
    .replace(/(\-[a-z])/g, ($1) => $1.replace('-', '').toUpperCase());

  const inFile = path.join(__dirname, 'template-plugin.js');
  const outFile = path.join(__dirname, '..', 'plugins', `${pluginName}.js`);
  const template = fs.readFileSync(inFile, { encoding: 'utf8' });
  const replaced = template
    .replace(/template-plugin/g, pluginName)
    .replace(/templatePlugin/g, camelCasePlugin);
  fs.writeFileSync(outFile, replaced);

  const inTest = path.join(__dirname, 'template-plugin-test.js');
  const outTest = path.join(__dirname, '..', 'test', 'plugins', `${pluginName}.js`);
  const testTemplate = fs.readFileSync(inTest, { encoding: 'utf8' });
  const testReplaced = testTemplate
    .replace(/template-plugin/g, pluginName)
    .replace(/templatePlugin/g, camelCasePlugin);
  fs.writeFileSync(outTest, testReplaced);
}

copyTemplates();
