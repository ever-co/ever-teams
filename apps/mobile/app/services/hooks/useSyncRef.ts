import { useMemo, useRef } from "react";

export function useSyncRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = useMemo(() => value, [value]);
  return ref;
}
