import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';

export function AppearanceSection() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Appearance</h2>
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div className="text-left">
              <div className="font-semibold text-foreground">Dark Mode</div>
              <div className="text-xs text-muted-foreground">Toggle light / dark appearance</div>
            </div>
          </div>
          <Switch 
            checked={isDark} 
            onCheckedChange={toggleTheme} 
          />
        </div>
      </div>
    </section>
  );
}
