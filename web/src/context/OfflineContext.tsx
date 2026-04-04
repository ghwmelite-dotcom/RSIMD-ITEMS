import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api-client";
import {
  savePendingLog as dbSave,
  getPendingLogs,
  clearPendingLogs,
  getPendingCount,
  type PendingLog,
} from "../lib/offline-store";

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  saveOfflineLog: (
    log: Omit<PendingLog, "id" | "created_at">
  ) => Promise<void>;
  syncPending: () => Promise<void>;
}

export const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncing = useRef(false);
  const { showToast } = useToast();

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Load pending count on mount
  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {});
  }, []);

  const saveOfflineLog = useCallback(
    async (log: Omit<PendingLog, "id" | "created_at">) => {
      const pending: PendingLog = {
        ...log,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      await dbSave(pending);
      const count = await getPendingCount();
      setPendingCount(count);
      showToast("info", "Saved offline — will sync when back online");
    },
    [showToast]
  );

  const syncPending = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    setIsSyncing(true);
    try {
      const logs = await getPendingLogs();
      if (logs.length === 0) return;

      const payload = logs.map((l) => ({
        equipment_id: l.equipment_id,
        org_entity_id: l.org_entity_id,
        maintenance_type: l.maintenance_type,
        category_id: l.category_id,
        room_number: l.room_number,
        description: l.description,
        resolution: l.resolution,
        status: l.status,
        logged_date: l.logged_date,
      }));

      await api.post<{ synced_count: number; errors: unknown[] }>(
        "/maintenance/bulk-sync",
        { logs: payload }
      );

      await clearPendingLogs();
      setPendingCount(0);
      showToast("success", `Synced ${logs.length} offline log(s)`);
    } catch {
      showToast("error", "Sync failed — will retry when online");
    } finally {
      syncing.current = false;
      setIsSyncing(false);
    }
  }, [showToast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPending();
    }
  }, [isOnline, pendingCount, syncPending]);

  return (
    <OfflineContext.Provider
      value={{ isOnline, pendingCount, isSyncing, saveOfflineLog, syncPending }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
