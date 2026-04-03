import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="lg:hidden">
        <h1 className="text-lg font-bold text-ghana-green">RSIMD-ITEMS</h1>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-4">
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
