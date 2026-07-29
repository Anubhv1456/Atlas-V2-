import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AnkiLogo } from './AnkiLogo';
import { formatDeckName, launchAnkiDeck, getAnkiConfig, saveAnkiConfig } from '@/lib/anki';
import { Copy, ExternalLink, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AnkiPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectName: string;
  systemName: string;
  actionType?: 'qbank' | 'revision' | 'units';
}

export function AnkiPromptModal({
  open,
  onOpenChange,
  subjectName,
  systemName,
  actionType = 'revision',
}: AnkiPromptModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const deckName = formatDeckName(subjectName, systemName);

  const handleLaunch = () => {
    launchAnkiDeck(deckName);
    toast({
      title: 'Opening Anki Deck...',
      description: `Targeting: ${deckName}`,
    });
    onOpenChange(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(deckName);
    setCopied(true);
    toast({ title: 'Deck Name Copied!', description: `"${deckName}" copied.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const actionText = {
    qbank: 'QBank Questions Completed!',
    revision: 'Revision Session Logged!',
    units: 'Unit Progress Updated!',
  }[actionType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6 gap-4 border-blue-500/30 shadow-2xl bg-background/95 backdrop-blur-md">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <AnkiLogo size={30} variant="icon" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mb-1">
                <Sparkles className="w-3 h-3" />
                <span>{actionText}</span>
              </div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Anki Recall Reminder
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            High-yield memory retention skyrockets when active recall flashcards are reviewed right after completing a topic.
          </p>

          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Target Deck</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-foreground truncate">{deckName}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 rounded-lg text-xs hover:bg-background shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto rounded-xl text-xs h-9"
          >
            Later
          </Button>
          <Button
            type="button"
            onClick={handleLaunch}
            className="w-full sm:flex-1 rounded-xl text-xs h-9 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-1.5"
          >
            <AnkiLogo size={16} variant="icon" />
            <span>Launch Anki Now</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-80" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
