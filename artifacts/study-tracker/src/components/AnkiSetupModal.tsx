import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnkiLogo } from './AnkiLogo';
import { formatDeckName, formatAnkiSearchQuery, formatSystemTag, setDeckConfirmed, setSubjectDecksConfirmed, launchAnkiDeck, saveAnkiConfig, getAnkiConfig } from '@/lib/anki';
import { Copy, Check, ExternalLink, FolderPlus, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnkiSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectName: string;
  systemName?: string;
  allSystemNames?: string[];
  onConfirmed?: () => void;
}

export function AnkiSetupModal({
  open,
  onOpenChange,
  subjectName,
  systemName,
  allSystemNames = [],
  onConfirmed,
}: AnkiSetupModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [customRoot, setCustomRoot] = useState('');
  const [confirmAll, setConfirmAll] = useState(false);

  const config = getAnkiConfig();
  const subjectDeck = formatDeckName(subjectName, undefined, customRoot || undefined);
  const systemTag = systemName ? formatSystemTag(subjectName, systemName) : '';
  const searchQuery = formatAnkiSearchQuery(subjectName, systemName, customRoot || undefined);

  useEffect(() => {
    if (open) {
      setCustomRoot(config.rootDeck || '');
      setCopied(false);
    }
  }, [open, config.rootDeck]);

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(searchQuery);
    setCopied(true);
    toast({ title: 'Anki Search Query Copied!', description: `"${searchQuery}" ready for Anki search bar.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenAnki = () => {
    launchAnkiDeck(subjectName, systemName);
    toast({
      title: 'Opening Anki...',
      description: `Filtering Anki to ${subjectDeck} (${systemTag || 'All topics'}).`,
    });
  };

  const handleConfirm = () => {
    if (customRoot !== config.rootDeck) {
      saveAnkiConfig({ rootDeck: customRoot });
    }

    if (confirmAll && allSystemNames.length > 0) {
      setSubjectDecksConfirmed(subjectName, allSystemNames, true);
    } else {
      setDeckConfirmed(subjectName, systemName, true);
    }

    toast({
      title: 'Anki Link Verified! 🎉',
      description: `Direct 1-click filtered launch active for ${systemName ? `${subjectName} → ${systemName}` : subjectName}.`,
    });

    onConfirmed?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-5 border-border/80 shadow-xl bg-background/95 backdrop-blur-md">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <AnkiLogo size={28} variant="icon" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Anki Integration Architecture
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                1 Subject Deck ({subjectDeck}) + System Tag ({systemTag || 'System::*'})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Deck & Tag Query Breakdown */}
          <div className="space-y-2 bg-muted/40 p-3.5 rounded-xl border border-border/60">
            <div className="flex justify-between items-center text-xs font-semibold text-foreground">
              <span>Target Subject Deck:</span>
              <code className="font-mono bg-background px-2 py-0.5 rounded border border-border text-blue-600 dark:text-blue-400">{subjectDeck}</code>
            </div>
            {systemName && (
              <div className="flex justify-between items-center text-xs font-semibold text-foreground pt-1 border-t border-border/40">
                <span>System Tag:</span>
                <span className="font-mono bg-background px-2 py-0.5 rounded border border-border text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {systemTag}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-border/40">
              <div className="text-[11px] font-semibold text-muted-foreground mb-1">Search Query Used for Launching:</div>
              <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border/60">
                <code className="font-mono text-xs text-foreground flex-1 truncate select-all">{searchQuery}</code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyQuery}
                  className="h-7 px-2 rounded-md text-xs hover:bg-muted font-medium shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy Query'}
                </Button>
              </div>
            </div>
          </div>

          {/* Action Step 1: Launch Anki */}
          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <FolderPlus className="w-4 h-4" />
              <span>Step 1: Create Deck in Anki (One Deck per Subject)</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In Anki, make sure a deck named <strong className="text-foreground">{subjectDeck}</strong> exists. No subdecks needed!
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAnki}
              className="w-full rounded-xl bg-background hover:bg-muted text-xs font-semibold h-9 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs gap-1.5"
            >
              <AnkiLogo size={16} variant="icon" />
              <span>Test Filtered Launch in Anki</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
            </Button>
          </div>

          {/* Root deck prefix edit */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Optional Root Prefix</span>
              <span className="text-[10px] text-muted-foreground font-normal">Leave blank for direct <code className="bg-muted px-1 rounded">{subjectName}</code></span>
            </Label>
            <Input
              value={customRoot}
              onChange={e => setCustomRoot(e.target.value)}
              placeholder="e.g. 'NEET PG' or leave blank"
              className="h-9 text-xs rounded-xl bg-muted/40 border-border/60"
            />
          </div>

          {/* Bulk enable check if applicable */}
          {allSystemNames.length > 0 && systemName && (
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={confirmAll}
                onChange={e => setConfirmAll(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 rounded-xs"
              />
              <div className="text-xs">
                <span className="font-semibold text-foreground">Confirm for all topics in {subjectName}</span>
                <p className="text-[11px] text-muted-foreground">Enables 1-click launch for all {allSystemNames.length} topics in this subject.</p>
              </div>
            </label>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl text-xs h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full sm:flex-1 rounded-xl text-xs h-9 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Subject Deck Ready</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

