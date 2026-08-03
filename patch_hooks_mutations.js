const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/hooks.ts';
let code = fs.readFileSync(file, 'utf8');

const helpers = `
async function updateUIPref(type, entityId, updates) {
  const prefId = \`\${type}:\${entityId}\`;
  const existing = await db.uiPreferences.get(prefId);
  if (existing) {
    await db.uiPreferences.update(prefId, { ...updates, updatedAt: new Date() });
  } else {
    await db.uiPreferences.add({
      id: prefId,
      type,
      entityId,
      ...updates,
      updatedAt: new Date()
    });
  }
}
`;

code = code.replace("import { format } from 'date-fns';", "import { format } from 'date-fns';\n" + helpers);

// addSubject
code = code.replace(
  /export async function addSubject\(name: string\) \{[\s\S]*?return await db\.subjects\.add.*?\n\}/,
  `export async function addSubject(name: string) {
  const existingSubjects = await db.uiPreferences.where('type').equals('subject').toArray();
  const maxOrder = existingSubjects.reduce((max, sub) => Math.max(max, sub.order ?? 0), -1);
  const id = await db.subjects.add({
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await updateUIPref('subject', id, { order: maxOrder + 1, focus: null });
  return id;
}`
);

// updateSubjectsOrder
code = code.replace(
  /export async function updateSubjectsOrder[\s\S]*?\}\);\n\}/,
  `export async function updateSubjectsOrder(updates: { id: number; order: number }[]) {
  return await db.transaction('rw', db.uiPreferences, async () => {
    for (const update of updates) {
      await updateUIPref('subject', update.id, { order: update.order });
    }
  });
}`
);

// addSystem
code = code.replace(
  /export async function addSystem[\s\S]*?nextRevisionDate: null,\n  \}\);\n\}/,
  `export async function addSystem(subjectId: number, name: string) {
  const existingPrefs = await db.uiPreferences.where('type').equals('system').toArray();
  const maxOrder = existingPrefs.reduce((max, sys) => Math.max(max, sys.order ?? 0), -1);
  const id = await db.systems.add({
    subjectId,
    name,
    contentInitialized: false,
    contentUnitsTotal: 0,
    contentUnitsCompleted: 0,
    contentCompleted: false,
    qbankDone: false,
    weakAreas: '',
    status: 'Average',
    updatedAt: new Date(),
    completionDate: null,
    revisionCount: 0,
    lastRevisionDate: null,
    currentRevisionInterval: null,
    nextRevisionDate: null,
  });
  await updateUIPref('system', id, { order: maxOrder + 1, focus: null });
  return id;
}`
);

// updateSystemsOrder
code = code.replace(
  /export async function updateSystemsOrder[\s\S]*?\}\);\n\}/,
  `export async function updateSystemsOrder(updates: { id: number; order: number }[]) {
  return await db.transaction('rw', db.uiPreferences, async () => {
    for (const update of updates) {
      await updateUIPref('system', update.id, { order: update.order });
    }
  });
}`
);

// updateSystem
code = code.replace(
  /export async function updateSystem\(id: number, changes: Partial<StudySystem>\) \{[\s\S]*?return await db\.systems\.update\(id, \{ \.\.\.changes, updatedAt: new Date\(\) \}\);\n\}/,
  `export async function updateSystem(id: number, changes: Partial<StudySystem>) {
  if ('focus' in changes || 'order' in changes) {
    const prefUpdates: any = {};
    if ('focus' in changes) { prefUpdates.focus = changes.focus; delete changes.focus; }
    if ('order' in changes) { prefUpdates.order = changes.order; delete changes.order; }
    await updateUIPref('system', id, prefUpdates);
  }
  return await db.systems.update(id, { ...changes, updatedAt: new Date() });
}`
);

// setFocus
code = code.replace(
  /export async function setFocus\(id: number, focus: 'primary' | 'secondary' | null\) \{[\s\S]*?return await db\.transaction\('rw', db\.subjects, db\.systems.*?await db\.systems\.update\(id, \{ focus, updatedAt: new Date\(\) \}\);\n  \}\);\n\}/,
  `export async function setFocus(id: number, focus: 'primary' | 'secondary' | null) {
  return await db.transaction('rw', db.uiPreferences, async () => {
    if (focus) {
      const existing = await db.uiPreferences.filter(p => p.focus === focus).toArray();
      for (const p of existing) {
        await updateUIPref(p.type, p.entityId, { focus: null });
      }
    }
    await updateUIPref('system', id, { focus });
  });
}`
);

// setSubjectFocus
code = code.replace(
  /export async function setSubjectFocus\(subjectId: number, focus: 'primary' | 'secondary' | null\) \{[\s\S]*?return await db\.transaction\('rw', db\.subjects, db\.systems.*?await db\.subjects\.update\(subjectId, \{ focus, updatedAt: new Date\(\) \}\);\n  \}\);\n\}/,
  `export async function setSubjectFocus(subjectId: number, focus: 'primary' | 'secondary' | null) {
  return await db.transaction('rw', db.uiPreferences, async () => {
    if (focus) {
      const existing = await db.uiPreferences.filter(p => p.focus === focus).toArray();
      for (const p of existing) {
        await updateUIPref(p.type, p.entityId, { focus: null });
      }
    }
    await updateUIPref('subject', subjectId, { focus });
  });
}`
);

fs.writeFileSync(file, code);
