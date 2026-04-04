import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  roles: string[];
  icon: string;
  tag?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", roles: ["technician", "lead", "admin"], icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", tag: "SYS" },
  { to: "/equipment", label: "Equipment", roles: ["technician", "lead", "admin"], icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z", tag: "REG" },
  { to: "/maintenance", label: "Maintenance", roles: ["technician", "lead", "admin"], icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z", tag: "LOG" },
  { to: "/scan", label: "Scan QR", roles: ["technician", "lead", "admin"], icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z", tag: "QR" },
  { to: "/reports", label: "Reports", roles: ["lead", "admin"], icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", tag: "RPT" },
  { to: "/admin", label: "Admin", roles: ["admin"], icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", tag: "CFG" },
];

export function Sidebar() {
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-surface-950 border-r border-surface-800/30 relative overflow-hidden">
      {/* Circuit background */}
      <div className="absolute inset-0 bg-circuit-pattern opacity-40 pointer-events-none" />
      <div className="absolute inset-0 scanline pointer-events-none" />

      {/* Logo */}
      <div className="relative h-16 flex items-center px-5 border-b border-surface-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-neon-green/20 bg-neon-green/5 flex items-center justify-center animate-glow-pulse">
            <svg className="w-4 h-4 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-sm font-bold text-surface-100 tracking-wider uppercase">RSIMD-ITEMS</h1>
            <p className="font-mono text-[9px] text-neon-green/50 tracking-widest">OHCS // GHANA</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 font-mono text-[9px] text-surface-600 uppercase tracking-[0.2em]">Navigation</p>
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-neon-green/10 text-neon-green border-l-2 border-neon-green shadow-neon-green"
                  : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/30 border-l-2 border-transparent"
              }`
            }
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <span className="flex-1">{item.label}</span>
            <span className="font-mono text-[9px] opacity-40 group-hover:opacity-70 transition-opacity">
              {item.tag}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Footer status */}
      <div className="relative px-5 py-4 border-t border-surface-800/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="led led-green" />
          <span className="font-mono text-[10px] text-surface-500">System Online</span>
        </div>
        <p className="font-mono text-[9px] text-surface-600">OHCS-NET // {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
