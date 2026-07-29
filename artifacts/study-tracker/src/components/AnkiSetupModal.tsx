import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnkiLogo } from './AnkiLogo';
import { formatDeckName, setDeckConfirmed, setSubjectDecksConfirmed, launchAnkiDeck, isDeckConfirmed, saveAnkiConfig, getAnkiConfig } from '@/lib/anki';
import { Copy, Check, ExternalLink, Sparkles, CheckCircle2, ShieldCheck, FolderPlus } from 'lucide-react';
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
  const [customDeckOverride, setCustomDeckOverride] = useState('');

  const config = getAnkiConfig();
  const defaultDeck = formatDeckName(subjectName, systemName, customRoot || undefined);
  const activeDeckName = customDeckOverride.trim() || defaultDeck;
  const isAlreadyConfirmed = isDeckConfirmed(subjectName, systemName);

  useEffect(() => {
    if (open) {
      setCustomRoot(config.rootDeck || '');
      setCopied(false);
      setCustomDeckOverride('');
    }
  }, [open, config.rootDeck]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeDeckName);
    setCopied(true);
    toast({ title: 'Deck Name Copied!', description: `"${activeDeckName}" ready to paste in Anki.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenAnki = () => {
    launchAnkiDeck(activeDeckName);
    toast({
      title: 'Opening Anki...',
      description: 'Redirecting to Anki deck / web fallback. Create or select your deck.',
    });
  };

  const handleConfirm = () => {
    if (customRoot !== config.rootDeck) {
      saveAnkiConfig({ rootDeck: customRoot });
    }

    if (customDeckOverride.trim()) {
      const currentUrls = { ...config.customDeckUrls };
      const key = systemName ? `${subjectName}::${systemName}` : subjectName;
      currentUrls[key] = customDeckOverride.trim();
      saveAnkiConfig({ customDeckUrls: currentUrls });
    }

    if (confirmAll && allSystemNames.length > 0) {
      setSubjectDecksConfirmed(subjectName, allSystemNames, true);
    } else {
      setDeckConfirmed(subjectName, systemName, true);
    }

    toast({
      title: 'Anki Link Verified! 🎉',
      description: `Direct 1-click launch is now active for ${systemName ? systemName : subjectName}.`,
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
                Anki Deck Setup
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Connect {systemName ? `${subjectName} → ${systemName}` : subjectName} to your Anki deck hierarchy
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Deck Path Card */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Calculated Anki Deck Path
            </Label>
            <div className="flex items-center gap-2 p-3 bg-muted/60 dark:bg-muted/30 rounded-xl border border-border/60">
              <span className="font-mono text-sm font-semibold text-foreground flex-1 truncate select-all">
                {activeDeckName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2.5 rounded-lg text-xs hover:bg-background font-medium shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tip: In Anki, subdecks use double colons <code className="bg-muted px-1 py-0.5 rounded text-[10px]">::</code> (e.g. {subjectName}::{systemName || 'General'}).
            </p>
          </div>

          {/* Action Step 1: Open Anki & Create */}
          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <FolderPlus className="w-4 h-4" />
                <span>Step 1: Open Anki & Build Deck</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Click below to jump into Anki. Create or select a deck named <strong className="text-foreground">{activeDeckName}</strong>.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAnki}
              className="w-full rounded-xl bg-background hover:bg-muted text-xs font-semibold h-9 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-2xs gap-1.5"
            >
              <AnkiLogo size={16} variant="icon" />
              <span>Launch Anki & Select/Build Deck</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
            </Button>
          </div>

          {/* Root deck prefix edit */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Optional Master Deck Prefix</span>
              <span className="text-[10px] text-muted-foreground font-normal">Leave blank for direct <code className="bg-muted px-1 rounded">{subjectName}::{systemName || 'Subdeck'}</code></span>
            </Label>
            <Input
              value={customRoot}
              onChange={e => setCustomRoot(e.target.value)}
              placeholder="Leave blank, or enter prefix like 'NEET PG' or 'AnKing'"
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
                <span className="font-semibold text-foreground">Confirm for all systems in {subjectName}</span>
                <p className="text-[11px] text-muted-foreground">Activates 1-click Anki link for all {allSystemNames.length} topics in this subject.</p>
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
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Deck Ready & Enable Link</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
