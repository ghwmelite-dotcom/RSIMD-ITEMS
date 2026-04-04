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
      <h1 className="text-2xl font-bold text-gray-900">Administration</h1>

      <Card>
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-ghana-green text-ghana-green"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
