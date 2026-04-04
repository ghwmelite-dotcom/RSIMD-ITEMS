import { useState, useEffect, type FormEvent } from "react";
import { api } from "../../lib/api-client";
import { MAINTENANCE_TYPES } from "../../lib/constants";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../../hooks/useToast";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { VoiceInput } from "./VoiceInput";
import { PhotoCapture } from "./PhotoCapture";
import type { OrgEntity, MaintenanceCategory, MaintenanceLog } from "../../types";

interface LogFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  prefill?: {
    equipment_id?: string;
    org_entity_id?: string;
    room_number?: string;
  };
}

export function LogForm({ isOpen, onClose, onSaved, prefill }: LogFormProps) {
  const { showToast } = useToast();
  const { isOnline, pendingCount, saveOfflineLog } = useOfflineSync();
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastLog, setLastLog] = useState<MaintenanceLog | null>(null);

  const [orgEntityId, setOrgEntityId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [resolution, setResolution] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get<OrgEntity[]>("/org-entities"),
        api.get<MaintenanceCategory[]>("/categories"),
      ])
        .then(([ents, cats]) => {
          setEntities(ents);
          setCategories(cats);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && prefill) {
      setOrgEntityId(prefill.org_entity_id ?? "");
      setRoomNumber(prefill.room_number ?? "");
    }
    if (isOpen && !prefill) {
      setOrgEntityId("");
      setMaintenanceType("");
      setCategoryId("");
      setRoomNumber("");
      setDate(new Date().toISOString().slice(0, 10));
      setDescription("");
      setResolution("");
      setPhotoUrls([]);
    }
  }, [isOpen, prefill]);

  useEffect(() => {
    if (isOpen && prefill?.equipment_id) {
      api.get<MaintenanceLog[]>(`/maintenance?equipment_id=${prefill.equipment_id}`)
        .then((logs) => setLastLog(logs.length > 0 ? logs[0]! : null))
        .catch(() => {});
    } else {
      setLastLog(null);
    }
  }, [isOpen, prefill?.equipment_id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!isOnline) {
        await saveOfflineLog({
          equipment_id: prefill?.equipment_id ?? null,
          org_entity_id: orgEntityId,
          maintenance_type: maintenanceType,
          category_id: categoryId || null,
          room_number: roomNumber || null,
          description,
          resolution: resolution || null,
          status: "completed",
          logged_date: date,
        });
        onSaved();
        onClose();
        return;
      }
      await api.post("/maintenance", {
        equipment_id: prefill?.equipment_id || null,
        org_entity_id: orgEntityId,
        maintenance_type: maintenanceType,
        category_id: categoryId || null,
        room_number: roomNumber || null,
        logged_date: date,
        description,
        resolution: resolution || null,
        photo_urls: photoUrls,
      });
      showToast("success", "Maintenance log created successfully");
      onSaved();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to create maintenance log");
    } finally {
      setSaving(false);
    }
  };

  const entityOptions = entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }));
  const typeOptions = MAINTENANCE_TYPES.map((t) => ({ value: t.value, label: t.label }));
  const categoryOptions = categories
    .filter((c) => c.is_active)
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Maintenance Activity" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isOnline && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2 text-sm text-yellow-800 dark:text-yellow-300">
            You're offline — this log will sync when you reconnect
            {pendingCount > 0 && <span className="ml-1">({pendingCount} pending)</span>}
          </div>
        )}

        {lastLog && (
          <button
            type="button"
            onClick={() => {
              setMaintenanceType(lastLog.maintenance_type);
              setCategoryId(lastLog.category_id ?? "");
              setDescription(lastLog.description);
              setResolution(lastLog.resolution ?? "");
              showToast("info", "Filled from previous log");
            }}
            className="text-sm text-ghana-green hover:underline font-medium"
          >
            ↩ Repeat last: {lastLog.description.slice(0, 50)}...
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Location"
            options={entityOptions}
            value={orgEntityId}
            onChange={(e) => setOrgEntityId(e.target.value)}
            placeholder="Select location"
            required
          />
          <Select
            label="Maintenance Type"
            options={typeOptions}
            value={maintenanceType}
            onChange={(e) => setMaintenanceType(e.target.value)}
            placeholder="Select type"
            required
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="Select category"
          />
          <Input
            label="Room Number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="e.g. 201"
          />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-ghana-red">*</span>
            </label>
            <VoiceInput onTranscript={(text) => setDescription((prev) => prev + (prev ? " " : "") + text)} />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
            placeholder="Describe the maintenance activity..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution</label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={2}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
            placeholder="Resolution or outcome..."
          />
        </div>

        <PhotoCapture photoUrls={photoUrls} onPhotosChange={setPhotoUrls} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving} variant={isOnline ? "primary" : "secondary"}>
            {isOnline ? "Log Activity" : "Save Offline"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
