import { useState, useMemo } from 'react';
import { useParams, Link, useLocation, useSearch } from 'wouter';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  useSubject, useSystemsBySubject, usePYQsBySubject, useScoreLogsBySubject,
  addSystem, updateSubject, deleteSubject, updateSystemsOrder,
  addPYQYear, addPYQYearBatch, updatePYQYear, deletePYQYear, togglePYQYear,
} from '@/db';
import { SystemCard } from '@/components/SystemCard';
import { EmptyStateGraphic } from '@/components/EmptyStateGraphic';
import { AddDialog } from '@/components/AddDialog';
import { ProgressBar } from '@/components/ProgressBar';
import { PYQYear } from '@/db';
import { ScoreLogModal } from '@/components/ScoreLogModal';
import {
  ChevronLeft, ChevronDown, ChevronRight, Plus, Trash2, Edit2,
  LayoutList, Lock, Check, BookOpen, Award, LayoutGrid, Sparkles,
  RefreshCw, Calendar, CheckCircle2, Circle, MoreVertical,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudySystem } from '@/db';
import { cn } from '@/lib/utils';
import { calculateSubjectProgress } from '@/lib/progress';
import { usePYQSectionLogic, useSubjectDetailLogic } from './SubjectDetail.hooks';
import { validateNumberOfYears, validateYearInput } from '@/lib/validation';

type StageKey = 'contentCompleted' | 'qbankDone';

// ── PYQ section component ──────────────────────────────────────────────────────

interface PYQSectionProps {
  subjectId:   number;
  subjectName: string;
  years:       PYQYear[];
}

