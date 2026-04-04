import { useState, useEffect } from "react";
import { useOfflineSync } from "../../hooks/useOfflineSync";

export function StaleBanner() {
  const { isOnline, lastSyncAt } = useOfflineSync();
  const [, setTick] = useState(0);

  // Re-render every 60s so the "time ago" stays current
  useEffect(() => {
    if (isOnline) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [isOnline]);

  if (isOnline) return null;
  if (!lastSyncAt) return null;

  const syncDate = new Date(lastSyncAt);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let timeAgo: string;
  if (diffMins < 1) timeAgo = "just now";
  else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
  else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h ago`;
  else timeAgo = `${Math.floor(diffMins / 1440)}d ago`;

  return (
    <div className="bg-neon-amber/5 border-b border-neon-amber/20 px-4 py-1.5 text-center">
      <span className="font-mono text-[10px] text-neon-amber uppercase tracking-wider">
        Offline — showing cached data from {timeAgo}
      </span>
    </div>
  );
}
