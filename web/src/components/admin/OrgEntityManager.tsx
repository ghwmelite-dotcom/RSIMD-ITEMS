import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { exportToCsv } from "../../lib/export-csv";
import { useToast } from "../../hooks/useToast";
import { Table } from "../ui/Table";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import type { OrgEntity } from "../../types";

interface OrgEntityForm {
  name: string;
  code: string;
  type: "directorate" | "unit" | "secretariat";
  rooms: string;
}

const emptyForm: OrgEntityForm = { name: "", code: "", type: "directorate", rooms: "" };

const typeOptions = [
  { value: "directorate", label: "Directorate" },
  { value: "unit", label: "Unit" },
  { value: "secretariat", label: "Secretariat" },
];

export function OrgEntityManager() {
  const { showToast } = useToast();
  const [entities, setEntities] = useState<OrgEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrgEntityForm>(emptyForm);

  const loadEntities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<OrgEntity[]>("/org-entities");
      setEntities(data);
    } catch {
      showToast("error", "Failed to load org entities");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (entity: OrgEntity) => {
    setForm({
      name: entity.name,
      code: entity.code,
      type: entity.type,
      rooms: entity.rooms.join(", "),
    });
    setEditingId(entity.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      type: form.type,
      rooms: form.rooms
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    };
    try {
      if (editingId) {
        await api.put(`/org-entities/${editingId}`, payload);
        showToast("success", "Entity updated successfully");
      } else {
        await api.post("/org-entities", payload);
        showToast("success", "Entity created successfully");
      }
      closeModal();
      await loadEntities();
    } catch {
      showToast("error", editingId ? "Failed to update entity" : "Failed to create entity");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entity: OrgEntity) => {
    if (!window.confirm(`Delete "${entity.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/org-entities/${entity.id}`);
      showToast("success", "Entity deleted successfully");
      await loadEntities();
    } catch {
      showToast("error", "Failed to delete entity");
    }
  };

  type Row = Record<string, unknown>;

  const columns = [
    { key: "code", header: "Code" },
    { key: "name", header: "Name" },
    {
      key: "type",
      header: "Type",
      render: (row: Row) => {
        const entity = row as unknown as OrgEntity;
        return (
          <Badge variant={entity.type === "directorate" ? "green" : "gray"}>
            {entity.type}
          </Badge>
        );
      },
    },
    {
      key: "rooms",
      header: "Rooms",
      render: (row: Row) => {
        const entity = row as unknown as OrgEntity;
        return entity.rooms.join(", ") || "-";
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Row) => {
        const entity = row as unknown as OrgEntity;
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => openEdit(entity)}>
              Edit
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDelete(entity)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Org Entities</h3>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const exportData = entities.map((e) => ({
                code: e.code,
                name: e.name,
                type: e.type,
                rooms: e.rooms.join(", "),
              }));
              exportToCsv("org-entities", [
                { key: "code", header: "Code" },
                { key: "name", header: "Name" },
                { key: "type", header: "Type" },
                { key: "rooms", header: "Rooms" },
              ], exportData);
            }}
          >
            Export CSV
          </Button>
          <Button onClick={openCreate}>Add Entity</Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={entities as unknown as Record<string, unknown>[]}
        keyField="id"
        emptyMessage="No org entities found"
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? "Edit Entity" : "Add Entity"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <Select
            label="Type"
            options={typeOptions}
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as OrgEntityForm["type"] })
            }
          />
          <Input
            label="Rooms (comma-separated)"
            value={form.rooms}
            onChange={(e) => setForm({ ...form, rooms: e.target.value })}
            placeholder="e.g. 101, 102, 103"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
