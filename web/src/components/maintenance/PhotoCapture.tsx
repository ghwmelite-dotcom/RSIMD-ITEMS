import { useState, useRef } from "react";
import { useToast } from "../../hooks/useToast";
import { savePendingPhoto } from "../../lib/offline-store";

interface PhotoCaptureProps {
  photoUrls: string[];
  onPhotosChange: (urls: string[]) => void;
  maxPhotos?: number;
  offlineLogId?: string;
}

export function PhotoCapture({ photoUrls, onPhotosChange, maxPhotos = 3, offlineLogId }: PhotoCaptureProps) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Photo must be under 5MB");
      return;
    }

    if (photoUrls.length >= maxPhotos) {
      showToast("error", `Maximum ${maxPhotos} photos allowed`);
      return;
    }

    if (!navigator.onLine) {
      // Offline: store as base64 in IndexedDB
      const reader = new FileReader();
      reader.onload = async () => {
        const id = crypto.randomUUID();
        await savePendingPhoto({
          id,
          logId: offlineLogId ?? "unassigned",
          data: reader.result as string,
          fileName: file.name,
          mimeType: file.type,
          created_at: new Date().toISOString(),
        });
        onPhotosChange([...photoUrls, `offline::${id}`]);
        showToast("info", "Photo saved offline");
      };
      reader.readAsDataURL(file);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("rsimd_items_token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + "/api" : "/api"}/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json() as { url: string };
      onPhotosChange([...photoUrls, result.url]);
      showToast("success", "Photo uploaded");
    } catch {
      showToast("error", "Failed to upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePhoto(index: number) {
    onPhotosChange(photoUrls.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Photos ({photoUrls.length}/{maxPhotos})
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {photoUrls.map((url, i) => (
          <div key={i} className="relative w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
            {url.startsWith("offline::") ? (
              <span className="text-[9px] text-neon-amber text-center leading-tight">Saved offline</span>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">Photo {i + 1}</span>
            )}
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute -top-1.5 -right-1.5 bg-ghana-red text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
            >
              &#x2715;
            </button>
          </div>
        ))}
      </div>
      {photoUrls.length < maxPhotos && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            {uploading ? "Uploading..." : "Add Photo"}
          </button>
        </div>
      )}
    </div>
  );
}
