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
      <div className="flex items-center gap-3">
        <span className="led led-green" />
        <h1 className="font-mono text-lg font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider">
          QR Scanner
        </h1>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neon-green/30 border-t-neon-green" />
          <span className="font-mono text-[10px] text-surface-500">Looking up equipment...</span>
        </div>
      )}

      {!loading && !equipment && (
        <Card padding="sm">
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
