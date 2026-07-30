import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateGraphicProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStateGraphic({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateGraphicProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 backdrop-blur-xs relative overflow-hidden',
        className
      )}
    >
      {/* Background ambient decorative glow circles */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Layered Icon Vector Graphic */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Outer glowing halo */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner animate-pulse-subtle">
          {/* Inner elevated icon container */}
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-card border border-border/80 shadow-md flex items-center justify-center text-primary transform hover:scale-105 transition-transform duration-300">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
        </div>

        {/* Orbiting accent dot */}
        <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm" />
      </div>

      {/* Title & Description */}
      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed mb-5">
        {description}
      </p>

      {/* Optional CTA Action Button */}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
