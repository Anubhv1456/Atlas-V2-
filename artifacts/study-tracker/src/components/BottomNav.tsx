import { Link, useLocation } from 'wouter';
import { Home, CheckSquare, CalendarDays, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const [location] = useLocation();

  const links = [
    { href: '/',         icon: Home,          label: 'Home'     },
    { href: '/today',    icon: CheckSquare,    label: 'Today'    },
    { href: '/timeline', icon: CalendarDays,   label: 'Timeline' },
    { href: '/settings', icon: Settings,       label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border pb-safe pt-2 px-4 md:sticky md:top-0 md:h-screen md:w-20 md:border-r md:border-t-0 md:flex-col md:px-0 md:pt-8 md:bg-background">
      <div className="flex justify-around items-center h-14 max-w-md mx-auto md:flex-col md:h-full md:justify-start md:gap-8">
        {links.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href} className="w-full">
              <div
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors md:w-14 md:h-14 md:rounded-2xl hover:text-primary',
                  isActive && 'text-primary md:bg-primary/10',
                )}
              >
                <Icon className={cn('w-6 h-6', isActive && 'fill-primary/20 stroke-[2.5]')} />
                <span className="text-[10px] font-medium md:hidden">{label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
