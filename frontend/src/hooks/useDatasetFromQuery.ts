import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/** Sync dataset picker with `?dataset=` query param for deep links. */
export function useDatasetFromQuery(fallback = "") {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryId = searchParams.get("dataset") ?? "";
  const [datasetId, setDatasetIdState] = useState(queryId || fallback);

  useEffect(() => {
    if (queryId && queryId !== datasetId) {
      setDatasetIdState(queryId);
    }
  }, [queryId, datasetId]);

  const setDatasetId = (id: string) => {
    setDatasetIdState(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set("dataset", id);
        else next.delete("dataset");
        return next;
      },
      { replace: true }
    );
  };

  return { datasetId, setDatasetId };
}
