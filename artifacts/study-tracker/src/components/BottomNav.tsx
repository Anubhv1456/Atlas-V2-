import { Link, useLocation } from 'wouter';
import { Home, CalendarDays, BarChart3, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md h-16 rounded-full border border-border/80 bg-background/80 dark:bg-card/85 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.45)] px-2 py-1.5 flex items-center justify-around transition-all duration-300">
      <div className="relative w-full flex items-center justify-around gap-1">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center h-12 flex-1 group rounded-full py-1 px-2 transition-colors duration-200 cursor-pointer select-none",
                isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active Sliding Glowing Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeNavPill"
                  className="absolute inset-0 bg-primary/15 dark:bg-primary/22 rounded-full border border-primary/35 shadow-[0_2px_14px_rgba(31,168,155,0.22)]"
                  transition={{
                    type: "spring",
                    stiffness: 520,
                    damping: 38,
                    mass: 0.5
                  }}
                />
              )}

              <div className="z-10 flex flex-col items-center justify-center gap-0.5">
                <Icon className={cn(
                  "w-5 h-5 transition-all duration-150",
                  isActive ? "text-primary scale-105" : "text-muted-foreground group-hover:text-foreground"
                )} />

                <span className={cn(
                  "text-[10px] font-medium tracking-tight transition-colors duration-150 mt-0.5",
                  isActive ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


