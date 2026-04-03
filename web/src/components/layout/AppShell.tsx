import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { ShortcutHelp } from "../ui/ShortcutHelp";
import { LogForm } from "../maintenance/LogForm";
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
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
  );
}
