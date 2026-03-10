import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isStandalone()) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    if (isIOS()) {
      // iOS doesn't fire beforeinstallprompt — show manual instructions
      const timer = setTimeout(() => setShowIOSPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    function handlePrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    dismiss();
  }

  if (dismissed || isStandalone()) return null;

  // Android / Chrome install prompt
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80">
        <div className="flex items-start gap-3 rounded-xl border border-brand-500/30 bg-[var(--color-bg)] p-4 shadow-lg">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/15">
            <Download className="h-5 w-5 text-brand-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-text)]">Install LiftHub</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Add to your home screen for the best experience.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Install
              </button>
              <button
                onClick={dismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={dismiss} className="shrink-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS install instructions
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80">
        <div className="flex items-start gap-3 rounded-xl border border-brand-500/30 bg-[var(--color-bg)] p-4 shadow-lg">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/15">
            <Share className="h-5 w-5 text-brand-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-text)]">Install LiftHub</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
              Tap the share button in Safari, then select <strong>"Add to Home Screen"</strong>.
            </p>
            <button
              onClick={dismiss}
              className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              Dismiss
            </button>
          </div>
          <button onClick={dismiss} className="shrink-0 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
