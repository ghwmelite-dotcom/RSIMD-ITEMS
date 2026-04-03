import { useContext } from "react";
import { OfflineContext } from "../context/OfflineContext";

export function useOfflineSync() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOfflineSync must be used within OfflineProvider");
  }
  return context;
}
