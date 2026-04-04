import { useState } from "react";
import { Card } from "../components/ui/Card";
import { OrgEntityManager } from "../components/admin/OrgEntityManager";
import { CategoryManager } from "../components/admin/CategoryManager";
import { TechnicianManager } from "../components/admin/TechnicianManager";
import { TechnicianWorkload } from "../components/admin/TechnicianWorkload";
import { AuditLog } from "../components/admin/AuditLog";
import { BulkImport } from "../components/admin/BulkImport";

const tabs = [
  { key: "entities", label: "Org Entities" },
  { key: "categories", label: "Categories" },
  { key: "technicians", label: "Technicians" },
  { key: "workload", label: "Workload" },
  { key: "audit", label: "Audit Log" },
  { key: "import", label: "Bulk Import" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("entities");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="led led-green" />
        <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
          Administration
        </h1>
      </div>

      <Card padding="sm">
        <div className="border-b border-surface-200 dark:border-surface-700 mb-6">
          <nav className="-mb-px flex gap-1 sm:gap-6 overflow-x-auto pb-px -mb-px scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 font-mono text-xs font-medium border-b-2 transition-colors uppercase tracking-wider whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-neon-green text-neon-green"
                    : "border-transparent text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300 hover:border-surface-400 dark:hover:border-surface-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "entities" && <OrgEntityManager />}
        {activeTab === "categories" && <CategoryManager />}
        {activeTab === "technicians" && <TechnicianManager />}
        {activeTab === "workload" && <TechnicianWorkload />}
        {activeTab === "audit" && <AuditLog />}
        {activeTab === "import" && <BulkImport />}
      </Card>
    </div>
  );
}
