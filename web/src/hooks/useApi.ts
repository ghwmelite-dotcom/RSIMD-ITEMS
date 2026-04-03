import { useState, useCallback } from "react";
import { api, ApiError } from "../lib/api-client";

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    isLoading: false,
  });

  const execute = useCallback(async (method: "get" | "post" | "put" | "delete", path: string, body?: unknown) => {
    setState({ data: null, error: null, isLoading: true });
    try {
      let result: T;
      if (method === "get" || method === "delete") {
        result = await api[method]<T>(path);
      } else {
        result = await api[method]<T>(path, body);
      }
      setState({ data: result, error: null, isLoading: false });
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "An error occurred";
      setState({ data: null, error: message, isLoading: false });
      throw err;
    }
  }, []);

  return { ...state, execute };
}
