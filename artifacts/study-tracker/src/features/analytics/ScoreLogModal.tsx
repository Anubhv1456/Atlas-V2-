import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ScoreLog } from '@/db';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, CheckCircle2, Trophy, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoreLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'revision' | 'pyq';
  initialSubjectId?: number;
  initialSystemId?: number;
  initialPyqYearId?: number;
  initialTitle?: string;
  onSuccess?: () => void;
}

export function ScoreLogModal({
  isOpen,
  onClose,
  initialType = 'revision',
  initialSubjectId,
  initialSystemId,
  initialPyqYearId,
  initialTitle,
  onSuccess,
}: ScoreLogModalProps) {
  const { toast } = useToast();
  const subjects = useLiveQuery(() => db.subjects.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];
  const systems = useLiveQuery(() => db.systems.toArray().then(res => res.filter(s => !s.deletedAt)), []) || [];
  const pyqYears = useLiveQuery(() => db.pyqYears.toArray().then(res => res.filter(p => !p.deletedAt)), []) || [];

  const [type, setType] = useState<'revision' | 'pyq'>(initialType);
  const [subjectId, setSubjectId] = useState<number | undefined>(initialSubjectId);
  const [systemId, setSystemId] = useState<number | undefined>(initialSystemId);
  const [pyqYearId, setPyqYearId] = useState<number | undefined>(initialPyqYearId);
  const [title, setTitle] = useState<string>(initialTitle || '');
  const [score, setScore] = useState<string>('');
  const [total, setTotal] = useState<string>('100');
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setSubjectId(initialSubjectId);
      setSystemId(initialSystemId);
      setPyqYearId(initialPyqYearId);
      setTitle(initialTitle || '');
      setScore('');
      setTotal('100');
      setDateStr(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen, initialType, initialSubjectId, initialSystemId, initialPyqYearId, initialTitle]);

  // Auto-generate title if missing
  useEffect(() => {
    if (!title) {
      if (type === 'revision' && systemId) {
        const sys = systems.find(s => s.id === systemId);
        if (sys) {
          setTitle(`${sys.name} Revision Score`);
        }
      } else if (type === 'pyq' && (pyqYearId || subjectId)) {
        if (pyqYearId) {
          const pyq = pyqYears.find(p => p.id === pyqYearId);
          const sub = subjects.find(s => s.id === (pyq?.subjectId || subjectId));
          if (pyq) {
            setTitle(`${sub?.name ? sub.name + ' - ' : ''}${pyq.year} PYQ`);
          }
        } else if (subjectId) {
          const sub = subjects.find(s => s.id === subjectId);
          if (sub) {
            setTitle(`${sub.name} PYQ Test`);
          }
        }
      }
    }
  }, [type, systemId, pyqYearId, subjectId, systems, pyqYears, subjects, title]);

  // Filtered systems for selected subject
  const availableSystems = subjectId
    ? systems.filter(s => s.subjectId === subjectId)
    : systems;

  const availablePyqs = subjectId
    ? pyqYears.filter(p => p.subjectId === subjectId)
    : pyqYears;

  const scoreNum = parseFloat(score);
  const totalNum = parseFloat(total);
  const isValidScore = !isNaN(scoreNum) && !isNaN(totalNum) && totalNum > 0 && scoreNum >= 0 && scoreNum <= totalNum;
  const percentage = isValidScore ? Math.round((scoreNum / totalNum) * 100 * 100) / 100 : 0;

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    if (pct >= 60) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidScore) {
      toast({
        title: 'Invalid Score',
        description: 'Please enter a valid obtained score and total maximum marks.',
        variant: 'destructive',
      });
      return;
    }

    if (!subjectId) {
      toast({
        title: 'Subject Required',
        description: 'Please select a subject for this score entry.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedSub = subjects.find(s => s.id === subjectId);
      const selectedSys = systemId ? systems.find(s => s.id === systemId) : undefined;
      const selectedPyq = pyqYearId ? pyqYears.find(p => p.id === pyqYearId) : undefined;

      let logTitle = title.trim();
      if (!logTitle) {
        if (type === 'revision') {
          logTitle = selectedSys ? `${selectedSys.name} Revision` : `${selectedSub?.name} Revision`;
        } else {
          logTitle = selectedPyq ? `${selectedSub?.name} ${selectedPyq.year} PYQ` : `${selectedSub?.name} PYQ`;
        }
      }

      const logData: Omit<ScoreLog, 'id'> = {
        type,
        subjectId,
        systemId: systemId || undefined,
        pyqYearId: pyqYearId || undefined,
        title: logTitle,
        score: scoreNum,
        total: totalNum,
        percentage,
        timestamp: new Date(dateStr),
        notes: notes.trim() || undefined,
      };

      await db.scoreLogs.add(logData as ScoreLog);

      toast({
        title: 'Score Recorded! 🎯',
        description: `${logTitle}: ${scoreNum}/${totalNum} (${percentage}%)`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to log score:', err);
      toast({
        title: 'Error Saving Score',
        description: 'An error occurred while saving the score record.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            Log Performance Score
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Record test or revision scores to track retention trends over time on the Analytics page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Entry Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => { setType('revision'); setPyqYearId(undefined); }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                type === 'revision'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Topic Revision
            </button>
            <button
              type="button"
              onClick={() => { setType('pyq'); setSystemId(undefined); }}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
                type === 'pyq'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              PYQ / Practice Test
            </button>
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Subject *</Label>
            <Select
              value={subjectId ? String(subjectId) : ''}
              onValueChange={(val) => {
                const sId = Number(val);
                setSubjectId(sId);
                setSystemId(undefined);
                setPyqYearId(undefined);
              }}
            >
              <SelectTrigger className="w-full bg-background border-border text-xs">
                <SelectValue placeholder="Select a Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={String(sub.id)}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* System or PYQ Year Selector */}
          {type === 'revision' ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">System (Optional)</Label>
              <Select
                value={systemId ? String(systemId) : 'none'}
                onValueChange={(val) => setSystemId(val === 'none' ? undefined : Number(val))}
              >
                <SelectTrigger className="w-full bg-background border-border text-xs">
                  <SelectValue placeholder="All Systems / Overall Subject Revision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Overall Subject Revision</SelectItem>
                  {availableSystems.map((sys) => (
                    <SelectItem key={sys.id} value={String(sys.id)}>
                      {sys.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">PYQ Year (Optional)</Label>
              <Select
                value={pyqYearId ? String(pyqYearId) : 'none'}
                onValueChange={(val) => setPyqYearId(val === 'none' ? undefined : Number(val))}
              >
                <SelectTrigger className="w-full bg-background border-border text-xs">
                  <SelectValue placeholder="Select PYQ Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General Subject PYQ</SelectItem>
                  {availablePyqs.map((pyq) => (
                    <SelectItem key={pyq.id} value={String(pyq.id)}>
                      {pyq.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title / Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Entry Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cardiovascular System Revision #1"
              className="bg-background border-border text-xs"
            />
          </div>

          {/* Score obtained & Total */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Score Obtained *</Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 85"
                className={`bg-background border-border text-xs font-mono tabular-nums ${
                  score !== '' && (!isNaN(scoreNum) && (scoreNum < 0 || (!isNaN(totalNum) && scoreNum > totalNum)))
                    ? 'border-rose-500 focus-visible:ring-rose-500'
                    : ''
                }`}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Total Possible *</Label>
              <Input
                type="number"
                step="any"
                min="1"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="e.g. 100"
                className={`bg-background border-border text-xs font-mono tabular-nums ${
                  total !== '' && (!isNaN(totalNum) && (totalNum <= 0 || (!isNaN(scoreNum) && scoreNum > totalNum)))
                    ? 'border-rose-500 focus-visible:ring-rose-500'
                    : ''
                }`}
                required
              />
            </div>
          </div>

          {/* Real-time Inline Validation Error Alerts */}
          {score !== '' && total !== '' && !isNaN(scoreNum) && !isNaN(totalNum) && scoreNum > totalNum && (
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Earned score ({scoreNum}) cannot exceed total possible marks ({totalNum}).</span>
            </div>
          )}
          {score !== '' && !isNaN(scoreNum) && scoreNum < 0 && (
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Earned score cannot be a negative number.</span>
            </div>
          )}
          {total !== '' && !isNaN(totalNum) && totalNum <= 0 && (
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Total possible marks must be greater than 0.</span>
            </div>
          )}

          {/* Live Percentage Preview */}
          {isValidScore && (
            <div className={`p-3 rounded-xl border flex items-center justify-between ${getPercentageColor(percentage)}`}>
              <div className="flex items-center gap-2">
                {percentage >= 80 ? (
                  <Trophy className="w-5 h-5 shrink-0" />
                ) : percentage >= 60 ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold leading-none">Percentage Grade</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {percentage >= 80 ? 'Excellent performance' : percentage >= 60 ? 'Satisfactory score' : 'Target area for improvement'}
                  </p>
                </div>
              </div>
              <span className="text-xl font-extrabold font-mono tabular-nums">{percentage}%</span>
            </div>
          )}

          {/* Date Picker & Notes */}
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Date Logged</Label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="bg-background border-border text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Notes & Observations (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Missed 2 questions on ECG interpretation..."
                className="bg-background border-border text-xs resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs">
              Skip / Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValidScore || !subjectId} className="text-xs font-semibold">
              {isSubmitting ? 'Saving...' : 'Record Score'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
