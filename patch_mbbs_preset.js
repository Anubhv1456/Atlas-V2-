const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/lib/mbbs-preset.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `export async function loadMBBSPreset() {
  await db.transaction('rw', db.subjects, db.systems, db.uiPreferences, async () => {
    let subjectOrder = 0;
    for (const item of mbbsHierarchy) {
      const subjectId = await db.subjects.add({ name: item.subject });
      await db.uiPreferences.add({
        id: \`subject:\${subjectId}\`,
        type: 'subject',
        entityId: subjectId,
        order: subjectOrder++,
        focus: null,
        updatedAt: new Date()
      });

      let systemOrder = 0;
      for (const topic of item.topics) {
        const sysId = await db.systems.add({
          subjectId,
          name: topic,
          updatedAt: new Date(),
          nextRevisionDate: null,
          revisionState: 'idle' as const,
          contentInitialized: false,
          contentUnitsTotal: 0,
          contentUnitsCompleted: 0,
          contentCompleted: false,
          completionDate: null,
          revisionCount: 0,
          lastRevisionDate: null,
          currentRevisionInterval: null,
          decayFactor: 1.0,
          isLengthy: false,
          revisionStartedAt: null,
          revisionLastCheckInDate: null,
          revisionDaysLogged: 0,
          revisionProgressPercent: 0
        });
        
        await db.uiPreferences.add({
          id: \`system:\${sysId}\`,
          type: 'system',
          entityId: sysId,
          order: systemOrder++,
          focus: null,
          updatedAt: new Date()
        });
      }
    }
  });
}`;

const replacement = `export async function loadMBBSPreset() {
  await db.transaction('rw', db.subjects, db.systems, db.uiPreferences, async () => {
    const existingSubjects = await db.subjects.toArray();
    const existingSystems = await db.systems.toArray();
    const existingPrefs = await db.uiPreferences.toArray();
    
    let maxSubjectOrder = -1;
    for (const pref of existingPrefs) {
      if (pref.type === 'subject' && pref.order !== undefined && pref.order > maxSubjectOrder) {
        maxSubjectOrder = pref.order;
      }
    }
    
    let subjectOrder = maxSubjectOrder + 1;

    for (const item of mbbsHierarchy) {
      // Find if subject already exists (case-insensitive)
      let subject = existingSubjects.find(s => s.name.toLowerCase().trim() === item.subject.toLowerCase().trim());
      let subjectId = subject?.id;

      if (!subjectId) {
        subjectId = await db.subjects.add({ name: item.subject });
        await db.uiPreferences.add({
          id: \`subject:\${subjectId}\`,
          type: 'subject',
          entityId: subjectId,
          order: subjectOrder++,
          focus: null,
          updatedAt: new Date()
        });
      }

      // Find max system order for this subject
      let maxSystemOrder = -1;
      const systemsInSubject = existingSystems.filter(sys => sys.subjectId === subjectId);
      for (const sys of systemsInSubject) {
        const pref = existingPrefs.find(p => p.id === \`system:\${sys.id}\`);
        if (pref && pref.order !== undefined && pref.order > maxSystemOrder) {
          maxSystemOrder = pref.order;
        }
      }
      
      let systemOrder = maxSystemOrder + 1;

      for (const topic of item.topics) {
        // Find if topic already exists under this subject (case-insensitive)
        const topicExists = existingSystems.find(sys => 
          sys.subjectId === subjectId && 
          sys.name.toLowerCase().trim() === topic.toLowerCase().trim()
        );

        if (!topicExists) {
          const sysId = await db.systems.add({
            subjectId,
            name: topic,
            updatedAt: new Date(),
            nextRevisionDate: null,
            revisionState: 'idle' as const,
            contentInitialized: false,
            contentUnitsTotal: 0,
            contentUnitsCompleted: 0,
            contentCompleted: false,
            completionDate: null,
            revisionCount: 0,
            lastRevisionDate: null,
            currentRevisionInterval: null,
            decayFactor: 1.0,
            isLengthy: false,
            revisionStartedAt: null,
            revisionLastCheckInDate: null,
            revisionDaysLogged: 0,
            revisionProgressPercent: 0
          });
          
          await db.uiPreferences.add({
            id: \`system:\${sysId}\`,
            type: 'system',
            entityId: sysId,
            order: systemOrder++,
            focus: null,
            updatedAt: new Date()
          });
          // Note: Add to existingSystems to prevent duplicates if topics are duplicated in mbbsHierarchy
          // (mbbsHierarchy doesn't have duplicates but it's safe)
        }
      }
    }
  });
}`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Done");
