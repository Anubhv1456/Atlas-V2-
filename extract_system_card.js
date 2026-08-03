const fs = require('fs');
const path = 'artifacts/study-tracker/src/components/SystemCard.tsx';
const content = fs.readFileSync(path, 'utf8');

// The logic of SystemCard is before `const statusColors: Record<SystemStatus, string> = {`
let startSC = content.indexOf('export function SystemCard({');
let endSCState = content.indexOf('const statusColors: Record<SystemStatus, string> = {');
let replaceStr = content.substring(startSC, endSCState);

// I will extract the logic into a separate hook
let hookContent = `import React, { useState, useRef, useEffect } from 'react';
import { 
  StudySystem, SystemStatus, 
  updateSystem, deleteSystem, logCompletion, db, deleteHistoryEntry, 
  recordInitialEvaluation, completeRevision 
} from '@/db';
import { calculateSystemProgress } from '@/lib/progress';
import { isRevisionDue, isRevisionOverdue, daysOverdue } from '@/db';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

export interface SystemCardProps {
  system: StudySystem;
  subjectName: string;
  defaultExpanded?: boolean;
  highlighted?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function useSystemCardLogic({
  system,
  subjectName,
  defaultExpanded = false,
  highlighted = false,
}: SystemCardProps) {
${replaceStr.replace(/export function SystemCard[^)]+\)[^{]+{/, '')}
  return {
    expanded, setExpanded,
    showInitDialog, setShowInitDialog, initValue, setInitValue,
    showEditContent, setShowEditContent, editCompleted, setEditCompleted, editTotal, setEditTotal,
    showEvalDialog, setShowEvalDialog, showDeleteConfirm, setShowDeleteConfirm,
    showScoreModal, setShowScoreModal, showDecayCalibration, setShowDecayCalibration,
    showRenameDialog, setShowRenameDialog, renameValue, setRenameValue,
    cardRef, progress, completedCount, contentPct,
    revisionDue, revisionOverdue, overdueDays,
    handleContentTap, handleContentPointerDown, handleContentPointerUp, handleContentPointerLeave,
    handleInitSave, handleEditSave, handleEditReset, toggleQBank, handleEvalSelect,
    handleStatusChange, handleNotesChange, handleDelete, handleDeleteConfirm,
    handleRenameSave, handleRevisionComplete
  };
}
`;

fs.writeFileSync('artifacts/study-tracker/src/components/SystemCard.hooks.tsx', hookContent);

const newContent = content.replace(replaceStr, `import { useSystemCardLogic } from './SystemCard.hooks';

export function SystemCard(props: SystemCardProps) {
  const { system, subjectName, dragHandleProps, highlighted } = props;
  const {
    expanded, setExpanded,
    showInitDialog, setShowInitDialog, initValue, setInitValue,
    showEditContent, setShowEditContent, editCompleted, setEditCompleted, editTotal, setEditTotal,
    showEvalDialog, setShowEvalDialog, showDeleteConfirm, setShowDeleteConfirm,
    showScoreModal, setShowScoreModal, showDecayCalibration, setShowDecayCalibration,
    showRenameDialog, setShowRenameDialog, renameValue, setRenameValue,
    cardRef, progress, completedCount, contentPct,
    revisionDue, revisionOverdue, overdueDays,
    handleContentTap, handleContentPointerDown, handleContentPointerUp, handleContentPointerLeave,
    handleInitSave, handleEditSave, handleEditReset, toggleQBank, handleEvalSelect,
    handleStatusChange, handleNotesChange, handleDelete, handleDeleteConfirm,
    handleRenameSave, handleRevisionComplete
  } = useSystemCardLogic(props);

  `);

fs.writeFileSync(path, newContent);
