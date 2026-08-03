const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/hooks.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /export async function setFocus\([\s\S]*?export async function deleteSystem/g;
code = code.replace(regex, `export async function setFocus(id: number, focus: 'primary' | 'secondary' | null) {
  return await db.transaction('rw', db.uiPreferences, async () => {
    if (focus) {
      const existing = await db.uiPreferences.filter(p => p.focus === focus).toArray();
      for (const p of existing) {
        await updateUIPref(p.type, p.entityId, { focus: null });
      }
    }
    await updateUIPref('system', id, { focus });
  });
}

export async function setSubjectFocus(subjectId: number, focus: 'primary' | 'secondary' | null) {
  return await db.transaction('rw', db.uiPreferences, async () => {
    if (focus) {
      const existing = await db.uiPreferences.filter(p => p.focus === focus).toArray();
      for (const p of existing) {
        await updateUIPref(p.type, p.entityId, { focus: null });
      }
    }
    await updateUIPref('subject', subjectId, { focus });
  });
}

export async function deleteSystem`);

fs.writeFileSync(file, code);
