import { Card } from "../ui/Card";
import { LogForm } from "./LogForm";
import type { Equipment } from "../../types";

interface QuickLogProps {
  equipment: Equipment;
  entityName: string;
  onLogged: () => void;
}

export function QuickLog({ equipment, entityName, onLogged }: QuickLogProps) {
  return (
    <div className="space-y-4">
      <Card padding="sm">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium text-gray-500">Asset Tag:</span>{" "}
            <span className="text-gray-900">{equipment.asset_tag}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Type:</span>{" "}
            <span className="text-gray-900">{equipment.type}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Make / Model:</span>{" "}
            <span className="text-gray-900">
              {[equipment.make, equipment.model].filter(Boolean).join(" ") || "—"}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Location:</span>{" "}
            <span className="text-gray-900">
              {entityName}
              {equipment.room_number ? ` / Room ${equipment.room_number}` : ""}
            </span>
          </div>
        </div>
      </Card>

      <LogForm
        isOpen={true}
        onClose={() => {
          // In QuickLog mode, closing goes back via onLogged
          onLogged();
        }}
        onSaved={onLogged}
        prefill={{
          equipment_id: equipment.id,
          org_entity_id: equipment.org_entity_id,
          room_number: equipment.room_number ?? undefined,
        }}
      />
    </div>
  );
}
