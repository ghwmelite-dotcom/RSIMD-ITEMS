import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api-client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import type { OrgEntity, MaintenanceCategory } from "../types";
import { MAINTENANCE_TYPES } from "../lib/constants";

interface ChecklistItem {
  category: MaintenanceCategory;
  checked: boolean;
  count: string;
  notes: string;
}

interface EquipmentEntry {
  assetTag: string;
  type: string;
  status: string;
  notes: string;
}

export function FieldLogPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isOnline, saveOfflineLog } = useOfflineSync();
  const navigate = useNavigate();

  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [orgEntityId, setOrgEntityId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("routine");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [equipmentEntries, setEquipmentEntries] = useState<EquipmentEntry[]>([
    { assetTag: "", type: "", status: "", notes: "" },
    { assetTag: "", type: "", status: "", notes: "" },
    { assetTag: "", type: "", status: "", notes: "" },
  ]);
  const [description, setDescription] = useState("");
  const [challenges, setChallenges] = useState("");

  // Load reference data
  useEffect(() => {
    Promise.all([
      api.get<OrgEntity[]>("/org-entities"),
      api.get<MaintenanceCategory[]>("/categories"),
    ])
      .then(([ent, cat]) => {
        setEntities(ent);
        setCategories(cat);
        setChecklist(cat.filter((c) => c.is_active).map((c) => ({
          category: c,
          checked: false,
          count: "",
          notes: "",
        })));
      })
      .catch(() => showToast("error", "Failed to load data"))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  function updateChecklist(index: number, field: keyof ChecklistItem, value: string | boolean) {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function updateEquipment(index: number, field: keyof EquipmentEntry, value: string) {
    setEquipmentEntries((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addEquipmentRow() {
    setEquipmentEntries((prev) => [...prev, { assetTag: "", type: "", status: "", notes: "" }]);
  }

  async function handleSubmit() {
    if (!orgEntityId) { showToast("error", "Please select a location"); return; }

    const checkedItems = checklist.filter((item) => item.checked);
    if (checkedItems.length === 0 && !description.trim()) {
      showToast("error", "Please check at least one issue or add a description");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create one log per checked category
      const logs = checkedItems.map((item) => ({
        org_entity_id: orgEntityId,
        maintenance_type: maintenanceType,
        category_id: item.category.id,
        room_number: roomNumber || null,
        description: `${item.category.name}${item.count ? ` (${item.count} issues)` : ""}${item.notes ? ` — ${item.notes}` : ""}`,
        resolution: item.notes || null,
        logged_date: date,
      }));

      // If there's a general description not tied to a category, add it too
      if (description.trim() && checkedItems.length === 0) {
        logs.push({
          org_entity_id: orgEntityId,
          maintenance_type: maintenanceType,
          category_id: null as unknown as string,
          room_number: roomNumber || null,
          description: description.trim(),
          resolution: null,
          logged_date: date,
        });
      }

      if (isOnline) {
        // Bulk sync all logs
        const result = await api.post<{ synced_count: number; errors: unknown[] }>(
          "/maintenance/bulk-sync",
          { logs }
        );
        showToast("success", `${result.synced_count} maintenance log${result.synced_count > 1 ? "s" : ""} submitted`);
      } else {
        // Save each log offline
        for (const log of logs) {
          await saveOfflineLog({
            equipment_id: null,
            org_entity_id: log.org_entity_id,
            maintenance_type: log.maintenance_type,
            category_id: log.category_id,
            room_number: log.room_number,
            description: log.description,
            resolution: log.resolution,
            status: "completed",
            logged_date: log.logged_date,
          });
        }
        showToast("info", `${logs.length} log${logs.length > 1 ? "s" : ""} saved offline`);
      }

      setSubmitted(true);
    } catch {
      showToast("error", "Failed to submit logs");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setOrgEntityId("");
    setRoomNumber("");
    setMaintenanceType("routine");
    setChecklist((prev) => prev.map((item) => ({ ...item, checked: false, count: "", notes: "" })));
    setEquipmentEntries([
      { assetTag: "", type: "", status: "", notes: "" },
      { assetTag: "", type: "", status: "", notes: "" },
      { assetTag: "", type: "", status: "", notes: "" },
    ]);
    setDescription("");
    setChallenges("");
    setSubmitted(false);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
        <span className="font-mono text-xs text-surface-500">Loading form...</span>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <Card className="py-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-2">Submitted</h2>
          <p className="text-sm text-surface-500 mb-6">
            {isOnline ? "Logs saved to system." : "Logs saved offline — will sync when connected."}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={handleReset}>New Location</Button>
            <Button onClick={() => navigate("/maintenance")}>View Logs</Button>
          </div>
        </Card>
      </div>
    );
  }

  const entityOptions = entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }));
  const typeOptions = MAINTENANCE_TYPES.map((t) => ({ value: t.value, label: t.label }));
  const checkedCount = checklist.filter((i) => i.checked).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="led led-green" />
            <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">Field Maintenance Log</h1>
          </div>
          <p className="text-xs text-surface-500 mt-1">Fill in findings during your maintenance exercise</p>
        </div>
        <a
          href="/field-form"
          target="_blank"
          className="font-mono text-[10px] text-surface-400 hover:text-neon-green uppercase tracking-wider transition-colors"
        >
          Print version →
        </a>
      </div>

      {/* Technician + Date */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Technician" value={user?.name ?? ""} disabled />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <Select label="Maintenance Type" options={typeOptions} value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value)} />
        </div>
      </Card>

      {/* Location */}
      <Card>
        <h3 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider mb-3">Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Directorate / Unit" options={entityOptions} value={orgEntityId} onChange={(e) => setOrgEntityId(e.target.value)} placeholder="Select location" required />
          <Input label="Room Number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 24" />
        </div>
      </Card>

      {/* Issue Checklist */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider">Issue Checklist</h3>
          {checkedCount > 0 && (
            <span className="font-mono text-[10px] text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-full">
              {checkedCount} selected
            </span>
          )}
        </div>
        <div className="space-y-1">
          {checklist.map((item, i) => (
            <div
              key={item.category.id}
              className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                item.checked ? "bg-neon-green/5 border border-neon-green/15" : "hover:bg-surface-50 dark:hover:bg-surface-800/30 border border-transparent"
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => updateChecklist(i, "checked", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-surface-300 dark:border-surface-600 accent-neon-green"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-surface-800 dark:text-surface-200">{item.category.name}</span>
                {item.checked && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Count"
                      value={item.count}
                      onChange={(e) => updateChecklist(i, "count", e.target.value)}
                      className="w-20 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-2 py-1 text-xs font-mono text-surface-900 dark:text-surface-100 focus:border-neon-green/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Action taken / resolution"
                      value={item.notes}
                      onChange={(e) => updateChecklist(i, "notes", e.target.value)}
                      className="flex-1 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-2 py-1 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-neon-green/40 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Equipment Inspected */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider">Equipment Inspected</h3>
          <button onClick={addEquipmentRow} className="font-mono text-[10px] text-neon-green hover:underline uppercase tracking-wider">
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                <th className="px-2 py-1.5 font-mono text-[10px] text-surface-500 uppercase tracking-wider">Asset Tag / QR</th>
                <th className="px-2 py-1.5 font-mono text-[10px] text-surface-500 uppercase tracking-wider">Type</th>
                <th className="px-2 py-1.5 font-mono text-[10px] text-surface-500 uppercase tracking-wider">Status</th>
                <th className="px-2 py-1.5 font-mono text-[10px] text-surface-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {equipmentEntries.map((entry, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={entry.assetTag}
                      onChange={(e) => updateEquipment(i, "assetTag", e.target.value)}
                      placeholder="OHCS-DES-..."
                      className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded px-2 py-1.5 font-mono text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-neon-green/40 focus:outline-none"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={entry.type}
                      onChange={(e) => updateEquipment(i, "type", e.target.value)}
                      className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100 focus:border-neon-green/40 focus:outline-none"
                    >
                      <option value="">—</option>
                      <option value="desktop">Desktop</option>
                      <option value="laptop">Laptop</option>
                      <option value="printer">Printer</option>
                      <option value="router">Router</option>
                      <option value="switch">Switch</option>
                      <option value="cctv">CCTV</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={entry.status}
                      onChange={(e) => updateEquipment(i, "status", e.target.value)}
                      className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100 focus:border-neon-green/40 focus:outline-none"
                    >
                      <option value="">—</option>
                      <option value="active">Active</option>
                      <option value="faulty">Faulty</option>
                      <option value="under_repair">Under Repair</option>
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={(e) => updateEquipment(i, "notes", e.target.value)}
                      placeholder="Notes..."
                      className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded px-2 py-1.5 text-xs text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-neon-green/40 focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Description + Challenges */}
      <Card>
        <h3 className="font-mono text-xs font-bold text-surface-500 uppercase tracking-wider mb-3">Additional Notes</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Detailed Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe additional activities not covered by the checklist..."
              className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-neon-green/40 focus:outline-none focus:ring-1 focus:ring-neon-green/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Challenges / Issues Observed</label>
            <textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              rows={2}
              placeholder="Any challenges encountered..."
              className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:border-neon-green/40 focus:outline-none focus:ring-1 focus:ring-neon-green/20"
            />
          </div>
        </div>
      </Card>

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-neon-amber/5 border border-neon-amber/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="led led-amber" />
          <span className="font-mono text-xs text-neon-amber">Offline — logs will sync when you reconnect</span>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between pb-6">
        <p className="font-mono text-[10px] text-surface-500">
          {checkedCount > 0 ? `${checkedCount} issue${checkedCount > 1 ? "s" : ""} will create ${checkedCount} log${checkedCount > 1 ? "s" : ""}` : "Check issues above to submit"}
        </p>
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          disabled={!orgEntityId || (checkedCount === 0 && !description.trim())}
        >
          {isOnline ? `Submit ${checkedCount || ""} Log${checkedCount > 1 ? "s" : ""}` : `Save Offline`}
        </Button>
      </div>
    </div>
  );
}
