const fs = require('fs');

const path = 'artifacts/study-tracker/src/pages/SubjectDetail.tsx';
const content = fs.readFileSync(path, 'utf8');

// I will insert import { usePYQSectionLogic, useSubjectDetailLogic } from './SubjectDetail.hooks';
const newContent = content.replace(
  "import { calculateSubjectProgress } from '@/lib/progress';",
  "import { calculateSubjectProgress } from '@/lib/progress';\nimport { usePYQSectionLogic, useSubjectDetailLogic } from './SubjectDetail.hooks';"
);

// Now I will replace the logic in PYQSection
let startPYQ = newContent.indexOf('function PYQSection({ subjectId, subjectName, years }: PYQSectionProps) {');
let endPYQState = newContent.indexOf('const handleResetAll = async () => {');
let replaceStr1 = newContent.substring(startPYQ, endPYQState);

const newPYQState = `function PYQSection({ subjectId, subjectName, years }: PYQSectionProps) {
  const {
    expanded, setExpanded,
    viewMode, setViewMode,
    showAdd, setShowAdd,
    addValue, setAddValue,
    editTarget, setEditTarget,
    editValue, setEditValue,
    pyqToDelete, setPyqToDelete,
    showPYQDeleteConfirm, setShowPYQDeleteConfirm,
    scoreModalPyq, setScoreModalPyq,
    showPresetModal, setShowPresetModal,
    currentYearNum,
    presetEndYear, setPresetEndYear,
    presetSpan, setPresetSpan,
    presetPrefix, setPresetPrefix,
    yearScoreMap,
    completed, total, percentage,
    handleAdd, handleQuickAdd5YearDefaults,
    spanValidation, endYearValidation, handleGenerateCustomRange,
    handleEditSave, handlePYQDeleteClick, handlePYQDeleteConfirm,
    handleToggle, handleMarkAllComplete
  } = usePYQSectionLogic(subjectId, subjectName, years);

  `;
  
let step1Content = newContent.replace(replaceStr1, newPYQState);

// SubjectDetail logic
let startSD = step1Content.indexOf('export default function SubjectDetail() {');
let endSDState = step1Content.indexOf('return (\n    <div className="min-h-full bg-background px-4 pt-10');
let replaceStr2 = step1Content.substring(startSD, endSDState);

const newSDState = `export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    subjectId, subject, systems, pyqYears,
    showAddSystem, setShowAddSystem,
    showDeleteConfirm, setShowDeleteConfirm,
    showEdit, setShowEdit,
    editName, setEditName,
    activeFilter, setActiveFilter,
    highlightId, handleDragEnd,
    totalTasks, completedTasks, progress,
    pyqUnlocked, stagePct, visibleSystems,
    handleDonutClick, handleSaveEdit, handleDelete, handleDeleteConfirm
  } = useSubjectDetailLogic(id);

  if (!subject && id) {
    return <div className="p-8 text-center text-muted-foreground mt-20">Loading or subject not found.</div>;
  }
  if (!subject) return null;

  `;

let step2Content = step1Content.replace(replaceStr2, newSDState);

fs.writeFileSync(path, step2Content);
