import { useRef, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { Card } from "../ui/Card";
import { StatusPill } from "../ui/StatusPill";
import { Button } from "../ui/Button";
import { EQUIPMENT_TYPES } from "../../lib/constants";
import type { Equipment } from "../../types";

interface EquipmentDetailProps {
  equipment: Equipment;
  entityName: string;
}

const typeMap = new Map<string, string>(EQUIPMENT_TYPES.map((t) => [t.value, t.label]));

export function EquipmentDetail({ equipment, entityName }: EquipmentDetailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrUrl = `${window.location.origin}/scan/${equipment.asset_tag}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qrUrl, { width: 200, margin: 2 });
    }
  }, [qrUrl]);

  const handleDownloadQR = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `QR-${equipment.asset_tag}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, [equipment.asset_tag]);

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Asset Tag", value: equipment.asset_tag },
    { label: "Type", value: typeMap.get(equipment.type) ?? equipment.type },
    { label: "Make", value: equipment.make ?? "—" },
    { label: "Model", value: equipment.model ?? "—" },
    { label: "Processor", value: equipment.processor ?? "—" },
    { label: "Serial Number", value: equipment.serial_number ?? "—" },
    { label: "Location", value: entityName },
    { label: "Room", value: equipment.room_number ?? "—" },
    { label: "Installed Date", value: equipment.installed_date ?? "—" },
    { label: "Status", value: <StatusPill status={equipment.status} /> },
  ];

  return (
    <Card>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-sm font-medium text-gray-500">{f.label}</dt>
                <dd className="mt-1 text-sm text-gray-900">{f.value}</dd>
              </div>
            ))}
          </dl>
          {equipment.notes && (
            <div className="mt-6">
              <dt className="text-sm font-medium text-gray-500">Notes</dt>
              <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{equipment.notes}</dd>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} />
          <Button variant="secondary" size="sm" onClick={handleDownloadQR}>
            Download QR
          </Button>
        </div>
      </div>
    </Card>
  );
}
