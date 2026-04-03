import { useState, useEffect, type FormEvent } from "react";
import { api } from "../../lib/api-client";
import { EQUIPMENT_TYPES, EQUIPMENT_STATUSES, OS_OPTIONS, PROCESSOR_GEN_OPTIONS } from "../../lib/constants";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { useToast } from "../../hooks/useToast";
import type { Equipment, OrgEntity } from "../../types";

interface EquipmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Equipment | null;
}

export function EquipmentForm({ isOpen, onClose, onSaved, editing }: EquipmentFormProps) {
  const { showToast } = useToast();
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [processor, setProcessor] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [orgEntityId, setOrgEntityId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [status, setStatus] = useState("active");
  const [installedDate, setInstalledDate] = useState("");
  const [notes, setNotes] = useState("");
  const [osVersion, setOsVersion] = useState("");
  const [processorGen, setProcessorGen] = useState("");

  useEffect(() => {
    if (isOpen) {
      api.get<OrgEntity[]>("/org-entities").then(setEntities).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setMake(editing.make ?? "");
      setModel(editing.model ?? "");
      setProcessor(editing.processor ?? "");
      setSerialNumber(editing.serial_number ?? "");
      setOrgEntityId(editing.org_entity_id);
      setRoomNumber(editing.room_number ?? "");
      setStatus(editing.status);
      setInstalledDate(editing.installed_date ?? "");
      setNotes(editing.notes ?? "");
      setOsVersion(editing.os_version ?? "");
      setProcessorGen(editing.processor_gen ?? "");
    } else {
      setType("");
      setMake("");
      setModel("");
      setProcessor("");
      setSerialNumber("");
      setOrgEntityId("");
      setRoomNumber("");
      setStatus("active");
      setInstalledDate("");
      setNotes("");
      setOsVersion("");
      setProcessorGen("");
    }
  }, [editing, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type,
        make: make || null,
        model: model || null,
        processor: processor || null,
        serial_number: serialNumber || null,
        org_entity_id: orgEntityId,
        room_number: roomNumber || null,
        status,
        installed_date: installedDate || null,
        notes: notes || null,
        os_version: osVersion || null,
        processor_gen: processorGen || null,
      };

      if (editing) {
        await api.put(`/equipment/${editing.id}`, payload);
        showToast("success", "Equipment updated successfully");
      } else {
        await api.post("/equipment", payload);
        showToast("success", "Equipment registered successfully");
      }
      onSaved();
      onClose();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save equipment");
    } finally {
      setSaving(false);
    }
  };

  const entityOptions = entities.map((e) => ({ value: e.id, label: `${e.code} — ${e.name}` }));
  const typeOptions = EQUIPMENT_TYPES.map((t) => ({ value: t.value, label: t.label }));
  const statusOptions = EQUIPMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit Equipment" : "Register Equipment"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Type"
            options={typeOptions}
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Select type"
            required
          />
          <Input
            label="Make"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="e.g. HP, Dell"
          />
          <Input
            label="Model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. ProBook 450"
          />
          <Input
            label="Processor"
            value={processor}
            onChange={(e) => setProcessor(e.target.value)}
            placeholder="e.g. Intel Core i5"
          />
          <Input
            label="Serial Number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            placeholder="Device serial number"
          />
          <Select
            label="Location"
            options={entityOptions}
            value={orgEntityId}
            onChange={(e) => setOrgEntityId(e.target.value)}
            placeholder="Select location"
            required
          />
          <Input
            label="Room Number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="e.g. 201"
          />
          {editing && (
            <Select
              label="Status"
              options={statusOptions}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
          )}
          <Select
            label="Operating System"
            options={[...OS_OPTIONS]}
            value={osVersion}
            onChange={(e) => setOsVersion(e.target.value)}
            placeholder="Select OS"
          />
          <Select
            label="Processor Generation"
            options={[...PROCESSOR_GEN_OPTIONS]}
            value={processorGen}
            onChange={(e) => setProcessorGen(e.target.value)}
            placeholder="Select processor"
          />
          <Input
            label="Installed Date"
            type="date"
            value={installedDate}
            onChange={(e) => setInstalledDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-ghana-green focus:outline-none focus:ring-1 focus:ring-ghana-green"
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {editing ? "Update" : "Register"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
