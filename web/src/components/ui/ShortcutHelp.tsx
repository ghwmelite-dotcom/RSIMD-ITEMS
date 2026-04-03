import { Modal } from "./Modal";

interface ShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: "N", description: "New maintenance log" },
  { key: "S", description: "Go to QR scanner" },
  { key: "/", description: "Focus search" },
  { key: "?", description: "Show this help" },
  { key: "Esc", description: "Close modal" },
];

export function ShortcutHelp({ isOpen, onClose }: ShortcutHelpProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-700 dark:text-gray-300">{s.description}</span>
            <kbd className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs font-mono text-gray-700 dark:text-gray-300">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
