import type * as React from 'react';

export function mergeRefs<T = any>(refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>): React.RefCallback<T> {
	return (value) => {
		refs.forEach((ref) => {
			if (typeof ref === 'function') {
				ref(value);
			} else if (ref != null) {
				(ref as React.MutableRefObject<T | null>).current = value;
			}
		});
	};
}


export const imgTitle = (name: string) => {
	const str = `${name || ''}`.replace(/[^a-zA-Z ]/g, '');
	return str.split(' ')[1]
		? str.split(' ')[0].charAt(0).toUpperCase() + str.split(' ')[1].charAt(0).toUpperCase()
		: str.substring(0, 2).toUpperCase();
};