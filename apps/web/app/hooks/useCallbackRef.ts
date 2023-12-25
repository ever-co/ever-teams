'use client';

import { useRef } from 'react';

export function useCallbackRef<T extends (...data: any[]) => void>(func?: T) {
	const ref = useRef(func);

	ref.current = func;

	return ref;
}
