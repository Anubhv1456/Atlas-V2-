const fs = require('fs');

const path = 'artifacts/study-tracker/src/pages/Home.tsx';
const content = fs.readFileSync(path, 'utf8');

// The logic of Home is very large. I can just move the massive block of calculation.
let startHome = content.indexOf('export default function Home() {');
let endHomeState = content.indexOf('return (\n    <>');
let replaceStr = content.substring(startHome, endHomeState);

// I will extract the logic into a separate hook
let hookContent = `import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  useSubjects, useAllSystems, addSubject, updateSubject, deleteSubject, 
  useCurrentStreak, setFocus, setSubjectFocus, updateSubjectsOrder, useAllPYQs 
} from '@/db';
import { 
  sortSystemsByRevisionPriority, isRevisionDue, isRevisionOverdue, 
  daysOverdue, calculateDecayScore, isToday, today 
} from '@/db';
import { calculateSubjectProgress } from '@/lib/progress';
import { DropResult } from '@hello-pangea/dnd';

export function useHomeLogic() {
${replaceStr.replace('export default function Home() {', '')}
  return {
    subjects, systems, pyqs,
    streak,
    greeting,
    primaryFocus, primaryFocusSubject, isAutoPrimary, isPrimaryOverriddenByRevision,
    secondaryFocus, secondaryFocusSubject, isAutoSecondary, isSecondaryOverriddenByRevision,
    secondaryDaysOverdue,
    dueRevisions, completedToday,
    insights,
    showAddSubject, setShowAddSubject,
    showSubjectEdit, setShowSubjectEdit,
    subjectEditTarget, setSubjectEditTarget,
    subjectEditName, setSubjectEditName,
    subjectToDelete, setSubjectToDelete,
    showSubjectDeleteConfirm, setShowSubjectDeleteConfirm,
    showFocusMenu, setShowFocusMenu,
    focusDialogType, setFocusDialogType,
    handleAddSubject, handleSaveSubjectEdit,
    handleSubjectDeleteClick, handleSubjectDeleteConfirm,
    handleSetFocus, goToSystem, goToSubject, handleDragEnd
  };
}
`;

fs.writeFileSync('artifacts/study-tracker/src/pages/Home.hooks.tsx', hookContent);

// Modify Home.tsx
const newHomeContent = content.replace(replaceStr, `import { useHomeLogic } from './Home.hooks';

export default function Home() {
  const {
    subjects, systems, pyqs, streak, greeting,
    primaryFocus, primaryFocusSubject, isAutoPrimary, isPrimaryOverriddenByRevision,
    secondaryFocus, secondaryFocusSubject, isAutoSecondary, isSecondaryOverriddenByRevision,
    secondaryDaysOverdue, dueRevisions, completedToday, insights,
    showAddSubject, setShowAddSubject, showSubjectEdit, setShowSubjectEdit,
    subjectEditTarget, setSubjectEditTarget, subjectEditName, setSubjectEditName,
    subjectToDelete, setSubjectToDelete, showSubjectDeleteConfirm, setShowSubjectDeleteConfirm,
    showFocusMenu, setShowFocusMenu, focusDialogType, setFocusDialogType,
    handleAddSubject, handleSaveSubjectEdit, handleSubjectDeleteClick, handleSubjectDeleteConfirm,
    handleSetFocus, goToSystem, goToSubject, handleDragEnd
  } = useHomeLogic();
`);

fs.writeFileSync(path, newHomeContent);
