import { useAuth } from "../../hooks/useAuth";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

export function Header() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, syncPending } = useOfflineSync();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="lg:hidden">
        <h1 className="text-lg font-bold text-ghana-green">RSIMD-ITEMS</h1>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
        {!isOnline && <Badge variant="red">Offline</Badge>}
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={syncPending}
            className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 hover:bg-yellow-100 transition-colors"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
            {pendingCount} pending
          </button>
        )}
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  );
}
