const fs = require('fs');
const file = 'artifacts/study-tracker/src/db/hooks.ts';
let code = fs.readFileSync(file, 'utf8');

// replace useSubjects
code = code.replace(
  /export function useSubjects\(\) \{[\s\S]*?return \[\.\.\.subjects\]\.sort.*?\n\}/,
  `export function useSubjects() {
  return useLiveQuery(async () => {
    const subjects = await db.subjects.toArray().then(res => res.filter(s => !s.deletedAt));
    const prefs = await db.uiPreferences.where('type').equals('subject').toArray();
    return subjects.map(s => {
      const p = prefs.find(p => p.entityId === s.id);
      return {
        ...s,
        order: p?.order ?? s.id ?? 0,
        focus: p?.focus ?? null
      };
    }).sort((a, b) => (a.order ?? a.id ?? 0) - (b.order ?? b.id ?? 0));
  }) ?? [];
}`
);

// replace useSubject
code = code.replace(
  /export function useSubject\(id: number\) \{[\s\S]*?return useLiveQuery.*?\n\}/,
  `export function useSubject(id: number) {
  return useLiveQuery(async () => {
    const sub = await db.subjects.get(id);
    if (!sub || sub.deletedAt) return undefined;
    const p = await db.uiPreferences.get(\`subject:\${id}\`);
    return {
      ...sub,
      order: p?.order ?? sub.id ?? 0,
      focus: p?.focus ?? null
    };
  }, [id]);
}`
);

// replace useSystemsBySubject
code = code.replace(
  /export function useSystemsBySubject\(subjectId: number\) \{[\s\S]*?return useLiveQuery.*?\n\}/,
  `export function useSystemsBySubject(subjectId: number) {
  return useLiveQuery(async () => {
    const systems = await db.systems.where('subjectId').equals(subjectId).toArray().then(res => res.filter(s => !s.deletedAt));
    const prefs = await db.uiPreferences.where('type').equals('system').toArray();
    return systems.map(s => {
      const p = prefs.find(p => p.entityId === s.id);
      return {
        ...s,
        order: p?.order ?? s.id ?? 0,
        focus: p?.focus ?? null
      };
    });
  }, [subjectId]) ?? [];
}`
);

// replace useAllSystems
code = code.replace(
  /export function useAllSystems\(\) \{[\s\S]*?return useLiveQuery.*?\n\}/,
  `export function useAllSystems() {
  return useLiveQuery(async () => {
    const systems = await db.systems.toArray().then(res => res.filter(s => !s.deletedAt));
    const prefs = await db.uiPreferences.where('type').equals('system').toArray();
    return systems.map(s => {
      const p = prefs.find(p => p.entityId === s.id);
      return {
        ...s,
        order: p?.order ?? s.id ?? 0,
        focus: p?.focus ?? null
      };
    });
  }) ?? [];
}`
);

// replace useSystem
code = code.replace(
  /export function useSystem\(id: number\) \{[\s\S]*?return useLiveQuery.*?\n\}/,
  `export function useSystem(id: number) {
  return useLiveQuery(async () => {
    const sys = await db.systems.get(id);
    if (!sys || sys.deletedAt) return undefined;
    const p = await db.uiPreferences.get(\`system:\${id}\`);
    return {
      ...sys,
      order: p?.order ?? sys.id ?? 0,
      focus: p?.focus ?? null
    };
  }, [id]);
}`
);

fs.writeFileSync(file, code);
