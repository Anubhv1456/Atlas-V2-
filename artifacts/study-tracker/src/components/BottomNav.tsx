import { Link, useLocation } from 'wouter';
import { Home, CalendarDays, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const [location] = useLocation();

  const links = [
    { href: '/',         icon: Home,          label: 'Home'     },
    { href: '/timeline', icon: CalendarDays,   label: 'Timeline' },
    { href: '/settings', icon: Settings,       label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-t border-border z-50 px-6 pb-safe flex items-center justify-around">
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-1.5 min-w-[64px] group py-2">
                <div className={cn(
                  'absolute -top-3 w-12 h-1 rounded-full transition-all duration-300 ease-out',
                  isActive ? 'bg-primary scale-100 opacity-100' : 'bg-transparent scale-0 opacity-0'
                )} />
                <Icon className={cn(
                  'w-6 h-6 transition-all duration-300 ease-out',
                  isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-110'
                )} />
                <span className={cn(
                  'text-[10px] font-semibold tracking-wide transition-colors duration-300',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  {label}
                </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
