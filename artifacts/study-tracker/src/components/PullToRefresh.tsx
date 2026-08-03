import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { CloudDownload, Loader2 } from 'lucide-react';

export function PullToRefresh({ 
  onRefresh, 
  children 
}: { 
  onRefresh: () => Promise<void>; 
  children: React.ReactNode;
}) {
  const [startY, setStartY] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentY = useRef(0);
  const THRESHOLD = 100;
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 5) return;
    setStartY(e.touches[0].clientY);
    setPulling(true);
    currentY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pulling || refreshing) return;
    const y = e.touches[0].clientY;
    const dy = y - startY;
    
    if (dy > 0 && window.scrollY <= 5) {
      const visualPull = Math.min(dy * 0.4, THRESHOLD + 20);
      currentY.current = visualPull;
      controls.set({ y: visualPull });
    } else if (dy < 0) {
      setPulling(false);
      currentY.current = 0;
      controls.set({ y: 0 });
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling || refreshing) return;
    setPulling(false);
    
    if (currentY.current >= THRESHOLD) {
      setRefreshing(true);
      controls.start({ y: 60 });
      try {
        await onRefresh();
      } finally {
        controls.start({ y: 0 });
        setRefreshing(false);
        currentY.current = 0;
      }
    } else {
      controls.start({ y: 0 });
      currentY.current = 0;
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const handleNativeTouchMove = (e: TouchEvent) => {
      if (!pulling || refreshing) return;
      const y = e.touches[0].clientY;
      const dy = y - startY;
      if (dy > 0 && window.scrollY <= 5) {
        if (e.cancelable) e.preventDefault();
      }
    };
    
    el.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', handleNativeTouchMove);
  }, [pulling, refreshing, startY]);

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full min-h-[100dvh]"
    >
      <motion.div 
        animate={controls}
        initial={{ y: 0 }}
        className="absolute left-0 right-0 top-[-60px] flex justify-center z-50 pointer-events-none"
      >
        <div className="bg-background rounded-full p-3 shadow-md border border-border flex items-center justify-center">
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <CloudDownload className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </motion.div>
      <motion.div 
        animate={controls} 
        initial={{ y: 0 }}
        className="w-full h-full relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
