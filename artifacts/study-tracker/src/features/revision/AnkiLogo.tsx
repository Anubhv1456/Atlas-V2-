import React from 'react';
import { cn } from '@/lib/utils';

interface AnkiIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  variant?: 'solid' | 'badge' | 'icon';
}

/**
 * Official-style Anki Star Logo Icon SVG
 * Crisp, premium vector representation of the Anki blue star flashcard badge.
 */
export function AnkiLogo({ size = 20, className, variant = 'badge', ...props }: AnkiIconProps) {
  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('shrink-0 inline-block align-middle', className)}
        {...props}
      >
        {/* Anki Flashcard Tile */}
        <rect x="2" y="3" width="20" height="18" rx="4" fill="#2563EB" />
        <path
          d="M12 6.5L13.8 10.3L18 10.9L15 13.8L15.7 18L12 16L8.3 18L9 13.8L6 10.9L10.2 10.3L12 6.5Z"
          fill="#FFFFFF"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 inline-block align-middle drop-shadow-xs', className)}
      {...props}
    >
      <defs>
        <linearGradient id="ankiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      {/* Soft outer glow card */}
      <rect x="2" y="2" width="24" height="24" rx="6" fill="url(#ankiGrad)" />
      {/* White flashcard top subtle border */}
      <rect x="2" y="2" width="24" height="24" rx="6" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
      {/* Crisp White Star */}
      <path
        d="M14 6L16.2 10.8L21.5 11.5L17.6 15.2L18.6 20.5L14 18L9.4 20.5L10.4 15.2L6.5 11.5L11.8 10.8L14 6Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/**
 * Anki Badge Button Component for clean, compact UI placements.
 */
interface AnkiBadgeProps {
  label?: string;
  deckName?: string;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  confirmed?: boolean;
  size?: 'sm' | 'md' | 'lg';
  as?: 'button' | 'div';
}

export function AnkiBadge({ label, deckName, onClick, className, confirmed = true, size = 'md', as = 'button' }: AnkiBadgeProps) {
  const sizeClasses = {
    sm: 'text-[11px] sm:text-xs px-2 py-1 gap-1.5 h-7',
    md: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
    lg: 'text-sm px-3.5 py-2 gap-2 h-9',
  }[size];

  const logoSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
  const Component = as === 'div' ? 'div' : 'button';

  return (
    <Component
      {...(as === 'button' ? { type: 'button' as const } : { role: 'button', tabIndex: 0 })}
      onClick={onClick}
      title={deckName ? `Open Anki Deck: ${deckName}` : 'Anki Integration'}
      className={cn(
        'inline-flex items-center font-medium rounded-xl transition-all duration-200 select-none shadow-2xs cursor-pointer shrink-0 whitespace-nowrap',
        confirmed
          ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 active:scale-97'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground border border-border/60 hover:border-blue-500/30',
        sizeClasses,
        className
      )}
    >
      <AnkiLogo size={logoSize} variant="icon" />
      <span className="shrink-0">
        {label ?? (confirmed ? 'Anki' : 'Anki Deck')}
      </span>
    </Component>
  );
}
