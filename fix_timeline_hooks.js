const fs = require('fs');
let path = 'artifacts/study-tracker/src/pages/Timeline.hooks.tsx';
let content = fs.readFileSync(path, 'utf8');

const toAdd = `
  const goToSystem = (subjectId: number, systemId: number) => {
    setLocation(\`/subjects/\${subjectId}?highlight=\${systemId}\`);
  };

  const confirmRollback = async () => {
    if (!pendingRollbackId) return;
    await rollbackHistoryEntry(pendingRollbackId);
    setPendingRollbackId(null);
  };
`;

content = content.replace('// ── Render ────────────────────────────────────────────────────────────────', toAdd + '\n  // ── Render ────────────────────────────────────────────────────────────────');

fs.writeFileSync(path, content);
