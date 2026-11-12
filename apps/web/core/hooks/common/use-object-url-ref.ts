'use client';

import { useCallback } from 'react';

/**
 * A ref for the `<img>` that shows `blob`: the object URL is made when the image is attached and released when it is
 * detached or the blob changes, by the same callback (React 19 ref cleanup). Nothing is made during render, so a render
 * React throws away (Strict Mode, an interrupted render) leaves no URL behind.
 */
export function useObjectUrlRef(blob: Blob | null) {
	return useCallback(
		(image: HTMLImageElement | null) => {
			if (!image || !blob) return undefined;
			const url = URL.createObjectURL(blob);
			image.src = url;
			return () => URL.revokeObjectURL(url);
		},
		[blob]
	);
}
