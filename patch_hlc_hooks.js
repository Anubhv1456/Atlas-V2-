const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/hooks.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('generateHLC')) {
  code = code.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\nimport { generateHLC } from '../lib/hlc';");
}

// Replace occurrences of `updatedAt: new Date()` with `updatedAt: new Date(), hlc: generateHLC()`
// Wait, we need to be careful with `.add({ ... })` if it doesn't have `updatedAt: new Date()`.
// And `.modify({ deletedAt: new Date(), updatedAt: new Date() })` -> `modify({ deletedAt: new Date(), updatedAt: new Date(), hlc: generateHLC() })`

code = code.replace(/updatedAt: new Date\(\)/g, "updatedAt: new Date(), hlc: generateHLC()");

// Let's also check if there are adds without updatedAt: new Date() (there shouldn't be, because I checked the grep output)
// Line 14: await db.uiPreferences.add({... updatedAt: new Date() }) -> Handled.
// Line 157: await db.subjects.add({ ... updatedAt: new Date() }) -> Handled.
// Line 189: await db.systems.add({ ... updatedAt: new Date() }) -> Handled.
// Line 262: await db.history.add({ ... entry, updatedAt: new Date() }) -> Handled.
// Line 353: await db.pyqYears.add({ ... updatedAt: new Date() }) -> Handled.

fs.writeFileSync(file, code);
