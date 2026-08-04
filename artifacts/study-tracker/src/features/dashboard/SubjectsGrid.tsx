import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Subject, StudySystem } from '@/db';
import { EmptyStateGraphic } from '@/components/EmptyStateGraphic';
import { Button } from '@/components/ui/button';
import { SubjectCard } from '@/features/subjects/SubjectCard';
import { loadMBBSPreset } from '@/lib/mbbs-preset';
import { useState } from 'react';

interface SubjectsGridProps {
  subjects: Subject[];
  systems: StudySystem[];
  setShowAddSubject: (show: boolean) => void;
  setSubjectToDelete: (sub: Subject) => void;
  setSubjectToRename: (sub: Subject) => void;
  setRenameSubjectName: (name: string) => void;
  handleSubjectDragEnd: (result: DropResult) => void;
}

export function SubjectsGrid({
  subjects,
  systems,
  setShowAddSubject,
  setSubjectToDelete,
  setSubjectToRename,
  setRenameSubjectName,
  handleSubjectDragEnd
}: SubjectsGridProps) {
  return (
    <>
      <section className="flex-1">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Subject Portfolio
            </h2>
            <span className="text-[10px] font-mono font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-border/40">
              {subjects.length}
            </span>
          </div>
        </div>

        {subjects.length === 0 ? (
          <EmptyStateGraphic
            icon={BookOpen}
            title="Start Building Your Library"
            description="Create your first subject to begin mapping out topics, tracking tasks, and utilizing spaced repetition to maximize your retention."
            action={
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
            }
          />
        ) : (
          <DragDropContext onDragEnd={handleSubjectDragEnd}>
            <Droppable droppableId="subjects-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid gap-3"
                >
                  {subjects.map((subject, index) => (
                    <Draggable
                      key={subject.id}
                      draggableId={String(subject.id)}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <SubjectCard
                            subject={subject}
                            systems={systems.filter(s => s.subjectId === subject.id)}
                            dragHandleProps={provided.dragHandleProps}
                            onDelete={(sub) => setSubjectToDelete(sub)}
                            onRename={(sub) => { setSubjectToRename(sub); setRenameSubjectName(sub.name); }}
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

      {subjects.length > 0 && (
        <button
          onClick={() => setShowAddSubject(true)}
          className="fixed right-6 w-12 h-12 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center hover:bg-primary/20 transition-all z-40 backdrop-blur-sm shadow-sm"
          style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
          aria-label="Add Subject"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
