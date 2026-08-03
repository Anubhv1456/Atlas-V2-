const fs = require('fs');
let path = 'artifacts/study-tracker/src/pages/Home.hooks.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `    showAddSubject, setShowAddSubject,
    showSubjectEdit, setShowSubjectEdit,
    subjectEditTarget, setSubjectEditTarget,
    subjectEditName, setSubjectEditName,
    subjectToDelete, setSubjectToDelete,
    showSubjectDeleteConfirm, setShowSubjectDeleteConfirm,
    showFocusMenu, setShowFocusMenu,
    focusDialogType, setFocusDialogType,
    handleAddSubject, handleSaveSubjectEdit,
    handleSubjectDeleteClick, handleSubjectDeleteConfirm,
    handleSetFocus, goToSystem, goToSubject, handleDragEnd`,
  `    showAddSubject, setShowAddSubject,
    subjectToRename, setSubjectToRename,
    renameSubjectName, setRenameSubjectName,
    subjectToDelete, setSubjectToDelete,
    focusDialogType, setFocusDialogType,
    handleRenameSubjectSave, handleDeleteSubjectConfirm,
    handleSetFocus, goToSystem, goToSubject, handleSubjectDragEnd`
);

fs.writeFileSync(path, content);
