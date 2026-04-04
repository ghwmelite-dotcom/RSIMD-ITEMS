import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "rsimd_install_dismissed";

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "true",
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 1024);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
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

  if (!deferredPrompt || dismissed || !isMobile) return null;

  return (
    <div className="bg-ghana-green text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Install RSIMD-ITEMS</p>
        <p className="text-xs opacity-80">
          Add to home screen for quick access
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="text-xs opacity-70 hover:opacity-100"
        >
          Not now
        </button>
        <Button size="sm" variant="secondary" onClick={handleInstall}>
          Install
        </Button>
      </div>
    </div>
  );
}
