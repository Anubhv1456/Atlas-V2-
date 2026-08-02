import { createRoot } from 'react-dom/client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { registerSW } from 'virtual:pwa-register';

import App from './App';
import './index.css';

// Diagnostic check for PWA Manifest & iOS icon resource accessibility
async function diagnosePWAManifestAndIcons() {
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  try {
    const manifestRes = await fetch('/manifest.json', { cache: 'no-cache' });
    if (!manifestRes.ok) {
      console.error(
        `[PWA Diagnostic] Manifest load failed with status ${manifestRes.status} (${manifestRes.statusText})` +
        (isIOS ? ' [iOS device]' : '')
      );
      return;
    }

    const manifestData = await manifestRes.json();
    console.log('[PWA Diagnostic] manifest.json loaded successfully:', manifestData?.name || 'Atlas');

    const iconUrls = new Set<string>();
    if (Array.isArray(manifestData?.icons)) {
      manifestData.icons.forEach((icon: { src?: string }) => {
        if (icon.src) iconUrls.add(icon.src);
      });
    }

    if (typeof document !== 'undefined') {
      const appleLinks = document.querySelectorAll('link[rel*="apple-touch-icon"]');
      appleLinks.forEach((link) => {
        const href = link.getAttribute('href');
        if (href) iconUrls.add(href);
      });
    }

    for (const url of iconUrls) {
      try {
        const iconRes = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        if (!iconRes.ok) {
          console.warn(
            `[PWA Diagnostic] Icon load failed for ${url} (HTTP ${iconRes.status})` +
            (isIOS ? ' [Target: iOS Home Screen]' : '')
          );
        } else {
          console.log(`[PWA Diagnostic] Verified icon resource: ${url}`);
        }
      } catch (iconErr) {
        console.error(
          `[PWA Diagnostic] Network error fetching icon ${url}:`,
          iconErr,
          isIOS ? ' [Target: iOS Home Screen]' : ''
        );
      }
    }
  } catch (err) {
    console.error(
      '[PWA Diagnostic] Manifest load failed during diagnostic fetch:',
      err,
      isIOS ? ' [iOS device target]' : ''
    );
  }
}

// Trigger diagnostic check during initial load & SW registration
if (typeof window !== 'undefined') {
  diagnosePWAManifestAndIcons();
}

// Register PWA service worker with auto-update in production builds
if (import.meta.env.PROD) {
  try {
    registerSW({
      immediate: true,
      onRegisteredSW(swScriptUrl, registration) {
        console.log('[PWA Diagnostic] Service worker registered successfully at:', swScriptUrl);
        diagnosePWAManifestAndIcons();
      },
      onRegisterError(error) {
        console.warn('[PWA Diagnostic] PWA service worker registration error:', error);
      },
    });
  } catch (err) {
    console.warn('[PWA Diagnostic] PWA registerSW call failed:', err);
  }
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: 'sans-serif' }}>
          <h2>Application Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
