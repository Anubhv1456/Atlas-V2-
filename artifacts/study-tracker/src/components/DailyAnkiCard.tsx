import { useState, useEffect } from 'react';
import { AnkiLogo } from '@/components/AnkiLogo';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAnkiConfig,
  getDailyAnkiPass,
  toggleDailyAnkiPass,
  launchAnkiDeck,
  DailyAnkiPassState,
} from '@/lib/anki';
import { Subject, StudySystem } from '@/db/database';
import { isRevisionDue } from '@/db/revisionEngine';

interface DailyAnkiCardProps {
  subjects: Subject[];
  systems: StudySystem[];
  className?: string;
}

export function DailyAnkiCard({ subjects: _subjects, systems, className }: DailyAnkiCardProps) {
  const [config, setConfig] = useState(() => getAnkiConfig());
  const [dailyPass, setDailyPass] = useState<DailyAnkiPassState>(() => getDailyAnkiPass());

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
    : (config.rootDeckName && config.rootDeckName.trim() ? config.rootDeckName.trim() : 'Atlas');

  const dueSystemsCount = systems.filter(s => isRevisionDue(s)).length;

  return (
    <div className={cn(
      'relative bg-card border rounded-2xl p-4 sm:p-5 transition-all shadow-sm overflow-hidden',
      dailyPass.completed
        ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
        : 'border-border/80 hover:border-blue-500/30',
      className
    )}>
      {/* Subtle ambient gradient accent */}
      <div className={cn(
        'absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity',
        dailyPass.completed ? 'bg-emerald-500/15' : 'bg-blue-500/10'
      )} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title & Info */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-xl border transition-colors shrink-0',
            dailyPass.completed
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
          )}>
            <AnkiLogo size={20} variant="icon" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-base tracking-tight">
                Today's Anki Review
              </h3>
              {dueSystemsCount > 0 && !dailyPass.completed && (
                <span className="text-[10px] font-semibold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {dueSystemsCount} due
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dailyPass.completed ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Daily repetition pass completed
                </span>
              ) : (
                <span>Target deck: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground">{masterDeckLabel}</code></span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons: Go ↗ & Done ✓ */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {/* Go Button */}
          <Button
            size="sm"
            onClick={() => launchAnkiDeck(masterDeckLabel)}
            className="rounded-full font-semibold text-xs h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 shadow-2xs gap-1.5"
          >
            <span>Go</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>

          {/* Done Button */}
          <Button
            size="sm"
            variant={dailyPass.completed ? 'outline' : 'secondary'}
            onClick={handleTogglePass}
            className={cn(
              'rounded-full font-semibold text-xs h-9 px-5 transition-all gap-1.5',
              dailyPass.completed
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-muted/80 hover:bg-muted text-foreground border border-border/60'
            )}
          >
            <span>Done</span>
            <Check className={cn('w-4 h-4', dailyPass.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
          </Button>
        </div>
      </div>
    </div>
  );
}

