import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["technician", "lead", "admin"] },
  { to: "/equipment", label: "Equipment", roles: ["technician", "lead", "admin"] },
  { to: "/maintenance", label: "Maintenance", roles: ["technician", "lead", "admin"] },
  { to: "/scan", label: "Scan QR", roles: ["technician", "lead", "admin"] },
  { to: "/reports", label: "Reports", roles: ["lead", "admin"] },
  { to: "/admin", label: "Admin", roles: ["admin"] },
];

export function Sidebar() {
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-ghana-green">RSIMD-ITEMS</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ghana-green text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">OHCS Ghana</p>
      </div>
    </aside>
  );
}
