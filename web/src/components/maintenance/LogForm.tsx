import { useState, useEffect, type FormEvent } from "react";
import { api } from "../../lib/api-client";
import { MAINTENANCE_TYPES } from "../../lib/constants";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../../hooks/useToast";
import type { OrgEntity, MaintenanceCategory } from "../../types";

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
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [saving, setSaving] = useState(false);

  const [orgEntityId, setOrgEntityId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [resolution, setResolution] = useState("");

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
    }
  }, [isOpen, prefill]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/maintenance", {
        equipment_id: prefill?.equipment_id || null,
        org_entity_id: orgEntityId,
        maintenance_type: maintenanceType,
        category_id: categoryId || null,
        room_number: roomNumber || null,
        logged_date: date,
        description,
        resolution: resolution || null,
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-ghana-red">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
            placeholder="Describe the maintenance activity..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={2}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
            placeholder="Resolution or outcome..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Log Activity
          </Button>
        </div>
      </form>
    </Modal>
  );
}
