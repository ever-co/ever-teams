import { useCallback, useState } from "react";

export function useQuery<T extends (...params: any[]) => Promise<any>>(
  queryFunction: T
) {
  const [loading, setLoading] = useState(false);

  const queryCall = useCallback((...params: Parameters<T>) => {
    setLoading(true);

    const promise = queryFunction(...params);
    promise.finally(() => {
      setLoading(false);
    });
    return promise;
  }, []) as T;

  return { queryCall, loading };
}
