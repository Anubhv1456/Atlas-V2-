const fs = require('fs');
const file = '/app/applet/artifacts/study-tracker/src/features/dashboard/SubjectsGrid.tsx';
let content = fs.readFileSync(file, 'utf8');

// import the preset loader
content = content.replace("import { SubjectCard } from '@/features/subjects/SubjectCard';", "import { SubjectCard } from '@/features/subjects/SubjectCard';\nimport { loadMBBSPreset } from '@/lib/mbbs-preset';\nimport { useState } from 'react';");

// find action={...}
const target = `action={
              <Button onClick={() => setShowAddSubject(true)} size="sm" className="gap-1.5 rounded-xl shadow-xs">
                <Plus className="w-4 h-4" /> Add First Subject
              </Button>
            }`;

const replacement = `action={
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Button onClick={() => setShowAddSubject(true)} size="sm" className="gap-1.5 rounded-xl shadow-xs">
                  <Plus className="w-4 h-4" /> Add First Subject
                </Button>
                <Button 
                  onClick={async () => {
                    await loadMBBSPreset();
                    window.location.reload();
                  }} 
                  variant="outline"
                  size="sm" 
                  className="gap-1.5 rounded-xl shadow-xs"
                >
                  <BookOpen className="w-4 h-4" /> Load MBBS Preset
                </Button>
              </div>
            }`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Done");
