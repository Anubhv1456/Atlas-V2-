const fs = require('fs');
const file = './artifacts/study-tracker/src/db/database.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  createdAt: Date;\n  updatedAt: Date;\n}',
  '  createdAt: Date;\n  updatedAt: Date;\n  deletedAt?: Date | null;\n}'
);

content = content.replace(
  '  revisionProgressPercent?: number;\n}',
  '  revisionProgressPercent?: number;\n  deletedAt?: Date | null;\n}'
);

content = content.replace(
  '  completedAt: Date | null;\n  createdAt: Date;\n}',
  '  completedAt: Date | null;\n  createdAt: Date;\n  updatedAt?: Date;\n  deletedAt?: Date | null;\n}'
);

content = content.replace(
  '  percentage: number;\n  timestamp: Date;\n  notes?: string;\n}',
  '  percentage: number;\n  timestamp: Date;\n  notes?: string;\n  updatedAt?: Date;\n  deletedAt?: Date | null;\n}'
);

content = content.replace(
  '  taskLabel: string;\n  completedAt: Date;\n}',
  '  taskLabel: string;\n  completedAt: Date;\n  updatedAt?: Date;\n  deletedAt?: Date | null;\n}'
);

fs.writeFileSync(file, content);
