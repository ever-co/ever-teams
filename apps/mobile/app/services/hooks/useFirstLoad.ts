import { useCallback, useState } from 'react';

export function useFirstLoad() {
	const [firstLoad, setFirstLoad] = useState(false); // should always have false as default value
	/**
	 * To be called once, at the top level component (e.g main.tsx)
	 */
	const firstLoadData = useCallback(() => {
		setFirstLoad(true);
	}, []);

	return {
		firstLoad,
		firstLoadData,
	};
}
