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
  getPendingPhotos,
  clearPendingPhotos,
  type PendingLog,
} from "../lib/offline-store";

const LAST_SYNC_KEY = "rsimd_items_last_sync";
const RETRY_DELAYS = [30_000, 60_000, 120_000]; // 30s, 60s, 120s

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
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
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(
    () => localStorage.getItem(LAST_SYNC_KEY)
  );
  const syncing = useRef(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Clear retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
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
      // 1. Upload pending photos first (best-effort)
      try {
        const photos = await getPendingPhotos();
        if (photos.length > 0) {
          const token = localStorage.getItem("rsimd_items_token");
          const apiBase = import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL + "/api"
            : "/api";

          for (const photo of photos) {
            try {
              // Convert base64 data URL to Blob
              const res = await fetch(photo.data);
              const blob = await res.blob();
              const formData = new FormData();
              formData.append("file", blob, photo.fileName);

              await fetch(`${apiBase}/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              });
            } catch {
              // Photo upload is best-effort; continue with remaining photos
            }
          }
          await clearPendingPhotos();
        }
      } catch {
        // Photo sync failure should not block log sync
      }

      // 2. Sync pending logs
      const logs = await getPendingLogs();
      if (logs.length === 0) {
        // Nothing to sync but mark success
        const now = new Date().toISOString();
        setLastSyncAt(now);
        localStorage.setItem(LAST_SYNC_KEY, now);
        retryCount.current = 0;
        return;
      }

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

      const now = new Date().toISOString();
      setLastSyncAt(now);
      localStorage.setItem(LAST_SYNC_KEY, now);
      retryCount.current = 0;
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }

      showToast("success", `Synced ${logs.length} offline log(s)`);
    } catch {
      // Schedule retry with exponential backoff
      if (retryCount.current < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount.current]!;
        retryCount.current += 1;
        showToast(
          "error",
          `Sync failed — retrying in ${delay / 1000}s (attempt ${retryCount.current}/${RETRY_DELAYS.length})`
        );
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          if (navigator.onLine) {
            syncPending();
          }
        }, delay);
      } else {
        showToast("error", "Sync failed — will retry when back online");
        retryCount.current = 0;
      }
    } finally {
      syncing.current = false;
      setIsSyncing(false);
    }
  }, [showToast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      retryCount.current = 0; // Reset retries on fresh reconnect
      syncPending();
    }
  }, [isOnline, pendingCount, syncPending]);

  return (
    <OfflineContext.Provider
      value={{ isOnline, pendingCount, isSyncing, lastSyncAt, saveOfflineLog, syncPending }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
