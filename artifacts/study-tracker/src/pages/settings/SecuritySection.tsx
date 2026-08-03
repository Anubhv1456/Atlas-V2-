import { ShieldCheck, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function SecuritySection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-1 mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">App Security & Safeguards</h2>
        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 font-medium bg-emerald-500/5 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" /> Active Safeguard
        </Badge>
      </div>
      <div className="bg-card rounded-2xl border shadow-sm p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-foreground">Web & Connection Security</div>
            <div className="text-muted-foreground mt-0.5">
              Guards your connection and blocks unauthorized external access to your study data.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 border-t pt-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 mt-0.5">
            <Lock className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              Password-Protected Backups
            </div>
            <div className="text-muted-foreground mt-0.5">
              Uses high-grade encryption to lock backups on your device smoothly without slowing down the app.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
