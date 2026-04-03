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
import type { Technician } from "../../types";

interface TechnicianForm {
  name: string;
  email: string;
  phone: string;
  role: "technician" | "lead" | "admin";
  password: string;
}

const emptyForm: TechnicianForm = {
  name: "",
  email: "",
  phone: "",
  role: "technician",
  password: "",
};

const roleOptions = [
  { value: "technician", label: "Technician" },
  { value: "lead", label: "Lead" },
  { value: "admin", label: "Admin" },
];

const roleBadgeVariant: Record<string, "red" | "gold" | "green"> = {
  admin: "red",
  lead: "gold",
  technician: "green",
};

export function TechnicianManager() {
  const { showToast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TechnicianForm>(emptyForm);

  const loadTechnicians = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Technician[]>("/technicians");
      setTechnicians(data);
    } catch {
      showToast("error", "Failed to load technicians");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (tech: Technician) => {
    setForm({
      name: tech.name,
      email: tech.email ?? "",
      phone: tech.phone ?? "",
      role: tech.role,
      password: "",
    });
    setEditingId(tech.id);
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

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      role: form.role,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (editingId) {
        await api.put(`/technicians/${editingId}`, payload);
        showToast("success", "Technician updated successfully");
      } else {
        if (!form.password) {
          showToast("error", "Password is required for new technicians");
          setSaving(false);
          return;
        }
        await api.post("/technicians", payload);
        showToast("success", "Technician created successfully");
      }
      closeModal();
      await loadTechnicians();
    } catch {
      showToast("error", editingId ? "Failed to update technician" : "Failed to create technician");
    } finally {
      setSaving(false);
    }
  };

  type Row = Record<string, unknown>;

  const columns = [
    { key: "name", header: "Name" },
    {
      key: "email",
      header: "Email",
      render: (row: Row) => {
        const tech = row as unknown as Technician;
        return tech.email || "-";
      },
    },
    {
      key: "role",
      header: "Role",
      render: (row: Row) => {
        const tech = row as unknown as Technician;
        return <Badge variant={roleBadgeVariant[tech.role]}>{tech.role}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Row) => {
        const tech = row as unknown as Technician;
        return (
          <Button size="sm" variant="secondary" onClick={() => openEdit(tech)}>
            Edit
          </Button>
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
        <h3 className="text-lg font-semibold text-gray-900">Technicians</h3>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const exportData = technicians.map((t) => ({
                name: t.name,
                email: t.email ?? "",
                role: t.role,
              }));
              exportToCsv("technicians", [
                { key: "name", header: "Name" },
                { key: "email", header: "Email" },
                { key: "role", header: "Role" },
              ], exportData);
            }}
          >
            Export CSV
          </Button>
          <Button onClick={openCreate}>Add Technician</Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={technicians as unknown as Record<string, unknown>[]}
        keyField="id"
        emptyMessage="No technicians found"
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? "Edit Technician" : "Add Technician"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Select
            label="Role"
            options={roleOptions}
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as TechnicianForm["role"] })
            }
          />
          <Input
            label={editingId ? "New Password (leave blank to keep)" : "Password"}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
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
