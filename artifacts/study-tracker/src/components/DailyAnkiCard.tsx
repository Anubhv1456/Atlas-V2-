import { useState, useEffect } from 'react';
import { AnkiLogo } from '@/components/AnkiLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ExternalLink, Play, Layers, BookOpen, Settings2, Sparkles, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAnkiConfig,
  getDailyAnkiPass,
  toggleDailyAnkiPass,
  launchAnkiDeck,
  DailyAnkiPassState,
} from '@/lib/anki';
import { AnkiSetupModal } from '@/components/AnkiSetupModal';
import { Subject, StudySystem } from '@/db/database';
import { isRevisionDue } from '@/db/revisionEngine';

interface DailyAnkiCardProps {
  subjects: Subject[];
  systems: StudySystem[];
  className?: string;
}

export function DailyAnkiCard({ subjects, systems, className }: DailyAnkiCardProps) {
  const [config, setConfig] = useState(() => getAnkiConfig());
  const [dailyPass, setDailyPass] = useState<DailyAnkiPassState>(() => getDailyAnkiPass());
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const handleConfigUpdate = () => setConfig(getAnkiConfig());
    const handlePassUpdate = () => setDailyPass(getDailyAnkiPass());

    window.addEventListener('anki-config-updated', handleConfigUpdate);
    window.addEventListener('daily-anki-pass-updated', handlePassUpdate);

    return () => {
      window.removeEventListener('anki-config-updated', handleConfigUpdate);
      window.removeEventListener('daily-anki-pass-updated', handlePassUpdate);
    };
  }, []);

  const handleTogglePass = () => {
    const updated = toggleDailyAnkiPass();
    setDailyPass(updated);
  };

  const masterDeckLabel = config.rootDeck && config.rootDeck.trim()
    ? config.rootDeck.trim()
    : 'All Active Decks';

  const dueSystemsCount = systems.filter(s => isRevisionDue(s)).length;

  return (
    <>
      <div className={cn(
        'relative bg-card border rounded-2xl shadow-sm p-4 sm:p-5 transition-all overflow-hidden',
        dailyPass.completed
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-blue-500/25 dark:border-blue-500/20 hover:border-blue-500/40',
        className
      )}>
        {/* Decorative ambient background blur */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2.5 rounded-2xl transition-all shrink-0 border shadow-2xs',
                dailyPass.completed
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
              )}>
                <AnkiLogo size={22} variant="icon" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm sm:text-base tracking-tight">
                    Daily Anki Mastery Pass
                  </h3>
                  {dailyPass.completed ? (
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold gap-1 px-2">
                      <CheckCircle2 className="w-3 h-3" /> Pass Cleared
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-semibold gap-1 px-2">
                      <Sparkles className="w-3 h-3" /> Master Queue
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Consolidate your active repetition queue across all subjects & subdecks in a single daily pass.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSetup(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-colors shrink-0"
              title="Configure Anki Master Deck"
              aria-label="Configure Anki Master Deck"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-muted/40 border border-border/40 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{subjects.length} Subjects</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{systems.length} Subdecks</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0 justify-end">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-medium text-foreground truncate">
                {dueSystemsCount > 0 ? `${dueSystemsCount} Due Today` : 'Synced'}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => launchAnkiDeck(masterDeckLabel)}
              className="rounded-xl font-semibold text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs flex-1 sm:flex-initial px-4"
            >
              <Play className="w-3.5 h-3.5 fill-current mr-1.5" />
              Launch Master Queue
            </Button>

            <Button
              size="sm"
              variant={dailyPass.completed ? 'outline' : 'secondary'}
              onClick={handleTogglePass}
              className={cn(
                'rounded-xl font-semibold text-xs h-9 transition-all px-3.5',
                dailyPass.completed
                  ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                  : 'bg-muted/80 hover:bg-muted text-foreground'
              )}
            >
              {dailyPass.completed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-500 fill-emerald-500/20" />
                  Pass Complete
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4 mr-1.5 text-muted-foreground" />
                  Mark Pass Done
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AnkiSetupModal
        open={showSetup}
        onOpenChange={setShowSetup}
        subjectName={subjects[0]?.name || 'General Medicine'}
      />
    </>
  );
}
