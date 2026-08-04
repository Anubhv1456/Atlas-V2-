import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadMBBSPreset } from '@/lib/mbbs-preset';
import { BookOpen, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PresetsSection() {
  const [isLoading, setIsLoading] = useState(false);

  const handleMerge = async () => {
    setIsLoading(true);
    try {
      await loadMBBSPreset();
      toast.success("MBBS Preset merged successfully!");
      // Short delay so user sees the success state before reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to merge MBBS preset");
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-foreground tracking-tight border-b border-border/40 pb-2">
        Curriculum Presets
      </h2>
      <div className="bg-card border border-border/40 p-4 sm:p-5 rounded-2xl shadow-sm transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              MBBS Subject Hierarchy
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Merge standard MBBS subjects and systems into your current tracker. 
              This will add missing topics without altering or deleting your existing data.
            </p>
          </div>
          <Button
            onClick={handleMerge}
            disabled={isLoading}
            variant="secondary"
            className="w-full sm:w-auto shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Merge Preset
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
