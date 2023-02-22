import { useState, useEffect } from 'react';

export function useSkeleton() {
	const [showSkeleton, setShowSkeleton] = useState<boolean>(false);

	useEffect(() => {
		setTimeout(() => {
			setShowSkeleton(true);
		}, 2500);
		return setShowSkeleton(false);
	}, []);

	return {
		showSkeleton,
		setShowSkeleton,
	};
}
