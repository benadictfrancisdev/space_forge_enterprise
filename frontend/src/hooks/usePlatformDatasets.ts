import { useCallback, useEffect, useState } from "react";
import { djangoApi, type Dataset } from "@/platform/djangoAdapter";
import { isApiConfigured } from "@/platform/httpClient";

export function usePlatformDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await djangoApi.listDatasets();
    if (result.error) {
      setError(result.error.message);
      setDatasets([]);
    } else {
      setError(null);
      setDatasets(result.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { datasets, loading, error, refresh };
}
