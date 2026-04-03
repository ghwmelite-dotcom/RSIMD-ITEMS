import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "../ui/Button";

interface QRScannerProps {
  onScan: (assetTag: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError("");
    scannedRef.current = false;

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;

          // Extract asset tag from URL pattern /scan/ASSET-TAG
          const match = decodedText.match(/\/scan\/([A-Z0-9-]+)$/i);
          const tag = match?.[1] ?? decodedText;

          stopScanner().then(() => onScan(tag));
        },
        () => {
          // QR code not detected in frame — ignore
        }
      );
      setScanning(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions and try again.");
      scannerRef.current = null;
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        id="qr-reader"
        className="mx-auto overflow-hidden rounded-lg"
        style={{ maxWidth: 400 }}
      />

      {error && (
        <p className="text-sm text-ghana-red text-center">{error}</p>
      )}

      <div className="flex justify-center gap-3">
        {!scanning ? (
          <Button onClick={startScanner}>Start Scanner</Button>
        ) : (
          <Button variant="secondary" onClick={stopScanner}>
            Stop Scanner
          </Button>
        )}
      </div>
    </div>
  );
}
