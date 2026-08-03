const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/hooks.ts';
let code = fs.readFileSync(file, 'utf8');

const regexToRemoveBadFocus = /export async function setFocus\([\s\S]*?\n\}\|\s*null\) \{[\s\S]*?\n\}/;
code = code.replace(regexToRemoveBadFocus, `
export async function setFocus(id: number, focus: 'primary' | 'secondary' | null) {
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
`);

fs.writeFileSync(file, code);
