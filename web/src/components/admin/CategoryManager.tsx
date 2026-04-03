import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/api-client";
import { useToast } from "../../hooks/useToast";
import { Table } from "../ui/Table";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import type { MaintenanceCategory } from "../../types";

interface CategoryForm {
  name: string;
  description: string;
}

const emptyForm: CategoryForm = { name: "", description: "" };

export function CategoryManager() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<MaintenanceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<MaintenanceCategory[]>("/categories");
      setCategories(data);
    } catch {
      showToast("error", "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (cat: MaintenanceCategory) => {
    setForm({ name: cat.name, description: cat.description ?? "" });
    setEditingId(cat.id);
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
      description: form.description || null,
    };
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        showToast("success", "Category updated successfully");
      } else {
        await api.post("/categories", payload);
        showToast("success", "Category created successfully");
      }
      closeModal();
      await loadCategories();
    } catch {
      showToast("error", editingId ? "Failed to update category" : "Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  type Row = Record<string, unknown>;

  const columns = [
    { key: "name", header: "Name" },
    {
      key: "description",
      header: "Description",
      render: (row: Row) => {
        const cat = row as unknown as MaintenanceCategory;
        return cat.description || "-";
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: Row) => {
        const cat = row as unknown as MaintenanceCategory;
        return (
          <Button size="sm" variant="secondary" onClick={() => openEdit(cat)}>
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
        <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
        <Button onClick={openCreate}>Add Category</Button>
      </div>

      <Table
        columns={columns}
        data={categories as unknown as Record<string, unknown>[]}
        keyField="id"
        emptyMessage="No categories found"
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingId ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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
