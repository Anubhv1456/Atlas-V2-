import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AnkiLogo } from './AnkiLogo';
import { formatDeckName, formatAnkiSearchQuery, formatSystemTag, launchAnkiDeck } from '@/lib/anki';
import { Copy, Sparkles, Check, ArrowRight } from 'lucide-react';
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

  const subjectDeck = formatDeckName(subjectName);
  const searchQuery = formatAnkiSearchQuery(subjectName, systemName);

  const handleLaunch = () => {
    const res = launchAnkiDeck(subjectName, systemName);
    toast({
      title: 'Opening Anki...',
      description: `Target search query: ${res.searchQuery}`,
    });
    onOpenChange(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(searchQuery);
    setCopied(true);
    toast({ title: 'Query Copied!', description: `"${searchQuery}" copied to clipboard.` });
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
            Reviewing cards for <strong className="text-foreground">{subjectName} &rarr; {systemName}</strong> locks in active recall retention.
          </p>

          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Filtered Search Query</span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 lowercase font-mono">1 deck + tag filter</span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-background/80 p-2 rounded-lg border border-border/50">
              <span className="font-mono text-xs font-bold text-foreground truncate select-all">{searchQuery}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2 rounded-lg text-xs hover:bg-muted shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy Query'}
              </Button>
            </div>
            <div className="text-[11px] text-muted-foreground flex justify-between pt-0.5">
              <span>Deck: <code className="font-mono bg-muted px-1 rounded">{subjectDeck}</code></span>
              <span>Tag: <code className="font-mono bg-muted px-1 rounded">{formatSystemTag(subjectName, systemName)}</code></span>
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
            <span>Open Filtered Anki Deck</span>
            <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-80" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

