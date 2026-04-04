import { useCallback } from "react";
import QRCode from "qrcode";
import type { Equipment } from "../../types";

interface BulkQRPrintProps {
  equipment: Equipment[];
}

export function BulkQRPrint({ equipment }: BulkQRPrintProps) {
  const handlePrint = useCallback(async () => {
    const qrDataUrls: string[] = [];
    for (const eq of equipment) {
      const url = `${window.location.origin}/scan/${eq.asset_tag}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 150, margin: 1 });
      qrDataUrls.push(dataUrl);
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cells = equipment
      .map(
        (eq, i) => `
      <div style="width:33.33%;padding:8px;box-sizing:border-box;text-align:center;page-break-inside:avoid;">
        <img src="${qrDataUrls[i]}" style="width:120px;height:120px;" />
        <div style="font-size:11px;font-weight:bold;margin-top:4px;">${eq.asset_tag}</div>
        <div style="font-size:9px;color:#666;">Room ${eq.room_number ?? "—"}</div>
      </div>
    `,
      )
      .join("");

    printWindow.document.write(
      `<!DOCTYPE html><html><head><title>QR Labels</title>
      <style>@page{size:A4;margin:10mm}body{font-family:Arial,sans-serif;margin:0}.grid{display:flex;flex-wrap:wrap}</style>
      </head><body><h3 style="text-align:center;margin:8px 0">OHCS Equipment QR Labels</h3>
      <div class="grid">${cells}</div>
      <script>window.onload=function(){window.print()}<\/script></body></html>`,
    );
    printWindow.document.close();
  }, [equipment]);

  return (
    <button
      onClick={handlePrint}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      Print QR ({equipment.length})
    </button>
  );
}
