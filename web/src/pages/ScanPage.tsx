import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api-client";
import { useToast } from "../hooks/useToast";
import { Card } from "../components/ui/Card";
import { QRScanner } from "../components/equipment/QRScanner";
import { QuickLog } from "../components/maintenance/QuickLog";
import type { Equipment, OrgEntity } from "../types";

export function ScanPage() {
  const { assetTag: routeTag } = useParams<{ assetTag?: string }>();
  const { showToast } = useToast();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [entityName, setEntityName] = useState("");
  const [loading, setLoading] = useState(false);

  const lookupTag = async (tag: string) => {
    setLoading(true);
    try {
      const eq = await api.get<Equipment>(`/equipment/by-tag/${encodeURIComponent(tag)}`);
      const entities = await api.get<OrgEntity[]>("/org-entities");
      const entity = entities.find((e) => e.id === eq.org_entity_id);
      setEquipment(eq);
      setEntityName(entity ? `${entity.code} — ${entity.name}` : "—");
    } catch {
      showToast("error", `Equipment with tag "${tag}" not found`);
      setEquipment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeTag) {
      lookupTag(routeTag);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeTag]);

  const handleScan = (tag: string) => {
    lookupTag(tag);
  };

  const handleLogged = () => {
    showToast("success", "Maintenance logged successfully");
    setEquipment(null);
    setEntityName("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Scan Equipment QR Code</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-ghana-green border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && !equipment && (
        <Card>
          <QRScanner onScan={handleScan} />
        </Card>
      )}

      {!loading && equipment && (
        <QuickLog
          equipment={equipment}
          entityName={entityName}
          onLogged={handleLogged}
        />
      )}
    </div>
  );
}
