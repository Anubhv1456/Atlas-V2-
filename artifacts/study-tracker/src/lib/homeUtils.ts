import { ReactNode } from 'react';
import { Subject, StudySystem, PYQYear } from '@/db';
import { isRevisionDue, isRevisionDueToday, daysOverdue, calculateDecayScore, sortSystemsByRevisionPriority } from '@/db';
import React from 'react';
import { BookOpen, AlertCircle, Target, Activity, Sparkles, Flame } from 'lucide-react';

export function determineFocusSystems(
  subjects: Subject[],
  systems: StudySystem[],
  now: Date
) {
  const customPrimarySubject = subjects.find(s => s.focus === 'primary');
  const customPrimarySystem = systems.find(s => s.focus === 'primary');
  const customSecondarySubject = subjects.find(s => s.focus === 'secondary');
  const customSecondarySystem = systems.find(s => s.focus === 'secondary');

  const subjectIndexMap = new Map<number, number>();
  subjects.forEach((sub, idx) => {
    if (sub.id !== undefined) subjectIndexMap.set(sub.id, idx);
  });

  const sortSystemsByPriority = (a: StudySystem, b: StudySystem) => {
    const subIdxA = subjectIndexMap.get(a.subjectId) ?? Number.MAX_VALUE;
    const subIdxB = subjectIndexMap.get(b.subjectId) ?? Number.MAX_VALUE;
    if (subIdxA !== subIdxB) return subIdxA - subIdxB;
    return (a.order ?? Number.MAX_VALUE) - (b.order ?? Number.MAX_VALUE);
  };

  const sortedSystemsByPriority = [...systems].sort(sortSystemsByPriority);
  const incompleteSystems = sortedSystemsByPriority.filter(s => !(s.contentCompleted && s.qbankDone));

  let primaryFocus: StudySystem | undefined = undefined;
  let primaryFocusSubject: Subject | undefined = undefined;
  let isAutoPrimary = false;
  let isPrimaryOverriddenByRevision = false;

  if (customPrimarySubject) {
    primaryFocusSubject = customPrimarySubject;
    const subSystems = sortedSystemsByPriority.filter(s => s.subjectId === customPrimarySubject.id);
    const subIncomplete = subSystems.filter(s => !(s.contentCompleted && s.qbankDone));
    primaryFocus = subIncomplete[0] || subSystems[0];
  } else if (customPrimarySystem) {
    primaryFocus = customPrimarySystem;
    primaryFocusSubject = subjects.find(s => s.id === customPrimarySystem.subjectId);
  } else if (incompleteSystems.length > 0) {
    primaryFocus = incompleteSystems[0];
    primaryFocusSubject = subjects.find(s => s.id === primaryFocus!.subjectId);
    isAutoPrimary = true;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const unsortedDueRevisions = systems.filter(s => isRevisionDue(s) && s.id !== primaryFocus?.id);
  const dueRevisions = sortSystemsByRevisionPriority(unsortedDueRevisions, now);

  let secondaryFocus: StudySystem | undefined = undefined;
  let secondaryFocusSubject: Subject | undefined = undefined;
  let isSecondaryOverriddenByRevision = false;
  let isAutoSecondary = false;

  const activeMultiDaySystem = systems.find(s => s.revisionState === 'in_progress');

  if (activeMultiDaySystem) {
    secondaryFocus = activeMultiDaySystem;
    secondaryFocusSubject = subjects.find(s => s.id === activeMultiDaySystem.subjectId);
    isSecondaryOverriddenByRevision = true;
  } else if (dueRevisions.length > 0) {
    secondaryFocus = dueRevisions[0];
    secondaryFocusSubject = subjects.find(s => s.id === secondaryFocus!.subjectId);
    isSecondaryOverriddenByRevision = true;
    isAutoSecondary = true;
  } else if (customSecondarySubject) {
    secondaryFocusSubject = customSecondarySubject;
    const subSystems = sortedSystemsByPriority.filter(s => s.subjectId === customSecondarySubject.id);
    const subIncomplete = subSystems.filter(s => !(s.contentCompleted && s.qbankDone));
    secondaryFocus = subIncomplete[0] || subSystems[0];
  } else if (customSecondarySystem) {
    secondaryFocus = customSecondarySystem;
    secondaryFocusSubject = subjects.find(s => s.id === customSecondarySystem.subjectId);
  } else {
    const remainingIncomplete = incompleteSystems.filter(s => s.id !== primaryFocus?.id);
    if (remainingIncomplete.length > 0) {
      secondaryFocus = remainingIncomplete[0];
      secondaryFocusSubject = subjects.find(s => s.id === secondaryFocus!.subjectId);
      isAutoSecondary = true;
    }
  }

  let secondaryDaysOverdue = 0;
  if (isSecondaryOverriddenByRevision && secondaryFocus?.nextRevisionDate) {
    const revDate = new Date(secondaryFocus.nextRevisionDate);
    if (revDate < todayStart) {
      const diffTime = todayStart.getTime() - new Date(revDate.getFullYear(), revDate.getMonth(), revDate.getDate()).getTime();
      secondaryDaysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
  }

  return {
    customPrimarySubject,
    customPrimarySystem,
    customSecondarySubject,
    customSecondarySystem,
    primaryFocus,
    primaryFocusSubject,
    isAutoPrimary,
    isPrimaryOverriddenByRevision,
    secondaryFocus,
    secondaryFocusSubject,
    isAutoSecondary,
    isSecondaryOverriddenByRevision,
    dueRevisions,
    secondaryDaysOverdue
  };
}
