import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { ShortcutHelp } from "../ui/ShortcutHelp";
import { StaleBanner } from "../ui/StaleBanner";
import { LogForm } from "../maintenance/LogForm";
import { InstallBanner } from "./InstallBanner";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { ReactNode } from "react";

export function AppShell({ children }: { children?: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  useKeyboardShortcuts({
    openNewLog: () => setShowLogForm(true),
    toggleHelp: () => setShowHelp((v) => !v),
  });

  return (
    <>
      <InstallBanner />
      <div className="flex h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          <StaleBanner />
          {children ?? <Outlet />}
        </main>
      </div>
      <BottomNav />
      <ShortcutHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <LogForm
        isOpen={showLogForm}
        onClose={() => setShowLogForm(false)}
        onSaved={() => setShowLogForm(false)}
      />
    </div>
    </>
  );
}
