import React from 'react';
import { Target, BookOpen, Clock, Pencil, X, Plus } from 'lucide-react';
import { StudySystem, Subject } from '@/db';
import { DailyAnkiCard } from '@/components/DailyAnkiCard';

interface ActiveRevisionsProps {
  primaryFocus: StudySystem | null;
  primaryFocusSubject: Subject | null;
  isAutoPrimary: boolean;
  isPrimaryOverriddenByRevision: boolean;
  secondaryFocus: StudySystem | null;
  secondaryFocusSubject: Subject | null;
  isAutoSecondary: boolean;
  isSecondaryOverriddenByRevision: boolean;
  secondaryDaysOverdue: number;
  setFocusDialogType: (type: 'primary' | 'secondary' | null) => void;
  setFocus: (sysId: number, type: 'primary' | 'secondary' | null) => void;
  setSubjectFocus: (subId: number, type: 'primary' | 'secondary' | null) => void;
  goToSystem: (subjectId: number, systemId: number) => void;
  subjects: Subject[];
  systems: StudySystem[];
  customPrimarySubject: Subject | undefined;
  customPrimarySystem: StudySystem | undefined;
  customSecondarySubject: Subject | undefined;
  customSecondarySystem: StudySystem | undefined;
}

export function ActiveRevisions({
  primaryFocus,
  primaryFocusSubject,
  isAutoPrimary,
  isPrimaryOverriddenByRevision,
  secondaryFocus,
  secondaryFocusSubject,
  isAutoSecondary,
  isSecondaryOverriddenByRevision,
  secondaryDaysOverdue,
  setFocusDialogType,
  setFocus,
  setSubjectFocus,
  goToSystem,
  subjects,
  systems,
  customPrimarySubject,
  customPrimarySystem,
  customSecondarySubject,
  customSecondarySystem
}: ActiveRevisionsProps) {
  return (
    <>
      {/* ── Focus for Today ───────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" /> Today's Primary Focus
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Primary Focus */}
          <div className="bg-card rounded-2xl border border-primary/20 shadow-sm overflow-hidden relative flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2 gap-1">
                <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5 truncate">
                  {customPrimarySubject ? (
                    <><BookOpen className="w-3 h-3 shrink-0" /> {customPrimarySubject.name}</>
                  ) : isAutoPrimary ? (
                    <><Target className="w-3 h-3 shrink-0" /> Recommended Focus</>
                  ) : (
                    "Primary Focus"
                  )}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  {customPrimarySubject ? (
                    <>
                      <button
                        onClick={() => setFocusDialogType('primary')}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted/50"
                        title="Edit primary focus"
                        aria-label="Edit primary focus"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSubjectFocus(customPrimarySubject.id!, null)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted/50"
                        title="Remove custom primary focus"
                        aria-label="Remove custom primary focus"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : customPrimarySystem ? (
                    <>
                      <button
                        onClick={() => setFocusDialogType('primary')}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted/50"
                        title="Edit primary focus"
                        aria-label="Edit primary focus"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setFocus(customPrimarySystem.id!, null)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted/50"
                        title="Remove custom primary focus"
                        aria-label="Remove custom primary focus"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setFocusDialogType('primary')}
                      className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-muted/50"
                      title="Customize primary focus"
                      aria-label="Customize primary focus"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {primaryFocus ? (
                <button onClick={() => goToSystem(primaryFocus.subjectId, primaryFocus.id!)} className="text-left group w-full">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug">
                    {primaryFocus.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {customPrimarySubject ? `Subject: ${customPrimarySubject.name}` : subjects.find(s => s.id === primaryFocus.subjectId)?.name}
                  </p>
                </button>
              ) : (
                <button
                  onClick={() => setFocusDialogType('primary')}
                  className="w-full py-3 mt-1 border border-dashed border-primary/30 rounded-xl text-xs text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-3 h-3" /> Select Focus
                </button>
              )}
            </div>
          </div>

          {/* Secondary Focus */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden relative flex flex-col justify-between">
            {secondaryFocus?.revisionState === 'in_progress' && (
              <div className="absolute top-0 left-0 w-full h-1 bg-sky-500/40" />
            )}
            {isSecondaryOverriddenByRevision && (
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/40" />
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2 gap-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 truncate">
                  {secondaryFocus?.revisionState === 'in_progress' ? (
                    <><Clock className="w-3 h-3 shrink-0" /> Active Multi-Day Revision</>
                  ) : isSecondaryOverriddenByRevision ? (
                    <><Clock className="w-3 h-3 shrink-0" /> Secondary Focus</>
                  ) : customSecondarySubject ? (
                    <><BookOpen className="w-3 h-3 shrink-0" /> {customSecondarySubject.name}</>
                  ) : (
                    <><Target className="w-3 h-3 shrink-0" /> Secondary Focus</>
                  )}
                </p>

                <div className="flex items-center gap-1 shrink-0">
                  {/* When customization is suspended due to revision, edit controls are hidden */}
                  {!isSecondaryOverriddenByRevision && (
                    customSecondarySubject ? (
                      <>
                        <button
                          onClick={() => setFocusDialogType('secondary')}
                          className="text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-1 rounded-md hover:bg-muted/50"
                          title="Edit secondary focus"
                          aria-label="Edit secondary focus"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSubjectFocus(customSecondarySubject.id!, null)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted/50"
                          title="Remove custom secondary focus"
                          aria-label="Remove custom secondary focus"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : customSecondarySystem ? (
                      <>
                        <button
                          onClick={() => setFocusDialogType('secondary')}
                          className="text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-1 rounded-md hover:bg-muted/50"
                          title="Edit secondary focus"
                          aria-label="Edit secondary focus"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setFocus(customSecondarySystem.id!, null)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted/50"
                          title="Remove custom secondary focus"
                          aria-label="Remove custom secondary focus"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setFocusDialogType('secondary')}
                        className="text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors p-1 rounded-md hover:bg-muted/50"
                        title="Customize secondary focus"
                        aria-label="Customize secondary focus"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {secondaryFocus ? (
                <button onClick={() => goToSystem(secondaryFocus.subjectId, secondaryFocus.id!)} className="text-left group w-full">
                  <div className="flex items-start justify-between gap-1">
                    <p className="font-medium text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 text-sm leading-snug">
                      {secondaryFocus.name}
                    </p>
                    {secondaryFocus.revisionState === 'in_progress' ? (
                      <span className="shrink-0 text-[9px] bg-sky-500/15 text-sky-700 dark:text-sky-400 px-1.5 py-0.5 rounded-md font-semibold border border-sky-500/30">
                        Day {secondaryFocus.revisionDaysLogged || 1} • {secondaryFocus.revisionProgressPercent || 0}%
                      </span>
                    ) : isSecondaryOverriddenByRevision ? (
                      <span className="shrink-0 text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-semibold border border-amber-500/20">
                        {secondaryDaysOverdue > 0 ? `Overdue ${secondaryDaysOverdue}d` : 'Revision Due'}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {customSecondarySubject ? `Subject: ${customSecondarySubject.name}` : subjects.find(s => s.id === secondaryFocus.subjectId)?.name}
                  </p>
                </button>
              ) : (
                <button
                  onClick={() => setFocusDialogType('secondary')}
                  className="w-full py-3 mt-1 border border-dashed border-amber-500/30 rounded-xl text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-3 h-3" /> Select Focus
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Daily Anki Review Pass ────────────────────────────────────────── */}
      <section className="mb-8">
        <DailyAnkiCard subjects={subjects} systems={systems} />
      </section>
    </>
  );
}
