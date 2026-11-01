import { extendTailwindMerge } from 'tailwind-merge';

/** tailwind-merge that knows the hairline utilities of styles/globals.css, so `hairline-border border-0` keeps the last one. */
export const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			'border-w': ['hairline-border'],
			'border-w-b': ['hairline-b'],
			'border-w-t': ['hairline-t'],
			'border-w-l': ['hairline-l'],
			'border-w-r': ['hairline-r'],
			'border-w-y': ['hairline-y'],
			'divide-y': ['hairline-divide-y'],
			'divide-x': ['hairline-divide-x'],
			'ring-w': ['hairline-ring']
		}
	}
});
