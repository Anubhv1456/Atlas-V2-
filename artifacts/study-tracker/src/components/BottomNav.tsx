import { Link, useLocation } from 'wouter';
import { Home, CalendarDays, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const [location] = useLocation();

  const links = [
    { href: '/',          icon: Home,          label: 'Home' },
    { href: '/timeline',  icon: CalendarDays,  label: 'Timeline' },
    { href: '/analytics', icon: BarChart3,     label: 'Analytics' },
    { href: '/settings',  icon: Settings,      label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/85 backdrop-blur-2xl border-t border-border/80 z-50 px-6 pb-safe flex items-center justify-around shadow-lg">
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-1 min-w-[68px] group py-1.5 px-3 rounded-2xl transition-all duration-200">
                {/* Active Capsule Pill background */}
                {isActive && (
                  <div className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20 transition-all duration-300 animate-in fade-in zoom-in-95" />
                )}
                <div className={cn(
                  'absolute -top-2.5 w-8 h-1 rounded-full transition-all duration-300 ease-out',
                  isActive ? 'bg-primary scale-100 opacity-100 shadow-[0_0_10px_rgba(31,168,155,0.6)]' : 'bg-transparent scale-0 opacity-0'
                )} />
                <Icon className={cn(
                  'w-5 h-5 transition-all duration-300 ease-out z-10',
                  isActive ? 'text-primary scale-105' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-110'
                )} />
                <span className={cn(
                  'text-[10px] font-semibold tracking-wide transition-colors duration-300 z-10',
                  isActive ? 'text-primary font-bold' : 'text-muted-foreground group-hover:text-foreground'
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
