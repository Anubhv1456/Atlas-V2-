import { useState, useEffect, useCallback } from 'react';
import { isPwaInstallable, promptPwaInstall } from '@/lib/pwaAndNotifications';

export function usePWA() {
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(isPwaInstallable());
  const [showInstallGuideModal, setShowInstallGuideModal] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(
    typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)
  );

  useEffect(() => {
    const handlePwaAvail = () => setCanInstallPwa(true);
    window.addEventListener('pwa-install-available', handlePwaAvail);
    return () => window.removeEventListener('pwa-install-available', handlePwaAvail);
  }, []);

  const handlePwaInstallClick = useCallback(async () => {
    if (canInstallPwa) {
      await promptPwaInstall();
    } else {
      setShowInstallGuideModal(true);
    }
  }, [canInstallPwa]);

  return { 
    canInstallPwa, 
    showInstallGuideModal, 
    setShowInstallGuideModal, 
    isStandalone, 
    handlePwaInstallClick 
  };
}
