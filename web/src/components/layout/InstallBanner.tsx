import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "rsimd_install_dismissed";

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window) && /Safari/.test(ua);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone);
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");

  useEffect(() => {
    // Already installed as PWA
    if (isStandalone()) return;

    // Chrome/Edge: capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari: show manual instructions
    if (isIOSSafari()) {
      setShowIOSGuide(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }, []);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIOSGuide) return null;

  return (
    <div className="bg-surface-900 border-b border-neon-green/20 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div>
          <p className="font-mono text-xs font-semibold text-neon-green uppercase tracking-wider">Install RSIMD-ITEMS</p>
          {showIOSGuide ? (
            <p className="text-[11px] text-surface-400">
              Tap <span className="inline-block align-middle">
                <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/></svg>
              </span> then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-[11px] text-surface-400">Add to home screen for quick access & offline use</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="font-mono text-[10px] text-surface-500 hover:text-surface-300 uppercase tracking-wider"
        >
          Later
        </button>
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="font-mono text-[10px] font-semibold text-surface-950 bg-neon-green px-3 py-1.5 rounded-lg uppercase tracking-wider hover:shadow-neon-green transition-all"
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
