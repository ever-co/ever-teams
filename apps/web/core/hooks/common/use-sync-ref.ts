'use client';

import { useRef } from 'react';

export function useSyncRef<T>(value: T) {
	const ref = useRef(value);
	ref.current = value; // Direct assignment without useMemo to prevent infinite loops
	return ref;
}