function PYQSection({ subjectId, subjectName, years }: PYQSectionProps) {
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

  const handleResetAll = async () => {
    for (const y of years) {
      if (y.completed && y.id) {
        await togglePYQYear(y.id, subjectId, subjectName, y.year, true);
      }
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/80 shadow-sm overflow-hidden transition-all">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40 bg-muted/20">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 text-left focus:outline-none group flex-1 min-w-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground/70 shrink-0 group-hover:text-foreground transition-colors" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground/70 shrink-0 group-hover:text-foreground transition-colors" />}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm tracking-tight truncate">
                  PYQ Completion Grid
                </h3>
                {total > 0 && (
                  <span className={cn(
                    "text-[10px] font-mono tabular-nums font-semibold px-2 py-0.5 rounded-full border shrink-0",
                    completed === total
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-muted text-muted-foreground border-border/60"
                  )}>
                    {percentage}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {total === 0
                  ? 'No PYQ years configured yet'
                  : `${completed} / ${total} Years Solved`}
              </p>
            </div>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Grid vs List View Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/60">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all",
                viewMode === 'grid'
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="5-Year Tile Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all",
                viewMode === 'list'
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Compact List View"
              aria-label="List View"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Preset Generator Quick Trigger */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPresetModal(true)}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5 border-border/60 px-2.5 hidden sm:inline-flex"
            title="Configure PYQ Years / 5-Year Presets"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Grid Presets</span>
          </Button>

          {/* Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onClick={handleQuickAdd5YearDefaults} className="gap-2 text-xs font-medium cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Add 5-Year Defaults ({currentYearNum-4}–{currentYearNum})</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowPresetModal(true)} className="gap-2 text-xs font-medium cursor-pointer">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Custom Year Range...</span>
              </DropdownMenuItem>
              {total > 0 && (
                <>
                  <DropdownMenuItem onClick={handleMarkAllComplete} className="gap-2 text-xs font-medium cursor-pointer text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark All Complete</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleResetAll} className="gap-2 text-xs font-medium cursor-pointer text-muted-foreground">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset All</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress Bar Header */}
      {total > 0 && expanded && (
        <div className="px-4 pt-3 pb-1 border-b border-border/30 bg-muted/10">
          <ProgressBar progress={percentage} className="h-1.5" />
        </div>
      )}

      {/* Expanded Section Content */}
      <div className={cn(
        'grid transition-all duration-300 ease-in-out',
        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}>
        <div className="overflow-hidden">
          <div className="p-4 space-y-4">

            {/* Empty State with 1-click Preset Seed */}
            {years.length === 0 ? (
              <div className="text-center py-6 px-4 bg-muted/20 border border-dashed border-border/80 rounded-2xl space-y-3">
                <div className="p-3 w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-foreground text-sm">No PYQ Years Configured</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Generate the standard 5-year PYQ grid (e.g. {currentYearNum-4} to {currentYearNum}) or add custom years for NEET PG / INI-CET preparation.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleQuickAdd5YearDefaults}
                    className="rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Last 5 Years ({currentYearNum-4}–{currentYearNum})</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAdd(true)}
                    className="rounded-xl text-xs font-semibold border-border/80"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Single Year</span>
                  </Button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* ── GRID VIEW (Responsive 5-Year Tile Grid) ──────────────── */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {years.map(year => {
                  const scoreLog = yearScoreMap.get(year.id!);
                  return (
                    <div
                      key={year.id}
                      className={cn(
                        "group relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 select-none",
                        year.completed
                          ? "bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-500/15 text-foreground shadow-2xs"
                          : "bg-card border-border/70 hover:border-primary/40 hover:bg-muted/40 shadow-2xs"
                      )}
                    >
                      {/* Top Bar: Year Name & Checkbox */}
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <span className={cn(
                            "font-mono tabular-nums font-extrabold text-base sm:text-lg block tracking-tight leading-tight truncate",
                            year.completed ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
                          )}>
                            {year.year}
                          </span>
                        </div>

                        {/* Completion Toggle Badge */}
                        <button
                          onClick={() => handleToggle(year)}
                          className={cn(
                            "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 focus:outline-none",
                            year.completed
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs scale-105"
                              : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5 text-transparent"
                          )}
                          title={year.completed ? "Mark pending" : "Mark solved"}
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>

                      {/* Middle: Score Badge or Log Trigger */}
                      <div className="my-3">
                        {scoreLog ? (
                          <button
                            onClick={() => setScoreModalPyq(year)}
                            className={cn(
                              "w-full text-left p-1.5 px-2 rounded-xl border text-xs font-mono tabular-nums transition-all flex items-center justify-between gap-1.5",
                              scoreLog.percentage >= 75
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                                : scoreLog.percentage >= 50
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/25"
                            )}
                            title="Click to view/update test score"
                          >
                            <span className="font-bold">{scoreLog.percentage}%</span>
                            <span className="text-[10px] opacity-80">{scoreLog.score}/{scoreLog.total}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setScoreModalPyq(year)}
                            className="w-full text-left py-1 px-2 rounded-lg border border-dashed border-border/70 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center justify-between"
                          >
                            <span>No score</span>
                            <Plus className="w-3 h-3 opacity-60" />
                          </button>
                        )}
                      </div>

                      {/* Bottom Footer: Quick Tile Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-muted-foreground">
                        <button
                          onClick={() => setScoreModalPyq(year)}
                          className="p-1 rounded-lg hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Log Test Score"
                        >
                          <Award className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditTarget(year); setEditValue(year.year); }}
                            className="p-1 rounded-lg hover:text-foreground hover:bg-muted transition-colors"
                            title="Rename Year"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePYQDeleteClick(year)}
                            className="p-1 rounded-lg hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Delete Year"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── LIST VIEW (Detailed Linear Rows) ─────────────────────── */
              <div className="space-y-1.5">
                {years.map(year => {
                  const scoreLog = yearScoreMap.get(year.id!);
                  return (
                    <div
                      key={year.id}
                      className={cn(
                        "flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all",
                        year.completed ? "bg-emerald-500/5 border-emerald-500/30" : "bg-card border-border/60 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggle(year)}
                          className={cn(
                            'shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150',
                            year.completed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-muted-foreground/30 hover:border-primary',
                          )}
                        >
                          {year.completed && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <span className={cn(
                          'font-mono tabular-nums text-sm font-semibold truncate',
                          year.completed ? 'line-through text-muted-foreground' : 'text-foreground',
                        )}>
                          {year.year}
                        </span>

                        {scoreLog && (
                          <span className={cn(
                            "text-[11px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-md border shrink-0",
                            scoreLog.percentage >= 75
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          )}>
                            {scoreLog.percentage}% ({scoreLog.score}/{scoreLog.total})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setScoreModalPyq(year)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          title="Log PYQ Score"
                        >
                          <Award className="w-4 h-4 text-primary" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditTarget(year); setEditValue(year.year); }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit Year"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePYQDeleteClick(year)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          title="Delete Year"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Add Inline Control */}
            {years.length > 0 && (
              <div className="pt-2 border-t border-border/40">
                {showAdd ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={addValue}
                      onChange={e => setAddValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setAddValue(''); } }}
                      placeholder="e.g. 2024 or 2024 INI-CET"
                      className="flex-1 h-9 text-xs font-mono bg-muted/50 border-border/60 focus-visible:ring-primary"
                    />
                    <Button size="sm" onClick={handleAdd} disabled={!addValue.trim()} className="rounded-xl h-9 px-4 text-xs">Add Year</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddValue(''); }} className="rounded-xl h-9 text-xs">Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-semibold transition-colors py-1"
                    >
                      <Plus className="w-3.5 h-3.5" />Add Custom Year
                    </button>

                    <button
                      onClick={() => setShowPresetModal(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors py-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Configure Range</span>
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Preset Range Generator Dialog ─────────────────────────────────── */}
      <Dialog open={showPresetModal} onOpenChange={setShowPresetModal}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Configure PYQ Year Grid</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Generate a batch of consecutive PYQ years for <strong className="text-foreground">{subjectName}</strong> without removing existing logs.
            </p>

            {/* Quick Presets Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setPresetEndYear(String(currentYearNum)); setPresetSpan('5'); setPresetPrefix(''); }}
                  className="rounded-xl text-xs font-mono tabular-nums justify-start h-9"
                >
                  5 Years ({currentYearNum-4}–{currentYearNum})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setPresetEndYear(String(currentYearNum - 1)); setPresetSpan('5'); setPresetPrefix(''); }}
                  className="rounded-xl text-xs font-mono tabular-nums justify-start h-9"
                >
                  5 Years ({currentYearNum-5}–{currentYearNum-1})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setPresetEndYear(String(currentYearNum)); setPresetSpan('3'); setPresetPrefix(''); }}
                  className="rounded-xl text-xs font-mono tabular-nums justify-start h-9"
                >
                  3 Years ({currentYearNum-2}–{currentYearNum})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setPresetEndYear(String(currentYearNum)); setPresetSpan('10'); setPresetPrefix(''); }}
                  className="rounded-xl text-xs font-mono tabular-nums justify-start h-9"
                >
                  10 Years ({currentYearNum-9}–{currentYearNum})
                </Button>
              </div>
            </div>

            {/* Custom Range Settings */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Latest Year</label>
                <Input
                  type="number"
                  value={presetEndYear}
                  onChange={e => setPresetEndYear(e.target.value)}
                  className={cn(
                    "h-9 text-xs font-mono bg-muted/50",
                    !endYearValidation.isValid && presetEndYear !== '' && "border-destructive focus-visible:ring-destructive"
                  )}
                  placeholder="e.g. 2024"
                />
                {!endYearValidation.isValid && presetEndYear !== '' && (
                  <p className="text-[10px] text-destructive font-medium leading-tight mt-0.5">{endYearValidation.error}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Number of Years</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={presetSpan}
                  onChange={e => setPresetSpan(e.target.value)}
                  className={cn(
                    "h-9 text-xs font-mono bg-muted/50",
                    !spanValidation.isValid && presetSpan !== '' && "border-destructive focus-visible:ring-destructive"
                  )}
                  placeholder="e.g. 5"
                />
                {!spanValidation.isValid && presetSpan !== '' && (
                  <p className="text-[10px] text-destructive font-medium leading-tight mt-0.5">{spanValidation.error}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Optional Prefix</label>
              <Input
                value={presetPrefix}
                onChange={e => setPresetPrefix(e.target.value)}
                className="h-9 text-xs bg-muted/50"
                placeholder="e.g. NEET-PG or INI-CET (leave blank for plain year)"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 sm:justify-end mt-2">
            <Button variant="ghost" onClick={() => setShowPresetModal(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateCustomRange}
              disabled={!spanValidation.isValid || !endYearValidation.isValid}
              className="rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Years</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit year dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => { if (!open) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-[320px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle className="text-xl font-semibold">Edit Year Label</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input
              autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); }}
              className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleEditSave} disabled={!editValue.trim()} className="rounded-xl font-semibold px-8">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PYQ Delete confirmation dialog */}
      <Dialog open={showPYQDeleteConfirm} onOpenChange={setShowPYQDeleteConfirm}>
        <DialogContent className="sm:max-w-[360px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">Delete PYQ Year</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold font-mono text-foreground">{pyqToDelete?.year}</span>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end mt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowPYQDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handlePYQDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score log modal for PYQ year */}
      <ScoreLogModal
        isOpen={Boolean(scoreModalPyq)}
        onClose={() => setScoreModalPyq(null)}
        initialType="pyq"
        initialSubjectId={subjectId}
        initialPyqYearId={scoreModalPyq?.id}
        initialTitle={scoreModalPyq ? `${subjectName} - ${scoreModalPyq.year} PYQ` : `${subjectName} PYQ`}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'Strong', label: 'Strong', color: 'bg-green-500' },
  { key: 'Average', label: 'Average', color: 'bg-yellow-500' },
  { key: 'Weak', label: 'Weak', color: 'bg-red-500' }
];

export default function SubjectDetail() {
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

  return (
    <div className="min-h-full bg-background px-4 pt-10 pb-28 max-w-2xl mx-auto flex flex-col relative animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <button className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors focus:outline-none">
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-current" />
                <span className="w-1 h-1 rounded-full bg-current" />
                <span className="w-1 h-1 rounded-full bg-current" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => { setEditName(subject.name); setShowEdit(true); }} className="gap-2 py-3 cursor-pointer">
                <Edit2 className="w-4 h-4" /> Rename Subject
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive gap-2 py-3 cursor-pointer">
                <Trash2 className="w-4 h-4" /> Delete Subject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight min-w-0">{subject.name}</h1>
        </div>

        {/* Overall progress card */}
        <div className="bg-card border shadow-sm p-4 rounded-2xl flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-end mb-2 text-sm">
              <span className="font-semibold text-foreground">Progress</span>
              <span className="font-bold text-primary">{progress}%</span>
            </div>
            <ProgressBar progress={progress} className="h-2.5" />
          </div>
          <div className="h-10 w-px bg-border mx-2" />
          <div className="text-center min-w-[3rem]">
            <div className="text-xl font-bold text-foreground leading-none mb-1">{systems.length}</div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Systems</div>
          </div>
        </div>

        {/* ── Progress Rings (Quiet Confidence) ───────────────────────── */}
        {systems.length > 0 && (
          <section className="mt-8 mb-10">
            <div className="flex justify-center gap-10">
              <button 
                onClick={() => handleDonutClick('contentCompleted')} 
                className={cn(
                  "flex flex-col items-center gap-3 transition-all focus:outline-none",
                  activeFilter && activeFilter !== 'contentCompleted' ? 'opacity-40 hover:opacity-70' : 'opacity-100'
                )}
              >
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" className="stroke-muted" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" className="stroke-primary transition-all duration-1000 ease-in-out" 
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={283 - (283 * stagePct('contentCompleted')) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono text-foreground">{stagePct('contentCompleted')}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</span>
                  {activeFilter === 'contentCompleted' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
              </button>

              <button 
                onClick={() => handleDonutClick('qbankDone')} 
                className={cn(
                  "flex flex-col items-center gap-3 transition-all focus:outline-none",
                  activeFilter && activeFilter !== 'qbankDone' ? 'opacity-40 hover:opacity-70' : 'opacity-100'
                )}
              >
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" className="stroke-muted" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="45" fill="none" style={{ stroke: 'hsl(var(--gold))' }} className="transition-all duration-1000 ease-in-out" 
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="283" strokeDashoffset={283 - (283 * stagePct('qbankDone')) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono text-foreground">{stagePct('qbankDone')}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1.5 h-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QBank</span>
                  {activeFilter === 'qbankDone' && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'hsl(var(--gold))' }} />}
                </div>
              </button>
            </div>
            
            {activeFilter && (
              <div className="text-center mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Showing{' '}
                  <span className="font-mono text-foreground">{visibleSystems.length}</span>
                  {' '}system{visibleSystems.length !== 1 ? 's' : ''} without{' '}
                  <span className={cn(
                    "font-semibold",
                    activeFilter === 'contentCompleted' ? 'text-primary' : 'text-[hsl(var(--gold))]'
                  )}>
                    {activeFilter === 'contentCompleted' ? 'Content' : 'QBank'}
                  </span>
                  {' '}— tap again to clear
                </p>
              </div>
            )}
          </section>
        )}
      </header>

      {/* Systems list */}
      <section>
        {systems.length === 0 ? (
          <EmptyStateGraphic
            icon={LayoutList}
            title="No Systems Added Yet"
            description={`Break down ${subject.name} into smaller, structured systems or sub-topics to track progress.`}
            action={
              <Button onClick={() => setShowAddSystem(true)} size="sm" className="gap-1.5 rounded-xl shadow-xs">
                <Plus className="w-4 h-4" /> Add First System
              </Button>
            }
            className="mt-6"
          />
        ) : visibleSystems.length === 0 ? (
          <div className="text-center py-12 px-4 bg-muted/30 rounded-3xl border border-dashed">
            <p className="text-foreground font-semibold mb-1">All systems complete</p>
            <p className="text-sm text-muted-foreground">
              Every system has{' '}
              <span className="font-medium" style={{ color: STAGES.find(s => s.key === activeFilter)!.color }}>
                {STAGES.find(s => s.key === activeFilter)!.label}
              </span>{' '}
              done.
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="systems-list" isDropDisabled={activeFilter !== null}>
              {(provided) => (
                <div 
                  className="grid gap-3"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {visibleSystems.map((system, index) => (
                    <Draggable 
                      key={system.id} 
                      draggableId={String(system.id)} 
                      index={index}
                      isDragDisabled={activeFilter !== null}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(snapshot.isDragging && "opacity-80 z-50")}
                          style={provided.draggableProps.style}
                        >
                          <SystemCard
                            system={system}
                            subjectName={subject.name}
                            highlighted={system.id === highlightId}
                            dragHandleProps={provided.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </section>

      {/* ── PYQ Section ─────────────────────────────────────────────────────── */}
      <section className="mt-6">
        {systems.length > 0 && (
          pyqUnlocked ? (
            <PYQSection
              subjectId={subject.id!}
              subjectName={subject.name}
              years={pyqYears}
            />
          ) : (
            <div className="bg-muted/20 rounded-2xl border border-dashed p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">PYQs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete Content and QBank for all systems to unlock PYQs
                </p>
              </div>
            </div>
          )
        )}
      </section>

      {/* FAB */}
      {systems.length > 0 && (
        <button
          onClick={() => setShowAddSystem(true)}
          className="fixed right-6 w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center hover:bg-primary/20 transition-all z-40 backdrop-blur-sm shadow-sm"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
          aria-label="Add System"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}

      <AddDialog
        open={showAddSystem}
        onOpenChange={setShowAddSystem}
        title="New System"
        placeholder="e.g. Cardiology"
        onSave={(name) => addSystem(subject.id!, name)}
      />

      {/* Rename dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Rename Subject</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus value={editName} onChange={e => setEditName(e.target.value)}
              className="text-lg py-6 px-4 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEdit(false)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || editName === subject.name}
              className="rounded-xl font-semibold px-8 shadow-sm"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Subject confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl mx-4 w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive">Delete Subject</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{subject.name}</strong>?
            </p>
            <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 leading-relaxed font-medium">
              ⚠️ This will permanently delete this subject along with all its systems, task progress, revision schedules, and PYQ records.
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end mt-4">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-semibold shadow-sm" onClick={handleDeleteConfirm}>
              Delete Subject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
