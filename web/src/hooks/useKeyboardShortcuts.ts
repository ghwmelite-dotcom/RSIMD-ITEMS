import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ShortcutActions {
  openNewLog: () => void;
  toggleHelp: () => void;
}

export function useKeyboardShortcuts(actions: ShortcutActions) {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) return;

    switch (e.key) {
      case "n":
        e.preventDefault();
        actions.openNewLog();
        break;
      case "s":
        e.preventDefault();
        navigate("/scan");
        break;
      case "/":
        e.preventDefault();
        document.querySelector<HTMLInputElement>("input[placeholder*='Search']")?.focus();
        break;
      case "?":
        e.preventDefault();
        actions.toggleHelp();
        break;
    }
  }, [navigate, actions]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
