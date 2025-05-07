'use client';

import { useEffect, useState } from 'react';

export const useHasMounted = () => {
	const [mounted, setMounted] = useState<boolean>(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return { mounted };
};
