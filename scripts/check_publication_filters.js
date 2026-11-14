#!/usr/bin/env node
// Exercise the actual filters against the built homepage without browser dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(root, '_site/index.html'), 'utf8');
const items = Array.from(html.matchAll(/<div\s+class="publication-item"([^>]*)>/g), match => {
    const attrs = Object.fromEntries(Array.from(match[1].matchAll(/([\w-]+)="([^"]*)"/g), attr => [attr[1], attr[2]]));
    return {
        id: attrs['data-publication-id'], category: attrs['data-category'],
        dataset: { selected: attrs['data-selected'], topics: attrs['data-topics'] },
        style: { display: '', setProperty(key, value) { this[key] = value; } }
    };
});
assert.ok(items.length > 0, 'built homepage must contain publication items');
assert.equal(new Set(items.map(item => item.id)).size, items.length, 'each record renders once');
const groups = Array.from(new Set(items.map(item => item.category)), category => ({
    category, hidden: false, querySelectorAll: () => items.filter(item => item.category === category)
}));
const document = {
    querySelectorAll: selector => selector === '.publication-item' ? items : selector === '.publication-group' ? groups : [],
    getElementById: () => ({ scrollIntoView() {} })
};
const context = { document, console: { log() {} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/index.js'), 'utf8').split('// Project filtering functions')[0], context);
const visible = () => items.filter(item => item.style.display !== 'none').map(item => item.id).sort();
context.filterPublications('all');
assert.equal(visible().length, items.length);
assert.ok(groups.every(group => !group.hidden));
context.filterPublications('selected');
assert.deepEqual(visible(), ['tap_TRO2026', 'waypointGen_CSLSC2026', 'waypointGen_CoRL2026_CompositionalWorkshop'].sort());
assert.ok(groups.filter(group => !group.hidden).every(group => group.category !== 'Peer-reviewed Papers'));
context.filterByTopic('decision_making');
assert.deepEqual(visible(), ['intermittentDeployment']);
assert.deepEqual(groups.filter(group => !group.hidden).map(group => group.category), ['Peer-reviewed Papers']);
context.filterByTopic('unknown-topic');
assert.equal(visible().length, 0);
assert.ok(groups.every(group => group.hidden));
context.filterPublications('all');
assert.equal(visible().length, items.length);
assert.ok(groups.every(group => !group.hidden));
console.log('publication filters: all, selected works, topic, empty groups, and reset passed');
