const fs = require('fs');
let text = fs.readFileSync('artifacts/study-tracker/src/pages/SubjectDetail.tsx', 'utf-8');

text = text.replace(
    "const [editValue,   setEditValue]   = useState('');",
    "const [editValue,   setEditValue]   = useState('');\n  const [pyqToDelete, setPyqToDelete] = useState<PYQYear | null>(null);\n  const [showPYQDeleteConfirm, setShowPYQDeleteConfirm] = useState(false);"
);

text = text.replace(
    "const [showAddSystem, setShowAddSystem] = useState(false);",
    "const [showAddSystem, setShowAddSystem] = useState(false);\n  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);"
);

fs.writeFileSync('artifacts/study-tracker/src/pages/SubjectDetail.tsx', text);
